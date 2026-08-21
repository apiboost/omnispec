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
}

interface OperationObjectV3 {
  action: 'send' | 'receive'
  channel?: { $ref?: string } | ChannelObject
  summary?: string
  description?: string
  messages?: Array<{ $ref?: string } | MessageObject>
  tags?: Array<{ name: string; description?: string }>
  bindings?: Record<string, unknown>
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
}

export async function parseAsyncApiSpec(specInput: string | Record<string, unknown>): Promise<ParsedAsyncApiSpec> {
  const raw = typeof specInput === 'string' ? parseSpecString(specInput) : specInput
  const api = await resolveRefs(raw as Record<string, unknown>) as unknown as AsyncApiDocument

  const majorVersion = parseInt(api.asyncapi.split('.')[0], 10)
  const isV3 = majorVersion >= 3

  const servers = extractServers(api)
  const channels = isV3 ? extractChannelsV3(api) : extractChannelsV2(api)
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

function convertOperationV2(action: 'publish' | 'subscribe', op: OperationObjectV2): AsyncApiOperation {
  let message: AsyncApiMessage | undefined

  if (op.message) {
    if ('oneOf' in op.message) {
      message = convertMessage(op.message.oneOf[0])
    } else {
      message = convertMessage(op.message as MessageObject)
    }
  }

  const raw = op as Record<string, unknown>

  return {
    action,
    operationId: op.operationId,
    summary: op.summary,
    description: op.description,
    message,
    tags: op.tags,
    bindings: op.bindings,
    xBadges: raw['x-badges'] as AsyncApiOperation['xBadges'],
    xInternal: raw['x-internal'] as boolean | undefined,
  }
}

function extractChannelsV3(api: AsyncApiDocument): AsyncApiChannel[] {
  if (!api.channels) return []

  const channelMap = new Map<string, AsyncApiChannel>()

  // First, register all channels
  for (const [channelName, ch] of Object.entries(api.channels)) {
    const raw = ch as Record<string, unknown>
    channelMap.set(channelName, {
      name: channelName,
      address: ch.address ?? channelName,
      description: ch.description,
      operations: [],
      parameters: ch.parameters,
      bindings: ch.bindings,
      xInternal: raw['x-internal'] as boolean | undefined,
    })
  }

  // Then attach operations to channels
  if (api.operations) {
    for (const [, op] of Object.entries(api.operations)) {
      const channelRef = op.channel
      let channelName: string | undefined

      if (channelRef && '$ref' in channelRef && typeof channelRef.$ref === 'string') {
        // e.g. "#/channels/userSignedUp" -> "userSignedUp"
        channelName = channelRef.$ref.split('/').pop()
      }

      const messages: AsyncApiMessage[] = []
      if (op.messages) {
        for (const msg of op.messages) {
          if ('$ref' in msg) continue
          messages.push(convertMessage(msg as MessageObject))
        }
      }

      const raw = op as unknown as Record<string, unknown>
      const operation: AsyncApiOperation = {
        action: op.action,
        summary: op.summary,
        description: op.description,
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

function convertMessage(msg: MessageObject): AsyncApiMessage {
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
