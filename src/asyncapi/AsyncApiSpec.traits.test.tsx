/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

const messageTraits = {
  commonHeaders: {
    headers: { type: 'object', properties: { 'x-request-id': { type: 'string' } } },
  },
}

// A channel message whose trait is a $ref. resolveRefs inlines the trait, so the
// real name ("commonHeaders") is only recoverable from the pre-resolution doc.
// QA saw these render as "trait 1" in the Channels section.
const spec2x = {
  asyncapi: '2.6.0',
  info: { title: 'Orders 2.x', version: '1.0.0' },
  components: { messageTraits },
  channels: {
    'orders/created': {
      publish: {
        operationId: 'publishOrderCreated',
        message: {
          name: 'OrderCreated',
          traits: [{ $ref: '#/components/messageTraits/commonHeaders' }],
          payload: { type: 'object' },
        },
      },
    },
  },
}

const spec3x = {
  asyncapi: '3.0.0',
  info: { title: 'Orders 3.x', version: '1.0.0' },
  components: { messageTraits },
  channels: {
    orders: {
      address: 'orders',
      messages: {
        OrderCreated: {
          traits: [{ $ref: '#/components/messageTraits/commonHeaders' }],
          payload: { type: 'object' },
        },
      },
    },
  },
  operations: {
    publishOrderCreated: {
      action: 'send',
      channel: { $ref: '#/channels/orders' },
      messages: [{ $ref: '#/channels/orders/messages/OrderCreated' }],
    },
  },
}

// The common 3.x layout chains two $ref hops: operation messages →
// #/channels/orders/messages/OrderCreated → #/components/messages/OrderCreated
// (where the traits live). The trait name must survive the whole chain.
const spec3xChained = {
  asyncapi: '3.0.0',
  info: { title: 'Orders 3.x chained', version: '1.0.0' },
  components: {
    messageTraits,
    messages: {
      OrderCreated: {
        traits: [{ $ref: '#/components/messageTraits/commonHeaders' }],
        payload: { type: 'object' },
      },
    },
  },
  channels: {
    orders: {
      address: 'orders',
      messages: {
        OrderCreated: { $ref: '#/components/messages/OrderCreated' },
      },
    },
  },
  operations: {
    sendOrder: {
      action: 'send',
      channel: { $ref: '#/channels/orders' },
      messages: [{ $ref: '#/channels/orders/messages/OrderCreated' }],
    },
  },
}

describe('AsyncApiSpec applied trait names', () => {
  it('shows the real trait name for a $ref trait on a 2.x channel message', async () => {
    render(<AsyncApiSpec spec={spec2x} theme={{ base: 'light' }} defaultExpandOperations />)

    expect(await screen.findByText('commonHeaders')).toBeInTheDocument()
    expect(screen.queryByText('trait 1')).toBeNull()
  })

  it('shows the real trait name for a $ref trait on a 3.x channel message', async () => {
    render(<AsyncApiSpec spec={spec3x} theme={{ base: 'light' }} defaultExpandOperations />)

    expect(await screen.findByText('commonHeaders')).toBeInTheDocument()
    expect(screen.queryByText('trait 1')).toBeNull()
  })

  it('follows a chained $ref (operation → channel message → component message) for the trait name', async () => {
    render(<AsyncApiSpec spec={spec3xChained} theme={{ base: 'light' }} defaultExpandOperations />)

    expect(await screen.findByText('commonHeaders')).toBeInTheDocument()
    expect(screen.queryByText('trait 1')).toBeNull()
  })
})
