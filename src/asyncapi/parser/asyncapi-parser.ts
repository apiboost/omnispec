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
import { resolveRefs, decodeJsonPointerSegment } from '../../openapi/parser/ref-resolver'
import type {
  ParsedAsyncApiSpec,
  AsyncApiServer,
  AsyncApiChannel,
  AsyncApiOperation,
  AsyncApiMessage,
  AsyncApiComponents,
  AsyncApiSecurityRequirement,
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
  defaultContentType?: string
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
  bindings?: Record<string, unknown>
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
  externalDocs?: { description?: string; url: string }
  tags?: Array<{ name: string; description?: string }>
}

interface OperationObjectV2 {
  operationId?: string
  summary?: string
  description?: string
  message?: MessageObject | { oneOf: MessageObject[] }
  tags?: Array<{ name: string; description?: string }>
  bindings?: Record<string, unknown>
  security?: Array<Record<string, string[]>>
  externalDocs?: { description?: string; url: string }
  traits?: Array<Partial<OperationObjectV2>>
}

interface OperationObjectV3 {
  action: 'send' | 'receive'
  channel?: { $ref?: string } | ChannelObject
  title?: string
  summary?: string
  description?: string
  messages?: Array<{ $ref?: string } | MessageObject>
  tags?: Array<{ name: string; description?: string }>
  bindings?: Record<string, unknown>
  security?: unknown[]
  externalDocs?: { description?: string; url: string }
  reply?: {
    channel?: unknown
    messages?: Array<{ $ref?: string } | MessageObject>
    address?: { location?: string; description?: string }
  }
  traits?: Array<Partial<OperationObjectV3>>
}

interface MessageObject {
  name?: string
  title?: string
  summary?: string
  description?: string
  contentType?: string
  schemaFormat?: string
  payload?: Record<string, unknown>
  headers?: Record<string, unknown>
  correlationId?: { description?: string; location: string }
  tags?: Array<{ name: string; description?: string }>
  examples?: Array<{ name?: string; summary?: string; payload?: unknown; headers?: unknown }>
  bindings?: Record<string, unknown>
  externalDocs?: { description?: string; url: string }
  traits?: MessageObject[]
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

/**
 * Merge one message layer over a base; `override` wins on scalars, tags and
 * externalDocs (RFC 7386: a present array/scalar replaces). Composite fields
 * (headers, examples, bindings) keep their QA-approved merge behavior.
 */
function mergeMessageLayer(base: MessageObject, override: MessageObject): MessageObject {
  const result: MessageObject = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (key === 'traits' || value === undefined) continue
    if (key === 'headers') {
      result.headers = mergeSchema(base.headers, value as Record<string, unknown>)
    } else if (key === 'examples') {
      result.examples = [...(base.examples ?? []), ...(value as MessageObject['examples'] ?? [])]
    } else if (key === 'bindings') {
      result.bindings = { ...(base.bindings ?? {}), ...(value as Record<string, unknown>) }
    } else {
      // Scalars, `tags` and `externalDocs` all follow the override-wins rule.
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

/**
 * Apply AsyncAPI message traits. `$ref`s in `traits` are already inlined by
 * resolveRefs. Version-aware per the AsyncAPI spec:
 * - 2.x: the TRAIT wins — base is the object, then each trait is applied on top
 *   in declaration order (`acc = merge(acc, trait)`), so traits override the
 *   object's scalars and a later trait overrides an earlier one.
 * - 3.x: the OBJECT wins — fold traits in declaration order, then the object
 *   last.
 */
function applyMessageTraits(msg: MessageObject, isV3: boolean): MessageObject {
  if (!msg.traits || msg.traits.length === 0) return msg
  if (isV3) {
    let acc: MessageObject = {}
    for (const trait of msg.traits) acc = mergeMessageLayer(acc, trait)
    return mergeMessageLayer(acc, msg)
  }
  let acc: MessageObject = msg
  for (const trait of msg.traits) acc = mergeMessageLayer(acc, trait)
  return acc
}

/**
 * Merge one operation layer over a base; `override` wins on scalars, tags and
 * externalDocs. `bindings` object-merge is preserved.
 */
function mergeOperationLayer<T extends Record<string, unknown>>(base: T, override: T): T {
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (key === 'traits' || value === undefined) continue
    if (key === 'bindings') {
      result.bindings = { ...(base.bindings as Record<string, unknown> ?? {}), ...(value as Record<string, unknown>) }
    } else {
      // Scalars, `tags` and `externalDocs` all follow the override-wins rule.
      result[key] = value
    }
  }
  return result as T
}

/**
 * Apply AsyncAPI operation traits. Version-aware (see applyMessageTraits):
 * - 2.x: the trait wins (base = object, apply traits on top).
 * - 3.x: the object wins (fold traits, then the object last).
 * Preserves operation-shape keys (action, channel, message).
 */
function applyOperationTraits<T extends { traits?: Array<Partial<T>> }>(op: T, isV3: boolean): T {
  if (!op.traits || op.traits.length === 0) return op
  if (isV3) {
    let acc = {} as T
    for (const trait of op.traits) acc = mergeOperationLayer(acc, trait as T)
    return mergeOperationLayer(acc, op)
  }
  let acc = op
  for (const trait of op.traits) acc = mergeOperationLayer(acc, trait as T)
  return acc
}

export async function parseAsyncApiSpec(specInput: string | Record<string, unknown>): Promise<ParsedAsyncApiSpec> {
  const raw = typeof specInput === 'string' ? parseSpecString(specInput) : specInput
  const api = await resolveRefs(raw as Record<string, unknown>) as unknown as AsyncApiDocument

  const majorVersion = parseInt(api.asyncapi.split('.')[0], 10)
  const isV3 = majorVersion >= 3

  const servers = extractServers(api, raw as unknown as AsyncApiDocument)
  // `raw` still holds the original `$ref` pointers (resolveRefs returns a fresh
  // tree and never mutates its input). 3.x wires operations to channels via
  // `channel: { $ref: '#/channels/...' }`, and once resolveRefs inlines that
  // ref the pointer is gone — so channel attachment must read the name from the
  // pre-resolution document.
  const rawApi = raw as unknown as AsyncApiDocument
  const defaultContentType = api.defaultContentType
  const channels = isV3
    ? extractChannelsV3(api, rawApi, defaultContentType)
    : extractChannelsV2(api, defaultContentType)
  const components = extractComponents(api, isV3, defaultContentType)

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
    defaultContentType,
  }
}

function extractServers(api: AsyncApiDocument, rawApi: AsyncApiDocument): AsyncApiServer[] {
  if (!api.servers) return []

  const isV3 = parseInt(api.asyncapi.split('.')[0], 10) >= 3

  const toServer = (s: ServerObject, name: string, rawSecurity?: unknown[]): AsyncApiServer => ({
    name,
    url: s.host ? `${s.protocol}://${s.host}${s.pathname ?? ''}` : s.url ?? '',
    protocol: s.protocol,
    protocolVersion: s.protocolVersion,
    description: s.description,
    variables: s.variables,
    security: s.security,
    securityNames: deriveSecurityNames(rawSecurity, s.security),
    securityRequirements: deriveSecurityRequirements(rawSecurity, s.security, isV3),
    bindings: s.bindings,
  })

  if (Array.isArray(api.servers)) {
    const rawServers = Array.isArray(rawApi.servers) ? rawApi.servers : []
    return api.servers.map((s, idx) => toServer(s, s.name ?? `server-${idx}`, rawServers[idx]?.security))
  }

  const rawServers = (!Array.isArray(rawApi.servers) && rawApi.servers) || {}
  return Object.entries(api.servers).map(([name, s]) => toServer(s, name, rawServers[name]?.security))
}

function extractChannelsV2(api: AsyncApiDocument, defaultContentType?: string): AsyncApiChannel[] {
  if (!api.channels) return []

  return Object.entries(api.channels).map(([channelName, ch]) => {
    const operations: AsyncApiOperation[] = []

    if (ch.publish) {
      operations.push(convertOperationV2('publish', ch.publish, defaultContentType))
    }
    if (ch.subscribe) {
      operations.push(convertOperationV2('subscribe', ch.subscribe, defaultContentType))
    }

    const raw = ch as Record<string, unknown>

    return {
      name: channelName,
      address: channelName,
      description: ch.description,
      operations: operations.filter((op) => !op.xInternal),
      parameters: ch.parameters,
      bindings: ch.bindings,
      // 2.x channels have no externalDocs or channel-level tags.
      xInternal: raw['x-internal'] as boolean | undefined,
    }
  })
}

function convertOperationV2(
  action: 'publish' | 'subscribe',
  rawOp: OperationObjectV2,
  defaultContentType?: string,
): AsyncApiOperation {
  const op = applyOperationTraits(rawOp, false)
  const messages: AsyncApiMessage[] = []

  if (op.message) {
    if ('oneOf' in op.message) {
      for (const m of op.message.oneOf) {
        messages.push(convertMessage(m, false, defaultContentType))
      }
    } else {
      messages.push(convertMessage(op.message as MessageObject, false, defaultContentType))
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
    externalDocs: op.externalDocs,
    securityNames: deriveSecurityNames(undefined, op.security),
    securityRequirements: deriveSecurityRequirements(undefined, op.security, false),
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
    // e.g. "#/channels/userSignedUp" -> "userSignedUp". Decode JSON-pointer
    // escapes (`~1`→`/`, `~0`→`~`, percent-encoding) so the name matches the
    // channel key exactly as lookupRef resolved it.
    const last = refString.split('/').pop()
    return last !== undefined ? decodeJsonPointerSegment(last) : undefined
  }

  // The ref was inlined without a $ref surviving; match on the channel address.
  const address = (resolvedChannel as ChannelObject | undefined)?.address
  if (address && addressToName.has(address)) {
    return addressToName.get(address)
  }

  return undefined
}

function extractChannelsV3(
  api: AsyncApiDocument,
  rawApi: AsyncApiDocument,
  defaultContentType?: string,
): AsyncApiChannel[] {
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
      externalDocs: ch.externalDocs,
      tags: ch.tags,
      xInternal: raw['x-internal'] as boolean | undefined,
    })
  }

  // Then attach operations to channels
  const orphanOperations: AsyncApiOperation[] = []
  if (api.operations) {
    for (const [opKey, resolvedOp] of Object.entries(api.operations)) {
      const op = applyOperationTraits(resolvedOp, true)
      const rawOp = rawApi.operations?.[opKey]
      const channelName = resolveChannelName(rawOp?.channel, op.channel, addressToName)

      const collectMessages = (list?: Array<{ $ref?: string } | MessageObject>): AsyncApiMessage[] => {
        const out: AsyncApiMessage[] = []
        for (const msg of list ?? []) {
          // After resolveRefs a successfully-resolved message has no `$ref` (its
          // siblings are merged over the target). A surviving `$ref` means the
          // ref was unresolvable, or circular (`{ $ref, x-circular }`) — skip it
          // rather than emit an empty message, regardless of sibling keys.
          if (msg && typeof msg === 'object' && '$ref' in msg) continue
          out.push(convertMessage(msg as MessageObject, true, defaultContentType))
        }
        return out
      }

      let messages = collectMessages(op.messages)
      // Per the AsyncAPI 3.0 spec, an operation that declares no `messages`
      // applies to ALL of its channel's messages (not none).
      if (messages.length === 0 && channelName && api.channels?.[channelName]?.messages) {
        messages = collectMessages(
          Object.values(api.channels[channelName].messages as Record<string, unknown>) as Array<
            { $ref?: string } | MessageObject
          >,
        )
      }
      const replyMessages = collectMessages(op.reply?.messages)
      // The reply `channel` $ref tail (prefer the pre-resolution raw pointer).
      const rawReplyChannel = (rawOp?.reply as { channel?: unknown } | undefined)?.channel as
        | OperationObjectV3['channel']
        | undefined
      const replyChannelName = resolveChannelName(
        rawReplyChannel,
        op.reply?.channel as OperationObjectV3['channel'] | undefined,
        addressToName,
      )

      const raw = op as unknown as Record<string, unknown>
      const reply =
        replyMessages.length > 0 || op.reply?.address || replyChannelName
          ? {
            messages: replyMessages,
            address: op.reply?.address,
            channelName: replyChannelName,
          }
          : undefined

      const operation: AsyncApiOperation = {
        action: op.action,
        // 3.x has no operationId field; the operations-map key is the id.
        operationId: opKey,
        title: op.title,
        summary: op.summary,
        description: op.description,
        messages,
        message: messages[0],
        tags: op.tags,
        bindings: op.bindings,
        externalDocs: op.externalDocs,
        securityNames: deriveSecurityNames(rawOp?.security, op.security),
        securityRequirements: deriveSecurityRequirements(rawOp?.security, op.security, true),
        reply,
        xBadges: raw['x-badges'] as AsyncApiOperation['xBadges'],
        xInternal: raw['x-internal'] as boolean | undefined,
      }

      if (operation.xInternal) continue

      if (channelName && channelMap.has(channelName)) {
        channelMap.get(channelName)!.operations.push(operation)
      } else {
        // The operation references a channel that isn't defined in this
        // document (an invalid spec). Surface it under a synthetic group
        // rather than silently dropping it.
        orphanOperations.push(operation)
      }
    }
  }

  const channels = Array.from(channelMap.values())
  if (orphanOperations.length > 0) {
    channels.push({
      name: '__unassigned__',
      address: 'Unassigned operations',
      description: 'These operations reference a channel that is not defined in this document.',
      operations: orphanOperations,
    })
  }
  return channels
}

function convertMessage(
  rawMsg: MessageObject,
  isV3: boolean,
  defaultContentType?: string,
): AsyncApiMessage {
  const msg = applyMessageTraits(rawMsg, isV3)
  const hasOwnContentType = typeof msg.contentType === 'string' && msg.contentType.length > 0
  const contentType = hasOwnContentType
    ? msg.contentType
    : defaultContentType ?? 'application/json'
  return {
    name: msg.name,
    title: msg.title,
    summary: msg.summary,
    description: msg.description,
    contentType,
    contentTypeInherited: hasOwnContentType ? undefined : true,
    schemaFormat: msg.schemaFormat,
    payload: msg.payload,
    headers: msg.headers,
    correlationId: msg.correlationId,
    tags: msg.tags,
    examples: msg.examples,
    bindings: msg.bindings,
    externalDocs: msg.externalDocs,
  }
}

function extractComponents(
  api: AsyncApiDocument,
  isV3: boolean,
  defaultContentType?: string,
): AsyncApiComponents {
  const components = api.components as Record<string, unknown> | undefined

  // Run component messages through convertMessage() — the same path channel
  // messages take — so trait-merging, schemaFormat, examples, etc. apply in the
  // browsable Messages section too, not only inside ChannelDetail.
  const rawMessages = (api.components?.messages ?? {}) as Record<string, MessageObject>
  const messages: Record<string, AsyncApiMessage> = {}
  for (const [name, msg] of Object.entries(rawMessages)) {
    messages[name] = convertMessage(msg, isV3, defaultContentType)
  }

  return {
    schemas: (api.components?.schemas ?? {}) as Record<string, Record<string, unknown>>,
    messages,
    securitySchemes: (components?.securitySchemes ?? {}) as AsyncApiComponents['securitySchemes'],
  }
}

/**
 * Derive the security-scheme names for a `security` requirement list, covering:
 * - 2.x requirement maps `{ schemeName: scopes }` → the map keys;
 * - 3.x `$ref` entries (resolveRefs inlines them, so read the ref from `raw`);
 * - 3.x inline scheme objects → the scheme `type` as a fallback label.
 */
function deriveSecurityNames(raw?: unknown[], resolved?: unknown[]): string[] | undefined {
  const rawArr = raw ?? []
  const resArr = resolved ?? []
  const count = Math.max(rawArr.length, resArr.length)
  if (count === 0) return undefined

  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const rawEntry = rawArr[i] as Record<string, unknown> | undefined
    const resEntry = resArr[i] as Record<string, unknown> | undefined
    if (rawEntry && typeof rawEntry === 'object' && typeof rawEntry.$ref === 'string') {
      names.push(decodeJsonPointerSegment(rawEntry.$ref.split('/').pop() as string))
    } else if (resEntry && typeof resEntry === 'object') {
      if (typeof resEntry.type === 'string') {
        names.push(resEntry.type)
      } else {
        names.push(...Object.keys(resEntry))
      }
    }
  }
  return names.length > 0 ? names : undefined
}

/**
 * Derive full security requirements (name + per-requirement scopes), preserving
 * the OR/AND structure. The outer array is the OR list (one entry per `security`
 * array element); each inner array is the AND set within that alternative.
 *
 * - 2.x: each `security` entry is a map `{ schemeName: [scopes...] }`. A map with
 *   several keys is an AND, so one inner array holds one requirement per key.
 * - 3.x: each `security` entry is a Security Scheme Object (usually a `$ref`, so
 *   read the name from the pre-resolution `$ref` tail). The required scopes live
 *   on the entry's `scopes` array (3.0). → a singleton inner array.
 */
function deriveSecurityRequirements(
  raw: unknown[] | undefined,
  resolved: unknown[] | undefined,
  isV3: boolean,
): AsyncApiSecurityRequirement[][] | undefined {
  const rawArr = raw ?? []
  const resArr = resolved ?? []
  const count = Math.max(rawArr.length, resArr.length)
  if (count === 0) return undefined

  const out: AsyncApiSecurityRequirement[][] = []
  for (let i = 0; i < count; i++) {
    const rawEntry = rawArr[i] as Record<string, unknown> | undefined
    const resEntry = resArr[i] as Record<string, unknown> | undefined

    if (isV3) {
      // 3.x: a Security Scheme Object entry → one requirement.
      let name: string | undefined
      if (rawEntry && typeof rawEntry === 'object' && typeof rawEntry.$ref === 'string') {
        name = decodeJsonPointerSegment(rawEntry.$ref.split('/').pop() as string)
      } else if (resEntry && typeof resEntry.type === 'string') {
        name = resEntry.type
      }
      if (name === undefined) continue
      // Scopes may be a sibling of the `$ref` (raw) or survive onto the resolved
      // entry after the ref is inlined.
      const rawScopes = rawEntry?.scopes
      const resScopes = resEntry?.scopes
      const scopesSource = Array.isArray(rawScopes)
        ? rawScopes
        : Array.isArray(resScopes)
          ? resScopes
          : []
      const scopes = (scopesSource as unknown[]).map(String)
      out.push([{ name, scopes }])
    } else {
      // 2.x: a requirement map `{ schemeName: [scopes...] }` → AND of its keys.
      const map = (rawEntry ?? resEntry) as Record<string, unknown> | undefined
      if (!map || typeof map !== 'object') continue
      const inner: AsyncApiSecurityRequirement[] = Object.entries(map).map(([name, scopes]) => ({
        name,
        scopes: Array.isArray(scopes) ? (scopes as unknown[]).map(String) : [],
      }))
      if (inner.length > 0) out.push(inner)
    }
  }
  return out.length > 0 ? out : undefined
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
