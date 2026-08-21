/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * Lightweight browser-compatible JSON $ref resolver.
 * Resolves internal $ref pointers (e.g. "#/components/schemas/Pet")
 * and external $ref pointers (e.g. "./models/Pet.yaml", "https://...").
 */

import { parse as parseYaml } from 'yaml'
import {
  isOriginAllowed,
  resolveRefUrl,
  fetchExternalRef,
  MAX_EXTERNAL_FILES,
  MAX_EXTERNAL_DEPTH,
} from '../../core/utils/ref-security'
import type { ExternalRefOptions } from '../../core/utils/ref-security'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any
type JsonObject = Record<string, JsonValue>

export interface ResolveRefsOptions {
  specUrl?: string
  externalRefOrigins?: string[]
}

const externalCache = new Map<string, JsonObject>()

export async function resolveRefs(doc: JsonObject, options?: ResolveRefsOptions): Promise<JsonObject> {
  const resolved = new Map<string, JsonValue>()
  const externalCount = { value: 0 }

  let specOrigin: string | undefined
  if (options?.specUrl) {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : undefined
      specOrigin = new URL(options.specUrl, base).origin
    } catch {
      specOrigin = undefined
    }
  }

  const refOptions: ExternalRefOptions | undefined = specOrigin
    ? {
      specOrigin,
      allowedOrigins: options?.externalRefOrigins ?? [],
    }
    : undefined

  return resolveNode(doc, doc, '#', resolved, options?.specUrl ?? '', refOptions, externalCount, 0) as Promise<JsonObject>
}

async function resolveNode(
  node: JsonValue,
  root: JsonObject,
  path: string,
  resolved: Map<string, JsonValue>,
  baseUrl: string,
  refOptions: ExternalRefOptions | undefined,
  externalCount: { value: number },
  externalDepth: number,
): Promise<JsonValue> {
  if (node === null || typeof node !== 'object') {
    return node
  }

  if (Array.isArray(node)) {
    const results = []
    for (let i = 0; i < node.length; i++) {
      results.push(await resolveNode(node[i], root, `${path}/${i}`, resolved, baseUrl, refOptions, externalCount, externalDepth))
    }
    return results
  }

  if ('$ref' in node && typeof node.$ref === 'string') {
    const ref = node.$ref

    // Per OAS 3.1 / JSON Schema 2020-12, keys set alongside a `$ref` (e.g.
    // `description`, `example`, `summary`) override the corresponding keys on
    // the resolved target. Collect them so they can be merged over the result.
    const siblingKeys = Object.keys(node).filter((k) => k !== '$ref')

    if (ref.startsWith('#/')) {
      if (resolved.has(ref)) {
        return mergeSiblings(resolved.get(ref)!, node, siblingKeys, root, baseUrl, refOptions, externalCount, externalDepth, path, resolved)
      }
      resolved.set(ref, { $ref: ref, 'x-circular': true })

      const target = lookupRef(root, ref)
      if (target === undefined) {
        return node
      }

      const result = await resolveNode(target, root, ref, resolved, baseUrl, refOptions, externalCount, externalDepth)
      resolved.set(ref, result)
      return mergeSiblings(result, node, siblingKeys, root, baseUrl, refOptions, externalCount, externalDepth, path, resolved)
    }

    const external = await resolveExternalRef(ref, root, resolved, baseUrl, refOptions, externalCount, externalDepth)
    return mergeSiblings(external, node, siblingKeys, root, baseUrl, refOptions, externalCount, externalDepth, path, resolved)
  }

  const result: JsonObject = {}
  for (const [key, value] of Object.entries(node)) {
    result[key] = await resolveNode(value, root, `${path}/${key}`, resolved, baseUrl, refOptions, externalCount, externalDepth)
  }
  return result
}

/**
 * Merge keys that were set alongside a `$ref` over the resolved target.
 * Sibling keys win. Sibling values are themselves resolved (they may contain
 * nested `$ref`s). Returns the target unchanged when there are no siblings so
 * cached references stay shared; otherwise returns a shallow copy so the cached
 * target is never mutated.
 */
async function mergeSiblings(
  target: JsonValue,
  node: JsonObject,
  siblingKeys: string[],
  root: JsonObject,
  baseUrl: string,
  refOptions: ExternalRefOptions | undefined,
  externalCount: { value: number },
  externalDepth: number,
  path: string,
  resolved: Map<string, JsonValue>,
): Promise<JsonValue> {
  if (siblingKeys.length === 0) {
    return target
  }

  // If the target is not a plain object we can't merge into it; return the
  // resolved siblings as an object so their values aren't lost.
  const base: JsonObject =
    target !== null && typeof target === 'object' && !Array.isArray(target)
      ? { ...(target as JsonObject) }
      : {}
  if (!(target !== null && typeof target === 'object' && !Array.isArray(target))) {
    // Preserve the non-object target under a conventional key so nothing is
    // silently discarded (rare — a $ref to a scalar with siblings).
    base['x-ref-target'] = target
  }

  for (const key of siblingKeys) {
    base[key] = await resolveNode(node[key], root, `${path}/${key}`, resolved, baseUrl, refOptions, externalCount, externalDepth)
  }

  return base
}

async function resolveExternalRef(
  ref: string,
  _root: JsonObject,
  resolved: Map<string, JsonValue>,
  baseUrl: string,
  refOptions: ExternalRefOptions | undefined,
  externalCount: { value: number },
  externalDepth: number,
): Promise<JsonValue> {
  if (externalDepth >= MAX_EXTERNAL_DEPTH) {
    return { 'x-external-ref': ref, 'x-error': 'Max external ref depth exceeded' }
  }
  if (externalCount.value >= MAX_EXTERNAL_FILES) {
    return { 'x-external-ref': ref, 'x-error': 'Max external file count exceeded' }
  }

  const [filePart, fragment] = ref.split('#')
  const fullUrl = resolveRefUrl(filePart, baseUrl)

  if (refOptions && !isOriginAllowed(fullUrl, refOptions)) {
    return {
      'x-external-ref': ref,
      'x-blocked': true,
      'x-error': 'External origin not in allowlist. Add origin to externalRefOrigins to resolve.',
    }
  }

  const cacheKey = fullUrl
  let externalDoc: JsonObject

  if (externalCache.has(cacheKey)) {
    externalDoc = externalCache.get(cacheKey)!
  } else {
    try {
      externalCount.value++
      const content = await fetchExternalRef(fullUrl)
      externalDoc = parseContent(content)
      externalCache.set(cacheKey, externalDoc)
    } catch (err) {
      return {
        'x-external-ref': ref,
        'x-error': err instanceof Error ? err.message : 'Failed to fetch external ref',
      }
    }
  }

  let target: JsonValue = externalDoc
  if (fragment) {
    target = lookupRef(externalDoc, `#${fragment}`)
    if (target === undefined) {
      return { 'x-external-ref': ref, 'x-error': `Fragment ${fragment} not found in ${fullUrl}` }
    }
  }

  return resolveNode(target, externalDoc, `ext:${fullUrl}#${fragment ?? ''}`, resolved, fullUrl, refOptions, externalCount, externalDepth + 1)
}

function parseContent(content: string): JsonObject {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }
  return parseYaml(trimmed) as JsonObject
}

function lookupRef(root: JsonObject, ref: string): JsonValue | undefined {
  const path = ref.replace(/^#\//, '').split('/')
  let current: JsonValue = root

  for (const segment of path) {
    const decoded = decodeURIComponent(segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }
    current = (current as JsonObject)[decoded]
    if (current === undefined) {
      return undefined
    }
  }

  return current
}
