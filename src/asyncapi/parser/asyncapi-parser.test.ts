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

const traits2xYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/asyncapi-2x-traits.yaml'),
  'utf-8',
)

const traits3xYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/asyncapi-3x-traits.yaml'),
  'utf-8',
)

const securityScopes2xYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/asyncapi-2x-security-scopes.yaml'),
  'utf-8',
)

const securityReply3xYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/asyncapi-3x-security-reply.yaml'),
  'utf-8',
)

const messageTraits3xYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/asyncapi-3x-message-traits.yaml'),
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
    it('merges 2.x message traits with the trait winning on scalars', async () => {
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
      // ...and in 2.x the trait's summary OVERRIDES the object's.
      expect(msg.summary).toBe('Trait summary')
    })

    it('merges 2.x operation traits where the trait wins and tags are replaced', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'OpTraits', version: '1.0.0' },
        channels: {
          c: {
            subscribe: {
              operationId: 'onC',
              summary: 'Object summary',
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
      // 2.x: the trait wins over the object's scalars.
      expect(op.summary).toBe('Trait-provided summary')
      // tags REPLACE (RFC 7386 array semantics): the trait's tags win, not a union.
      expect((op.tags ?? []).map((t) => t.name)).toEqual(['trait-tag'])
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

    it('derives 2.x operation-level security scheme names (finding 6)', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'Sec2op', version: '1.0.0' },
        channels: {
          foo: {
            publish: {
              operationId: 'pubFoo',
              security: [{ apiKey: [] }],
              message: { payload: { type: 'object' } },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      expect(result.channels[0].operations[0].securityNames).toEqual(['apiKey'])
    })
  })

  describe('review fixes', () => {
    it('decodes JSON-pointer escapes in a 3.x channel $ref (finding 1)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: { title: 'Escapes', version: '1.0.0' },
        channels: { 'user/signedup': { address: 'user/signedup', messages: {} } },
        operations: {
          onSignup: {
            action: 'receive',
            // "user~1signedup" decodes to "user/signedup"
            channel: { $ref: '#/channels/user~1signedup' },
            summary: 'signed up',
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const channel = result.channels.find((c) => c.name === 'user/signedup')!
      expect(channel.operations).toHaveLength(1)
      expect(channel.operations[0].summary).toBe('signed up')
    })

    it('routes component messages through convertMessage — traits merged, schemaFormat kept (finding 3)', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'CompMsg', version: '1.0.0' },
        channels: {},
        components: {
          messages: {
            LightMeasured: {
              schemaFormat: 'application/vnd.apache.avro;version=1.9.0',
              traits: [{ title: 'Light measured' }],
              payload: { type: 'record', fields: [{ name: 'lumens', type: 'int' }] },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const msg = result.components.messages.LightMeasured
      expect(msg.title).toBe('Light measured') // trait merged
      expect(msg.schemaFormat).toBe('application/vnd.apache.avro;version=1.9.0')
    })

    it('skips unresolvable/circular $ref messages instead of emitting empty ones (finding 4)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: { title: 'BadRefs', version: '1.0.0' },
        channels: { c: { address: 'c', messages: {} } },
        operations: {
          op: {
            action: 'send',
            channel: { $ref: '#/channels/c' },
            messages: [
              { name: 'Real', payload: { type: 'object' } },
              // unresolvable ref with a sibling key -> must be skipped, not rendered empty
              { $ref: '#/components/messages/Missing', summary: 'x' },
            ],
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const op = result.channels[0].operations[0]
      expect(op.messages).toHaveLength(1)
      expect(op.messages[0].name).toBe('Real')
    })
  })

  describe('version-aware trait precedence (behavior 1)', () => {
    it('2.x: trait scalars/contentType override the object; tags replace', async () => {
      const result = await parseAsyncApiSpec(traits2xYaml)
      const op = result.channels.find((c) => c.name === 'invoices/created')!.operations[0]
      // Operation: trait summary wins, trait tags replace object tags.
      expect(op.summary).toBe('Trait operation summary')
      expect((op.tags ?? []).map((t) => t.name)).toEqual(['trait-tag'])
      // Operation externalDocs: trait wins on conflict.
      expect(op.externalDocs?.url).toBe('https://example.com/op-trait')

      const msg = op.message!
      expect(msg.summary).toBe('Trait message summary')
      expect(msg.contentType).toBe('application/trait+json')
      expect((msg.tags ?? []).map((t) => t.name)).toEqual(['msg-trait-tag'])
      expect(msg.externalDocs?.url).toBe('https://example.com/msg-trait')
      // Composite fields still merge: the trait's header is carried.
      expect((msg.headers as { properties: Record<string, unknown> }).properties['X-Trace']).toBeDefined()
    })

    it('2.x: trait externalDocs/tags surface when the object omits them', async () => {
      const result = await parseAsyncApiSpec(traits2xYaml)
      const msg = result.channels.find((c) => c.name === 'receipts/sent')!.operations[0].message!
      expect(msg.externalDocs?.url).toBe('https://example.com/only-trait')
      expect((msg.tags ?? []).map((t) => t.name)).toEqual(['only-trait-tag'])
    })

    it('3.x: the object wins over the trait (spec worked example)', async () => {
      const result = await parseAsyncApiSpec(traits3xYaml)
      const op = result.channels.find((c) => c.name === 'userSignedUp')!.operations[0]
      // AsyncAPI 3.0 worked example: object "A longer description." wins.
      expect(op.summary).toBe('A longer description.')
      // Object tags win; trait tags do not surface when object declares its own.
      expect((op.tags ?? []).map((t) => t.name)).toEqual(['accounts'])
      expect(op.externalDocs?.url).toBe('https://example.com/op-object-3x')

      const msg = op.message!
      expect(msg.summary).toBe('A longer description.')
      expect((msg.tags ?? []).map((t) => t.name)).toEqual(['msg-object-tag'])
      expect(msg.externalDocs?.url).toBe('https://example.com/msg-object')
    })

    it('3.x: trait externalDocs/tags surface only when the object omits them', async () => {
      const result = await parseAsyncApiSpec(traits3xYaml)
      const op = result.channels.find((c) => c.name === 'userDeleted')!.operations[0]
      expect(op.summary).toBe('Trait summary surfaces')
      expect((op.tags ?? []).map((t) => t.name)).toEqual(['trait-surfaced-tag'])
      expect(op.externalDocs?.url).toBe('https://example.com/op-trait-surfaced')

      const msg = op.message!
      expect((msg.tags ?? []).map((t) => t.name)).toEqual(['msg-trait-surfaced'])
      expect(msg.externalDocs?.url).toBe('https://example.com/msg-trait-surfaced')
    })
  })

  describe('externalDocs extraction at all levels (behavior 2)', () => {
    it('2.x: root + tag externalDocs populate', async () => {
      const result = await parseAsyncApiSpec(traits2xYaml)
      expect(result.externalDocs?.url).toBe('https://example.com/root-2x')
      const tag = result.tags?.find((t) => t.name === 'billing')
      expect(tag?.description).toBe('Billing events')
      expect(tag?.externalDocs?.url).toBe('https://example.com/billing')
    })

    it('3.x: root externalDocs and tag description/externalDocs populate', async () => {
      const result = await parseAsyncApiSpec(traits3xYaml)
      expect(result.externalDocs?.url).toBe('https://example.com/root-3x')
      const tag = result.tags?.find((t) => t.name === 'accounts')
      expect(tag?.description).toBe('Account events')
      expect(tag?.externalDocs?.url).toBe('https://example.com/accounts')
    })

    it('3.x: channel externalDocs populate', async () => {
      const result = await parseAsyncApiSpec(traits3xYaml)
      const channel = result.channels.find((c) => c.name === 'userSignedUp')!
      expect(channel.externalDocs?.url).toBe('https://example.com/channel')
    })
  })

  describe('3.x channel tags (behavior 3)', () => {
    it('extracts channel-level tags', async () => {
      const result = await parseAsyncApiSpec(traits3xYaml)
      const channel = result.channels.find((c) => c.name === 'userSignedUp')!
      expect((channel.tags ?? []).map((t) => t.name)).toContain('channel-only-tag')
    })
  })

  describe('tag-level externalDocs on channel/operation/message tags', () => {
    const spec = `
asyncapi: '3.0.0'
info: { title: T, version: '1.0.0' }
tags:
  - $ref: '#/components/tags/orders'
channels:
  c:
    address: c
    tags:
      - name: chtag
        description: Channel tag
        externalDocs: { description: ChTag docs, url: https://example.com/chtag }
operations:
  op:
    action: receive
    channel: { $ref: '#/channels/c' }
    tags:
      - name: optag
        externalDocs: { url: https://example.com/optag }
    messages:
      - $ref: '#/components/messages/M'
components:
  tags:
    orders:
      name: orders
      description: Order events
      externalDocs: { description: Order docs, url: https://example.com/orders }
  messages:
    M:
      name: M
      tags:
        - name: msgtag
          externalDocs: { description: MsgTag docs, url: https://example.com/msgtag }
      payload: { type: object }
`

    it('resolves a $ref root tag with its description and externalDocs', async () => {
      const result = await parseAsyncApiSpec(spec)
      const tag = result.tags?.find((t) => t.name === 'orders')
      expect(tag?.description).toBe('Order events')
      expect(tag?.externalDocs?.url).toBe('https://example.com/orders')
    })

    it('carries externalDocs on channel, operation, and message tags', async () => {
      const result = await parseAsyncApiSpec(spec)
      const channel = result.channels.find((c) => c.name === 'c')!
      expect(channel.tags?.[0]?.externalDocs?.url).toBe('https://example.com/chtag')
      const op = channel.operations[0]
      expect(op.tags?.[0]?.externalDocs?.url).toBe('https://example.com/optag')
      const msg = op.messages[0]
      expect(msg.tags?.[0]?.externalDocs?.url).toBe('https://example.com/msgtag')
    })
  })

  describe('security requirement scopes + OR structure (behavior 4)', () => {
    it('2.x: captures per-map-entry scopes with AND within a map', async () => {
      const result = await parseAsyncApiSpec(securityScopes2xYaml)
      // Server oauth2 read,write
      const server = result.servers[0]
      expect(server.securityRequirements).toEqual([
        [{ name: 'oauth2', scopes: ['read', 'write'] }],
      ])
      expect(server.securityNames).toEqual(['oauth2'])

      // Operation: one map with two keys (AND) -> one inner array of two reqs.
      const op = result.channels[0].operations[0]
      expect(op.securityRequirements).toEqual([
        [
          { name: 'oauth2', scopes: ['admin'] },
          { name: 'apiKey', scopes: [] },
        ],
      ])
    })

    it('3.x: captures scopes from a $ref security entry', async () => {
      const result = await parseAsyncApiSpec(securityReply3xYaml)
      const server = result.servers[0]
      expect(server.securityRequirements).toEqual([
        [{ name: 'oauth2', scopes: ['read', 'write'] }],
      ])
      const op = result.channels.find((c) => c.name === 'requests')!.operations[0]
      expect(op.securityRequirements).toEqual([
        [{ name: 'oauth2', scopes: ['admin'] }],
      ])
      expect(op.securityNames).toEqual(['oauth2'])
    })
  })

  describe('defaultContentType fallback (behavior 5)', () => {
    it('parses the document-root defaultContentType', async () => {
      const result = await parseAsyncApiSpec(traits2xYaml)
      expect(result.defaultContentType).toBe('application/cloudevents+json')
    })

    it('a message without contentType inherits the document default', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'DCT', version: '1.0.0' },
        defaultContentType: 'application/cloudevents+json',
        channels: {
          a: { subscribe: { operationId: 'onA', message: { payload: { type: 'object' } } } },
          b: {
            subscribe: {
              operationId: 'onB',
              message: { contentType: 'application/xml', payload: { type: 'object' } },
            },
          },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const a = result.channels.find((c) => c.name === 'a')!.operations[0].message!
      const b = result.channels.find((c) => c.name === 'b')!.operations[0].message!
      expect(a.contentType).toBe('application/cloudevents+json')
      expect(a.contentTypeInherited).toBe(true)
      expect(b.contentType).toBe('application/xml')
      expect(b.contentTypeInherited).toBeFalsy()
    })

    it('falls back to application/json when no document default is set', async () => {
      const spec = {
        asyncapi: '2.6.0',
        info: { title: 'NoDCT', version: '1.0.0' },
        channels: {
          a: { subscribe: { operationId: 'onA', message: { payload: { type: 'object' } } } },
        },
      }
      const result = await parseAsyncApiSpec(JSON.stringify(spec))
      const a = result.channels[0].operations[0].message!
      expect(a.contentType).toBe('application/json')
      expect(a.contentTypeInherited).toBe(true)
    })
  })

  describe('3.x operationId + title + reply address (behavior 6)', () => {
    it('sets operationId from the operations-map key and extracts title', async () => {
      const result = await parseAsyncApiSpec(traits3xYaml)
      const op = result.channels.find((c) => c.name === 'userSignedUp')!.operations[0]
      expect(op.operationId).toBe('onUserSignedUp')
      expect(op.title).toBe('User Signed Up Operation')
    })

    it('extracts 3.x reply address and channelName', async () => {
      const result = await parseAsyncApiSpec(securityReply3xYaml)
      const op = result.channels.find((c) => c.name === 'requests')!.operations[0]
      expect(op.reply?.address?.location).toBe('$message.header#/replyTo')
      expect(op.reply?.address?.description).toBe('Where to send the reply')
      expect(op.reply?.channelName).toBe('responses')
      expect(op.reply?.messages.map((m) => m.name)).toEqual(['Pong'])
    })

    it('extracts a fixed literal 3.x reply address (string form)', async () => {
      const result = await parseAsyncApiSpec(messageTraits3xYaml)
      const op = result.channels.find((c) => c.name === 'requests')!.operations[0]
      expect(op.reply?.address?.value).toBe('fixed/reply/queue')
      expect(op.reply?.address?.location).toBeUndefined()
    })
  })

  // $ref-based message traits: the component message merges its traits (keeping
  // correlationId) and records the applied trait $ref target names in order.
  describe('3.x message traits via $ref', () => {
    it('keeps a trait-provided correlationId on the component message', async () => {
      const result = await parseAsyncApiSpec(messageTraits3xYaml)
      const msg = result.components.messages.AddOnlyMessage
      expect(msg.correlationId?.location).toBe('$message.header#/correlationId')
      expect(msg.correlationId?.description).toBe('Correlates replies to requests')
    })

    it('records the applied trait $ref target names in applied order', async () => {
      const result = await parseAsyncApiSpec(messageTraits3xYaml)
      const msg = result.components.messages.AddOnlyMessage
      expect(msg.appliedTraits).toEqual(['CommonHeaders', 'Correlated'])
    })
  })
})
