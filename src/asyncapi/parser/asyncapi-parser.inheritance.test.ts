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
import { parseAsyncApiSpec } from './asyncapi-parser'

// per the AsyncAPI 3.0 spec, when a 3.x operation omits `messages`
// it applies to ALL of its channel's messages — not none.
describe('AsyncAPI 3.x operation message inheritance', () => {
  const channel = {
    address: 'lighting',
    messages: {
      dimLight: { name: 'DimLight', payload: { type: 'object' } },
      dimLightSchedule: { name: 'DimLightSchedule', payload: { type: 'object' } },
    },
  }

  it('inherits all channel messages when the operation declares none', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: { lighting: channel },
      operations: {
        dimLight: { action: 'send', channel: { $ref: '#/channels/lighting' } },
      },
    })
    const op = result.channels[0].operations[0]
    expect(op.messages.map((m) => m.name).sort()).toEqual(['DimLight', 'DimLightSchedule'])
  })

  it('uses only the named messages when the operation declares a subset', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: { lighting: channel },
      operations: {
        dimLight: {
          action: 'send',
          channel: { $ref: '#/channels/lighting' },
          messages: [{ $ref: '#/channels/lighting/messages/dimLight' }],
        },
      },
    })
    const op = result.channels[0].operations[0]
    expect(op.messages.map((m) => m.name)).toEqual(['DimLight'])
  })
})

// an operation referencing a channel that isn't defined must not
// silently vanish — it's surfaced under a synthetic "Unassigned" group.
describe('AsyncAPI 3.x operations referencing a missing channel', () => {
  it('surfaces the operation under an Unassigned group instead of dropping it', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: {
        lighting: { address: 'lighting', messages: { m: { name: 'M', payload: { type: 'object' } } } },
      },
      operations: {
        ghost: { action: 'send', channel: { $ref: '#/channels/doesNotExist' } },
      },
    })
    const unassigned = result.channels.find((c) => c.name === '__unassigned__')
    expect(unassigned).toBeDefined()
    expect(unassigned!.operations.map((o) => o.operationId)).toContain('ghost')
  })

  // The zero-channels case: a document that defines operations but NO channels
  // at all must still surface its operations (under the Unassigned group), not
  // drop them silently.
  it('surfaces operations when the document defines zero channels', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      operations: {
        ghost: { action: 'send', channel: { $ref: '#/channels/doesNotExist' } },
        orphan: { action: 'receive' },
      },
    })
    const unassigned = result.channels.find((c) => c.name === '__unassigned__')
    expect(unassigned).toBeDefined()
    expect(unassigned!.operations.map((o) => o.operationId).sort()).toEqual(['ghost', 'orphan'])
  })
})

// 3.x request-reply address can be a runtime-expression object ({ location })
// OR a fixed literal string (reply.address: 'some/address'). Both must be carried.
describe('AsyncAPI 3.x reply address shapes', () => {
  it('carries a dynamic/runtime-expression reply address (location)', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: { requests: { address: 'requests' } },
      operations: {
        ask: {
          action: 'send',
          channel: { $ref: '#/channels/requests' },
          reply: { address: { location: '$message.header#/replyTo', description: 'dyn' } },
        },
      },
    })
    const op = result.channels[0].operations[0]
    expect(op.reply?.address?.location).toBe('$message.header#/replyTo')
    expect(op.reply?.address?.value).toBeUndefined()
  })

  it('carries a fixed literal reply address (string)', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: { requests: { address: 'requests' } },
      operations: {
        ask: {
          action: 'send',
          channel: { $ref: '#/channels/requests' },
          reply: { address: 'fixed/reply/address' },
        },
      },
    })
    const op = result.channels[0].operations[0]
    expect(op.reply?.address?.value).toBe('fixed/reply/address')
    expect(op.reply?.address?.location).toBeUndefined()
  })
})

// correlationId must survive the component-message trait merge (same as the
// channel view) — a trait-provided correlationId must reach the parsed message.
describe('AsyncAPI component-message trait merge keeps correlationId', () => {
  it('retains a trait-provided correlationId on a component message', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: {},
      operations: {},
      components: {
        messages: {
          AddOnlyMessage: {
            name: 'AddOnlyMessage',
            payload: { type: 'object' },
            traits: [
              { correlationId: { location: '$message.header#/correlationId', description: 'cid' } },
            ],
          },
        },
      },
    })
    const msg = result.components.messages.AddOnlyMessage
    expect(msg.correlationId?.location).toBe('$message.header#/correlationId')
  })
})

// The applied trait identifiers (names or $ref targets, in applied order) are
// surfaced on the parsed message so the UI can show which traits it uses.
describe('AsyncAPI message trait provenance', () => {
  it('records the applied trait names in declaration order', async () => {
    const result = await parseAsyncApiSpec({
      asyncapi: '3.0.0',
      info: { title: 'x', version: '1.0.0' },
      channels: {},
      operations: {},
      components: {
        messages: {
          Multi: {
            name: 'Multi',
            payload: { type: 'object' },
            traits: [
              { name: 'TraitA', summary: 'a' },
              { name: 'TraitB', summary: 'b' },
            ],
          },
        },
      },
    })
    const msg = result.components.messages.Multi
    expect(msg.appliedTraits).toEqual(['TraitA', 'TraitB'])
  })
})
