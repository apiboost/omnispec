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

  it('renders operation-level security requirements', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'sendOrder',
          securityNames: ['oauth2Scheme'],
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
})
