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
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ChannelDetail } from './ChannelDetail'
import { ConfigProvider } from '@core/context/ConfigContext'
import type { AsyncApiChannel } from '../types/asyncapi.types'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

function renderChannel(channel: AsyncApiChannel) {
  return render(
    <ConfigProvider config={{ defaultExpandOperations: true }}>
      <ChannelDetail channel={channel} expandAll />
    </ConfigProvider>,
  )
}

describe('ChannelDetail message rendering', () => {
  it('renders a provided payload example instead of a synthesized one', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          messages: [
            {
              name: 'Order',
              contentType: 'application/json',
              payload: { type: 'object', properties: { status: { type: 'string' } } },
              examples: [
                { name: 'sample', payload: { status: 'SHIPPED_FROM_EXAMPLE' } },
              ],
            },
          ],
          message: {
            name: 'Order',
            payload: { type: 'object', properties: { status: { type: 'string' } } },
          },
        },
      ],
    }
    renderChannel(channel)
    fireEvent.click(screen.getByRole('tab', { name: /example/i }))
    expect(screen.getByText(/SHIPPED_FROM_EXAMPLE/)).toBeInTheDocument()
  })

  it('renders an Avro payload as a real field tree, not the bare word "record"', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'subscribe',
          messages: [
            {
              name: 'Order',
              schemaFormat: 'application/vnd.apache.avro',
              payload: {
                type: 'record',
                name: 'Order',
                fields: [{ name: 'orderId', type: 'string' }],
              },
            },
          ],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('orderId')).toBeInTheDocument()
  })

  it('displays the correlationId', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'subscribe',
          messages: [
            {
              name: 'Order',
              correlationId: { location: '$message.header#/correlationId', description: 'Trace id' },
            },
          ],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('correlationId')).toBeInTheDocument()
    expect(screen.getByText('$message.header#/correlationId')).toBeInTheDocument()
  })

  it('renders channel, operation, and message protocol bindings', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      bindings: { kafka: { topic: 'orders-topic' } },
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          bindings: { kafka: { groupId: 'order-consumers' } },
          messages: [
            {
              name: 'Order',
              payload: { type: 'object' },
              bindings: { kafka: { key: 'order-key' } },
            },
          ],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('orders-topic')).toBeInTheDocument()
    expect(screen.getByText('order-consumers')).toBeInTheDocument()
    expect(screen.getByText('order-key')).toBeInTheDocument()
  })

  it('renders channel parameter format, enum, and constraints — not just type', () => {
    const channel: AsyncApiChannel = {
      name: 'streetlight',
      address: 'smartylighting/{streetlightId}',
      parameters: {
        streetlightId: {
          description: 'The ID of the streetlight.',
          schema: { type: 'string', format: 'uuid', enum: ['a', 'b'] },
        },
      },
      operations: [],
    }
    renderChannel(channel)
    expect(screen.getByText('streetlightId')).toBeInTheDocument()
    expect(screen.getByText('uuid')).toBeInTheDocument()
    expect(screen.getByText(/enum:/)).toBeInTheDocument()
  })

  it('renders operation tags as chips', () => {
    const channel: AsyncApiChannel = {
      name: 'order-events',
      address: 'order-events',
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          tags: [{ name: 'orders' }, { name: 'alerts' }],
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('alerts')).toBeInTheDocument()
  })

  it('renders a request-reply Reply section', () => {
    const channel: AsyncApiChannel = {
      name: 'ping',
      address: 'ping',
      operations: [
        {
          action: 'send',
          operationId: 'ping',
          messages: [{ name: 'Ping', payload: { type: 'object' } }],
          reply: { messages: [{ name: 'Pong', payload: { type: 'object' } }] },
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('Reply')).toBeInTheDocument()
    expect(screen.getByText(/Pong/)).toBeInTheDocument()
  })

  it('shows a notice for an unresolved $ref payload instead of failing silently', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'subscribe',
          messages: [{ name: 'Order', payload: { $ref: '#/components/schemas/Missing' } }],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText(/unresolved reference/i)).toBeInTheDocument()
    expect(screen.getByText(/#\/components\/schemas\/Missing/)).toBeInTheDocument()
  })

  it('renders operation-level security requirements', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'sendOrder',
          securityRequirements: [[{ name: 'oauth2Scheme', scopes: [] }]],
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('oauth2Scheme')).toBeInTheDocument()
  })

  it('offers a selector when an operation carries multiple messages', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'subscribe',
          messages: [
            { name: 'OrderCreated', payload: { type: 'object' } },
            { name: 'OrderCancelled', payload: { type: 'object' } },
          ],
        },
      ],
    }
    renderChannel(channel)
    // Both message names must be reachable — the second is not silently dropped.
    expect(screen.getByText('OrderCreated')).toBeInTheDocument()
    expect(screen.getByText('OrderCancelled')).toBeInTheDocument()
  })

  // 3.x operations carry operationId AND title AND summary; all appear.
  it('shows the 3.x operationId, title, and summary together', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'sendOrder',
          title: 'Send Order',
          summary: 'Places a new order',
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('sendOrder')).toBeInTheDocument()
    expect(screen.getByText('Send Order')).toBeInTheDocument()
    expect(screen.getByText('Places a new order')).toBeInTheDocument()
  })

  // Reply address (location + description) and channelName render.
  it('renders the reply address location, description, and channel name', () => {
    const channel: AsyncApiChannel = {
      name: 'ping',
      address: 'ping',
      operations: [
        {
          action: 'send',
          operationId: 'ping',
          messages: [{ name: 'Ping', payload: { type: 'object' } }],
          reply: {
            messages: [{ name: 'Pong', payload: { type: 'object' } }],
            address: { location: '$message.header#/replyTo', description: 'Where the reply goes' },
            channelName: 'pong-channel',
          },
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('$message.header#/replyTo')).toBeInTheDocument()
    expect(screen.getByText('Where the reply goes')).toBeInTheDocument()
    expect(screen.getByText(/pong-channel/)).toBeInTheDocument()
  })

  // A fixed literal reply address (reply.address given as a plain string) must
  // render, not only the dynamic/location form.
  it('renders a fixed literal reply address', () => {
    const channel: AsyncApiChannel = {
      name: 'ping',
      address: 'ping',
      operations: [
        {
          action: 'send',
          operationId: 'ping',
          messages: [{ name: 'Ping', payload: { type: 'object' } }],
          reply: {
            messages: [],
            address: { value: 'fixed/reply/address' },
            channelName: 'pong-channel',
          },
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('fixed/reply/address')).toBeInTheDocument()
  })

  // Applied message traits are surfaced so a reader can see which traits a
  // message uses.
  it('renders the applied message trait identifiers', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'placeOrder',
          messages: [
            {
              name: 'Order',
              payload: { type: 'object' },
              appliedTraits: ['CommonHeaders', 'TracingTrait'],
            },
          ],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('CommonHeaders')).toBeInTheDocument()
    expect(screen.getByText('TracingTrait')).toBeInTheDocument()
  })

  // filterable tag chips.
  it('renders operation tag chips as buttons that call onTagClick when the prop is given', () => {
    const channel: AsyncApiChannel = {
      name: 'order-events',
      address: 'order-events',
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          tags: [{ name: 'orders' }, { name: 'alerts' }],
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    const clicked: string[] = []
    render(
      <ConfigProvider config={{ defaultExpandOperations: true }}>
        <ChannelDetail channel={channel} expandAll onTagClick={(name) => clicked.push(name)} />
      </ConfigProvider>,
    )
    const ordersChip = screen.getByRole('button', { name: 'orders' })
    fireEvent.click(ordersChip)
    expect(clicked).toEqual(['orders'])
  })

  it('renders operation tag chips as static (non-button) when onTagClick is absent', () => {
    const channel: AsyncApiChannel = {
      name: 'order-events',
      address: 'order-events',
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          tags: [{ name: 'orders' }],
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'orders' })).toBeNull()
  })

  // operation externalDocs.
  it('renders operation externalDocs', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'sendOrder',
          externalDocs: { description: 'Operation guide', url: 'https://example.com/op' },
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    const link = screen.getByRole('link', { name: /sendOrder external docs/i })
    expect(link).toHaveAttribute('href', 'https://example.com/op')
  })

  // channel externalDocs (3.x).
  it('renders channel externalDocs', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      externalDocs: { description: 'Channel guide', url: 'https://example.com/channel' },
      operations: [],
    }
    renderChannel(channel)
    const link = screen.getByRole('link', { name: /orders external docs/i })
    expect(link).toHaveAttribute('href', 'https://example.com/channel')
  })

  // channel's own tags (2.x and 3.x) render as chips on the channel.
  it('renders the channel\'s own tags as chips', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      tags: [{ name: 'channel-only-tag' }, { name: 'billing' }],
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    expect(screen.getByText('channel-only-tag')).toBeInTheDocument()
    expect(screen.getByText('billing')).toBeInTheDocument()
  })

  // a channel tag that carries externalDocs surfaces its docs link.
  it('renders the externalDocs link of a channel tag', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      tags: [
        { name: 'billing', externalDocs: { description: 'Billing docs', url: 'https://example.com/billing' } },
      ],
      operations: [],
    }
    renderChannel(channel)
    const link = screen.getByRole('link', { name: /billing external docs, opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://example.com/billing')
  })

  // a channel tag is clickable (filter) when onTagClick is provided.
  it('renders channel tag chips as filter buttons when onTagClick is given', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      tags: [{ name: 'billing' }],
      operations: [],
    }
    const clicked: string[] = []
    render(
      <ConfigProvider config={{ defaultExpandOperations: true }}>
        <ChannelDetail channel={channel} expandAll onTagClick={(name) => clicked.push(name)} />
      </ConfigProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'billing' }))
    expect(clicked).toEqual(['billing'])
  })

  // an operation tag that carries externalDocs surfaces its docs link.
  it('renders the externalDocs link of an operation tag', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'subscribe',
          operationId: 'onOrder',
          tags: [
            { name: 'alerts', externalDocs: { description: 'Alert docs', url: 'https://example.com/alerts' } },
          ],
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    const link = screen.getByRole('link', { name: /alerts external docs, opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://example.com/alerts')
  })

  // operation security via the requirements API.
  it('renders operation-level security requirements with scopes', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'sendOrder',
          securityRequirements: [[{ name: 'oauth2Scheme', scopes: ['orders:write'] }]],
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    const link = screen.getByRole('link', { name: /oauth2Scheme/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveTextContent('orders:write')
  })

  // finding 5: the operation summary must stack under the operation name rather
  // than share its row and get crushed on narrow (~390-426px) viewports.
  it('stacks the operation summary under the operation name line', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'sendOrder',
          title: 'Send Order',
          summary: 'Places a new order and does quite a lot of narrative explaining',
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderChannel(channel)
    const summary = screen.getByText(/Places a new order/)
    const operationId = screen.getByText('sendOrder')
    // The summary is not a direct sibling of the operationId inside one flex
    // row; it lives in its own block that spans the full width (flexBasis 100%),
    // so it wraps onto its own line.
    expect(summary.parentElement).not.toBe(operationId.parentElement)
    expect(getComputedStyle(summary).flexBasis).toBe('100%')
  })
})
