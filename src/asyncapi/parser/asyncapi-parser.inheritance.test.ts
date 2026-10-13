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
})
