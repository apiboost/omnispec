/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { parse as parseYaml } from 'yaml'
import { resolveRefs } from '../../openapi/parser/ref-resolver'
import type {
  ParsedAsyncApiSpec,
  AsyncApiServer,
  AsyncApiChannel,
  AsyncApiOperation,
  AsyncApiMessage,
  AsyncApiComponents,
} from '../types/asyncapi.types'

interface AsyncApiDocument {
  asyncapi: string
  info: { title: string; description?: string; version: string; contact?: Record<string, string>; license?: Record<string, string>; termsOfService?: string }
  servers?: Record<string, ServerObject> | Array<{ name?: string } & ServerObject>
  channels?: Record<string, ChannelObject>
  operations?: Record<string, OperationObjectV3>
  tags?: Array<{ name: string; description?: string }>
  components?: { schemas?: Record<string, unknown>; messages?: Record<string, unknown> }
  externalDocs?: { description?: string; url: string }
}

interface ServerObject {
  url?: string
  host?: string
  pathname?: string
  protocol: string
  protocolVersion?: string
  description?: string
  variables?: Record<string, { default?: string; description?: string; enum?: string[] }>
  security?: Record<string, string[]>[]
}

interface ChannelObject {
  // v2
  description?: string
  publish?: OperationObjectV2
  subscribe?: OperationObjectV2
  parameters?: Record<string, { description?: string; schema?: Record<string, unknown>; location?: string }>
  bindings?: Record<string, unknown>
  // v3
  address?: string
  messages?: Record<string, unknown>
}

interface OperationObjectV2 {
  operationId?: string
  summary?: string
  description?: string
  message?: MessageObject | { oneOf: MessageObject[] }
  tags?: Array<{ name: string; description?: string }>
  bindings?: Record<string, unknown>
  traits?: Array<Partial<OperationObjectV2>>
}

interface OperationObjectV3 {
  action: 'send' | 'receive'
  channel?: { $ref?: string } | ChannelObject
  summary?: string
  description?: string
  messages?: Array<{ $ref?: string } | MessageObject>
  tags?: Array<{ name: string; description?: string }>
  bindings?: Record<string, unknown>
  traits?: Array<Partial<OperationObjectV3>>
}

interface MessageObject {
  name?: string
  title?: string
  summary?: string
  description?: string
  contentType?: string
  payload?: Record<string, unknown>
  headers?: Record<string, unknown>
  correlationId?: { description?: string; location: string }
  tags?: Array<{ name: string; description?: string }>
  examples?: Array<{ name?: string; summary?: string; payload?: unknown; headers?: unknown }>
  bindings?: Record<string, unknown>
  traits?: MessageObject[]
}

type TagList = Array<{ name: string; description?: string }>

/** Union two tag lists by name; the first occurrence wins. */
function unionTags(a?: TagList, b?: TagList): TagList | undefined {
  if (!a && !b) return undefined
  const byName = new Map<string, { name: string; description?: string }>()
  for (const tag of [...(a ?? []), ...(b ?? [])]) {
    if (!byName.has(tag.name)) byName.set(tag.name, tag)
  }
  return Array.from(byName.values())
}

/** Merge two JSON-Schema-shaped objects (used for message headers). Override wins. */
function mergeSchema(
  base?: Record<string, unknown>,
  override?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!base) return override
  if (!override) return base
  const result: Record<string, unknown> = { ...base, ...override }
  const baseProps = base.properties as Record<string, unknown> | undefined
  const overrideProps = override.properties as Record<string, unknown> | undefined
  if (baseProps || overrideProps) {
    result.properties = { ...(baseProps ?? {}), ...(overrideProps ?? {}) }
  }
  const required = Array.from(
    new Set([...((base.required as string[]) ?? []), ...((override.required as string[]) ?? [])]),
  )
  if (required.length > 0) result.required = required
  return result
}

/** Merge one message layer over a base; `override` wins on scalars. */
function mergeMessageLayer(base: MessageObject, override: MessageObject): MessageObject {
  const result: MessageObject = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (key === 'traits' || value === undefined) continue
    if (key === 'tags') {
      result.tags = unionTags(base.tags, value as TagList)
    } else if (key === 'headers') {
      result.headers = mergeSchema(base.headers, value as Record<string, unknown>)
    } else if (key === 'examples') {
      result.examples = [...(base.examples ?? []), ...(value as MessageObject['examples'] ?? [])]
    } else if (key === 'bindings') {
      result.bindings = { ...(base.bindings ?? {}), ...(value as Record<string, unknown>) }
    } else {
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

/**
 * Apply AsyncAPI message traits. Traits are folded in declaration order, then
 * the message's own definition is folded last so it wins (per the AsyncAPI spec).
 * $refs in `traits` are already inlined by resolveRefs.
 */
function applyMessageTraits(msg: MessageObject): MessageObject {
  if (!msg.traits || msg.traits.length === 0) return msg
  let acc: MessageObject = {}
  for (const trait of msg.traits) acc = mergeMessageLayer(acc, trait)
  return mergeMessageLayer(acc, msg)
}

/** Merge one operation layer over a base; `override` wins on scalars. */
function mergeOperationLayer<T extends Record<string, unknown>>(base: T, override: T): T {
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (key === 'traits' || value === undefined) continue
    if (key === 'tags') {
      result.tags = unionTags(base.tags as TagList, value as TagList)
    } else if (key === 'bindings') {
      result.bindings = { ...(base.bindings as Record<string, unknown> ?? {}), ...(value as Record<string, unknown>) }
    } else {
      result[key] = value
    }
  }
  return result as T
}

/**
 * Apply AsyncAPI operation traits. Same fold-then-own-wins semantics as messages.
 * Preserves operation-shape keys (action, channel, message) since the operation
 * itself is folded last.
 */
function applyOperationTraits<T extends { traits?: Array<Partial<T>> }>(op: T): T {
  if (!op.traits || op.traits.length === 0) return op
  let acc = {} as T
  for (const trait of op.traits) acc = mergeOperationLayer(acc, trait as T)
  return mergeOperationLayer(acc, op)
}

export async function parseAsyncApiSpec(specInput: string | Record<string, unknown>): Promise<ParsedAsyncApiSpec> {
  const raw = typeof specInput === 'string' ? parseSpecString(specInput) : specInput
  const api = await resolveRefs(raw as Record<string, unknown>) as unknown as AsyncApiDocument

  const majorVersion = parseInt(api.asyncapi.split('.')[0], 10)
  const isV3 = majorVersion >= 3

  const servers = extractServers(api)
  // `raw` still holds the original `$ref` pointers (resolveRefs returns a fresh
  // tree and never mutates its input). 3.x wires operations to channels via
  // `channel: { $ref: '#/channels/...' }`, and once resolveRefs inlines that
  // ref the pointer is gone — so channel attachment must read the name from the
  // pre-resolution document.
  const rawApi = raw as unknown as AsyncApiDocument
  const channels = isV3 ? extractChannelsV3(api, rawApi) : extractChannelsV2(api)
  const components = extractComponents(api)

  const root = api as unknown as Record<string, unknown>

  const tags = api.tags?.map((tag) => {
    const raw = tag as Record<string, unknown>
    return {
      name: tag.name,
      description: tag.description,
      displayName: raw['x-displayName'] as string | undefined,
      externalDocs: raw.externalDocs as { description?: string; url: string } | undefined,
    }
  })?.filter((tag) => !(tag as Record<string, unknown>)['x-internal'])

  return {
    title: api.info.title,
    description: api.info.description,
    version: api.info.version,
    specVersion: api.asyncapi,
    servers,
    channels: channels.filter((ch) => !ch.xInternal),
    components,
    tags,
    tagGroups: root['x-tagGroups'] as ParsedAsyncApiSpec['tagGroups'],
    externalDocs: api.externalDocs,
    contact: api.info.contact as ParsedAsyncApiSpec['contact'],
    license: api.info.license as ParsedAsyncApiSpec['license'],
    termsOfService: api.info.termsOfService,
    logo: (api.info as Record<string, unknown>)['x-logo'] as ParsedAsyncApiSpec['logo'],
  }
}

function extractServers(api: AsyncApiDocument): AsyncApiServer[] {
  if (!api.servers) return []

  if (Array.isArray(api.servers)) {
    return api.servers.map((s, idx) => ({
      name: s.name ?? `server-${idx}`,
      url: s.host ? `${s.protocol}://${s.host}${s.pathname ?? ''}` : s.url ?? '',
      protocol: s.protocol,
      protocolVersion: s.protocolVersion,
      description: s.description,
      variables: s.variables,
      security: s.security,
    }))
  }

  return Object.entries(api.servers).map(([name, s]) => ({
    name,
    url: s.host ? `${s.protocol}://${s.host}${s.pathname ?? ''}` : s.url ?? '',
    protocol: s.protocol,
    protocolVersion: s.protocolVersion,
    description: s.description,
    variables: s.variables,
    security: s.security,
  }))
}

function extractChannelsV2(api: AsyncApiDocument): AsyncApiChannel[] {
  if (!api.channels) return []

  return Object.entries(api.channels).map(([channelName, ch]) => {
    const operations: AsyncApiOperation[] = []

    if (ch.publish) {
      operations.push(convertOperationV2('publish', ch.publish))
    }
    if (ch.subscribe) {
      operations.push(convertOperationV2('subscribe', ch.subscribe))
    }

    const raw = ch as Record<string, unknown>

    return {
      name: channelName,
      address: channelName,
      description: ch.description,
      operations: operations.filter((op) => !op.xInternal),
      parameters: ch.parameters,
      bindings: ch.bindings,
      xInternal: raw['x-internal'] as boolean | undefined,
    }
  })
}

function convertOperationV2(action: 'publish' | 'subscribe', rawOp: OperationObjectV2): AsyncApiOperation {
  const op = applyOperationTraits(rawOp)
  const messages: AsyncApiMessage[] = []

  if (op.message) {
    if ('oneOf' in op.message) {
      for (const m of op.message.oneOf) {
        messages.push(convertMessage(m))
      }
    } else {
      messages.push(convertMessage(op.message as MessageObject))
    }
  }

  const raw = op as Record<string, unknown>

  return {
    action,
    operationId: op.operationId,
    summary: op.summary,
    description: op.description,
    messages,
    message: messages[0],
    tags: op.tags,
    bindings: op.bindings,
    xBadges: raw['x-badges'] as AsyncApiOperation['xBadges'],
    xInternal: raw['x-internal'] as boolean | undefined,
  }
}

/**
 * Extract the channel name a `channel:` reference points at.
 *
 * In a resolved document the `$ref` is gone, so we prefer the raw (pre-resolution)
 * value which still holds `{ $ref: '#/channels/<name>' }`. Falls back to a
 * still-present `$ref`, then to matching the resolved channel's `address`.
 */
function resolveChannelName(
  rawChannel: OperationObjectV3['channel'] | undefined,
  resolvedChannel: OperationObjectV3['channel'] | undefined,
  addressToName: Map<string, string>,
): string | undefined {
  const refString =
    rawChannel && typeof rawChannel === 'object' && '$ref' in rawChannel && typeof rawChannel.$ref === 'string'
      ? rawChannel.$ref
      : resolvedChannel && typeof resolvedChannel === 'object' && '$ref' in resolvedChannel && typeof resolvedChannel.$ref === 'string'
        ? resolvedChannel.$ref
        : undefined

  if (refString) {
    // e.g. "#/channels/userSignedUp" -> "userSignedUp"
    return refString.split('/').pop()
  }

  // The ref was inlined without a $ref surviving; match on the channel address.
  const address = (resolvedChannel as ChannelObject | undefined)?.address
  if (address && addressToName.has(address)) {
    return addressToName.get(address)
  }

  return undefined
}

function extractChannelsV3(api: AsyncApiDocument, rawApi: AsyncApiDocument): AsyncApiChannel[] {
  if (!api.channels) return []

  const channelMap = new Map<string, AsyncApiChannel>()
  const addressToName = new Map<string, string>()

  // First, register all channels
  for (const [channelName, ch] of Object.entries(api.channels)) {
    const raw = ch as Record<string, unknown>
    const address = ch.address ?? channelName
    addressToName.set(address, channelName)
    channelMap.set(channelName, {
      name: channelName,
      address,
      description: ch.description,
      operations: [],
      parameters: ch.parameters,
      bindings: ch.bindings,
      xInternal: raw['x-internal'] as boolean | undefined,
    })
  }

  // Then attach operations to channels
  if (api.operations) {
    for (const [opKey, resolvedOp] of Object.entries(api.operations)) {
      const op = applyOperationTraits(resolvedOp)
      const rawOp = rawApi.operations?.[opKey]
      const channelName = resolveChannelName(rawOp?.channel, op.channel, addressToName)

      const messages: AsyncApiMessage[] = []
      if (op.messages) {
        for (const msg of op.messages) {
          // After resolveRefs, message $refs are inlined; a bare `{ $ref }` only
          // survives if it was unresolvable — skip those, keep resolved messages.
          if ('$ref' in msg && Object.keys(msg).length === 1) continue
          messages.push(convertMessage(msg as MessageObject))
        }
      }

      const raw = op as unknown as Record<string, unknown>
      const operation: AsyncApiOperation = {
        action: op.action,
        summary: op.summary,
        description: op.description,
        messages,
        message: messages[0],
        tags: op.tags,
        bindings: op.bindings,
        xBadges: raw['x-badges'] as AsyncApiOperation['xBadges'],
        xInternal: raw['x-internal'] as boolean | undefined,
      }

      if (operation.xInternal) continue

      if (channelName && channelMap.has(channelName)) {
        channelMap.get(channelName)!.operations.push(operation)
      }
    }
  }

  return Array.from(channelMap.values())
}

function convertMessage(rawMsg: MessageObject): AsyncApiMessage {
  const msg = applyMessageTraits(rawMsg)
  return {
    name: msg.name,
    title: msg.title,
    summary: msg.summary,
    description: msg.description,
    contentType: msg.contentType,
    payload: msg.payload,
    headers: msg.headers,
    correlationId: msg.correlationId,
    tags: msg.tags,
    examples: msg.examples,
    bindings: msg.bindings,
  }
}

function extractComponents(api: AsyncApiDocument): AsyncApiComponents {
  return {
    schemas: (api.components?.schemas ?? {}) as Record<string, Record<string, unknown>>,
    messages: (api.components?.messages ?? {}) as Record<string, AsyncApiMessage>,
  }
}

function parseSpecString(input: string): Record<string, unknown> {
  const trimmed = input.trim()
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Fall through to YAML
    }
  }
  return parseYaml(trimmed) as Record<string, unknown>
}
