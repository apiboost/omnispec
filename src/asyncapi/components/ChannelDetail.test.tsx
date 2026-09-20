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
