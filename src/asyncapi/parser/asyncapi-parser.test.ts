/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseAsyncApiSpec } from './asyncapi-parser'

const streetlightsYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/streetlights-asyncapi.yaml'),
  'utf-8',
)

describe('parseAsyncApiSpec', () => {
  it('parses a valid AsyncAPI 2.6 spec', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(result.title).toBe('Streetlights Kafka API')
    expect(result.version).toBe('1.0.0')
    expect(result.specVersion).toBe('2.6.0')
  })

  it('extracts servers', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(result.servers).toHaveLength(2)
    expect(result.servers[0].name).toBe('production')
    expect(result.servers[0].protocol).toBe('kafka-secure')
    expect(result.servers[0].url).toBe('test.mykafkacluster.org:8092')
    expect(result.servers[1].name).toBe('staging')
  })

  it('extracts channels with operations', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(result.channels).toHaveLength(3)

    const measureChannel = result.channels[0]
    expect(measureChannel.name).toContain('lighting/measured')
    expect(measureChannel.operations).toHaveLength(1)
    expect(measureChannel.operations[0].action).toBe('subscribe')
    expect(measureChannel.operations[0].operationId).toBe('receiveLightMeasurement')
  })

  it('resolves message $refs', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    const measureOp = result.channels[0].operations[0]
    expect(measureOp.message).toBeDefined()
    expect(measureOp.message!.name).toBe('lightMeasured')
    expect(measureOp.message!.title).toBe('Light measured')
    expect(measureOp.message!.payload).toBeDefined()
  })

  it('resolves payload schema $refs', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    const payload = result.channels[0].operations[0].message?.payload
    expect(payload).toBeDefined()
    expect((payload as Record<string, unknown>).type).toBe('object')
    expect((payload as Record<string, Record<string, unknown>>).properties.lumens).toBeDefined()
  })

  it('extracts channel parameters', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    const params = result.channels[0].parameters
    expect(params).toBeDefined()
    expect(params!.streetlightId).toBeDefined()
    expect(params!.streetlightId.description).toBe('The ID of the streetlight.')
  })

  it('extracts component schemas', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(Object.keys(result.components.schemas)).toContain('lightMeasuredPayload')
    expect(Object.keys(result.components.schemas)).toContain('turnOnOffPayload')
    expect(Object.keys(result.components.schemas)).toContain('dimLightPayload')
  })

  it('extracts component messages', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(Object.keys(result.components.messages)).toContain('lightMeasured')
    expect(Object.keys(result.components.messages)).toContain('turnOnOff')
  })

  it('handles JSON string input', async () => {
    const jsonSpec = JSON.stringify({
      asyncapi: '2.6.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: {},
    })
    const result = await parseAsyncApiSpec(jsonSpec)
    expect(result.title).toBe('Test')
  })

  describe('AsyncAPI 3.x operation → channel resolution', () => {
    const v3Spec = {
      asyncapi: '3.0.0',
      info: { title: 'V3 API', version: '1.0.0' },
      channels: {
        userSignedUp: {
          address: 'user/signedup',
          messages: {
            userSignedUp: { $ref: '#/components/messages/UserSignedUp' },
          },
        },
      },
      operations: {
        onUserSignedUp: {
          action: 'receive',
          channel: { $ref: '#/channels/userSignedUp' },
          summary: 'Notified when a user signs up',
          messages: [{ $ref: '#/channels/userSignedUp/messages/userSignedUp' }],
        },
      },
      components: {
        messages: {
          UserSignedUp: {
            name: 'UserSignedUp',
            payload: { type: 'object', properties: { id: { type: 'string' } } },
          },
        },
      },
    }

    it('attaches a 3.x operation to the channel it references via $ref', async () => {
      const result = await parseAsyncApiSpec(JSON.stringify(v3Spec))

      expect(result.channels).toHaveLength(1)
      const channel = result.channels[0]
      expect(channel.address).toBe('user/signedup')
      // The operation references the channel via `channel: { $ref: ... }`.
      // It must be attached even though resolveRefs() inlines the $ref.
      expect(channel.operations).toHaveLength(1)
      expect(channel.operations[0].action).toBe('receive')
      expect(channel.operations[0].summary).toBe('Notified when a user signs up')
    })
  })

  describe('multiple messages', () => {
    it('keeps every message from a 2.x oneOf list', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'OneOf', version: '1.0.0' },
        channels: {
          orders: {
            subscribe: {
              operationId: 'onOrders',
              message: {
                oneOf: [
                  { name: 'OrderCreated', payload: { type: 'object' } },
                  { name: 'OrderCancelled', payload: { type: 'object' } },
                ],
              },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const op = result.channels[0].operations[0]
      expect(op.messages).toHaveLength(2)
      expect(op.messages.map((m) => m.name)).toEqual(['OrderCreated', 'OrderCancelled'])
      // `message` remains an alias for the first entry.
      expect(op.message?.name).toBe('OrderCreated')
    })

    it('keeps every message from a 3.x messages array', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: { title: 'V3 multi', version: '1.0.0' },
        channels: { c: { address: 'c', messages: {} } },
        operations: {
          op: {
            action: 'send',
            channel: { $ref: '#/channels/c' },
            messages: [
              { name: 'A', payload: { type: 'object' } },
              { name: 'B', payload: { type: 'object' } },
            ],
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const op = result.channels[0].operations[0]
      expect(op.messages.map((m) => m.name)).toEqual(['A', 'B'])
    })
  })

  describe('trait merging', () => {
    it('merges message traits into the message, with the message winning', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'Traits', version: '1.0.0' },
        channels: {
          c: {
            subscribe: {
              operationId: 'onC',
              message: {
                summary: 'Own summary',
                payload: { type: 'object' },
                traits: [
                  {
                    contentType: 'application/json',
                    summary: 'Trait summary',
                    headers: { type: 'object', properties: { 'X-Trace': { type: 'string' } } },
                  },
                ],
              },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const msg = result.channels[0].operations[0].message!
      // Trait contributes contentType and a header...
      expect(msg.contentType).toBe('application/json')
      expect((msg.headers as { properties: Record<string, unknown> }).properties['X-Trace']).toBeDefined()
      // ...but the message's own summary wins over the trait's.
      expect(msg.summary).toBe('Own summary')
    })

    it('merges operation traits and unions tags', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'OpTraits', version: '1.0.0' },
        channels: {
          c: {
            subscribe: {
              operationId: 'onC',
              tags: [{ name: 'own' }],
              traits: [
                { summary: 'Trait-provided summary', tags: [{ name: 'trait-tag' }] },
              ],
              message: { payload: { type: 'object' } },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const op = result.channels[0].operations[0]
      expect(op.summary).toBe('Trait-provided summary')
      expect((op.tags ?? []).map((t) => t.name).sort()).toEqual(['own', 'trait-tag'])
    })
  })

  describe('security', () => {
    it('extracts component security schemes', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'Sec', version: '1.0.0' },
        channels: {},
        components: {
          securitySchemes: {
            apiKey: { type: 'httpApiKey', name: 'X-Api-Key', in: 'header' },
            oauth: {
              type: 'oauth2',
              flows: {
                clientCredentials: {
                  tokenUrl: 'https://example.com/token',
                  availableScopes: { 'orders:read': 'Read orders' },
                },
              },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      expect(Object.keys(result.components.securitySchemes)).toEqual(['apiKey', 'oauth'])
      expect(result.components.securitySchemes.apiKey.type).toBe('httpApiKey')
      expect(result.components.securitySchemes.oauth.flows?.clientCredentials.availableScopes)
        .toEqual({ 'orders:read': 'Read orders' })
    })

    it('derives server security scheme names from a 2.x requirement map', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'Sec2', version: '1.0.0' },
        servers: {
          prod: { url: 'mqtt://x', protocol: 'mqtt', security: [{ apiKey: [] }] },
        },
        channels: {},
        components: { securitySchemes: { apiKey: { type: 'httpApiKey', name: 'k', in: 'user' } } },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      expect(result.servers[0].securityNames).toEqual(['apiKey'])
    })

    it('parses a 3.x operation reply (request-reply)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: { title: 'Reply', version: '1.0.0' },
        channels: { c: { address: 'c', messages: {} } },
        operations: {
          ask: {
            action: 'send',
            channel: { $ref: '#/channels/c' },
            reply: {
              messages: [{ name: 'Pong', payload: { type: 'object' } }],
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const op = result.channels[0].operations[0]
      expect(op.reply?.messages).toHaveLength(1)
      expect(op.reply?.messages[0].name).toBe('Pong')
    })

    it('derives 3.x operation security scheme names from $ref', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: { title: 'Sec3', version: '1.0.0' },
        channels: { c: { address: 'c', messages: {} } },
        operations: {
          op: {
            action: 'send',
            channel: { $ref: '#/channels/c' },
            security: [{ $ref: '#/components/securitySchemes/oauth' }],
          },
        },
        components: {
          securitySchemes: { oauth: { type: 'oauth2', flows: {} } },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      expect(result.channels[0].operations[0].securityNames).toEqual(['oauth'])
    })
  })
})
