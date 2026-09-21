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
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

const taggedSpec = {
  asyncapi: '2.6.0',
  info: { title: 'Tagged API', version: '1.0.0' },
  channels: {
    'orders/updated': {
      subscribe: {
        operationId: 'onOrderUpdated',
        tags: [{ name: 'orders' }, { name: 'alerts' }],
        message: { name: 'OrderUpdated', payload: { type: 'object' } },
      },
    },
    'system/heartbeat': {
      subscribe: {
        operationId: 'onHeartbeat',
        message: { name: 'Heartbeat', payload: { type: 'object' } },
      },
    },
  },
  tags: [
    { name: 'orders', description: 'Everything about orders' },
    { name: 'alerts', externalDocs: { url: 'https://example.com/alerts', description: 'Alert docs' } },
  ],
}

describe('AsyncApiSpec tag grouping', () => {
  it('groups channels by tag in the sidebar with an Untagged bucket', async () => {
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} />)

    const nav = await screen.findByRole('navigation')
    // Tag group nodes exist in the sidebar...
    expect(within(nav).getByText('orders')).toBeInTheDocument()
    expect(within(nav).getByText('alerts')).toBeInTheDocument()
    // ...plus the Untagged bucket for the channel with no tags.
    expect(within(nav).getByText('Untagged')).toBeInTheDocument()
  })

  // The tag description + externalDocs rendering is covered deterministically by
  // TagGroupHeader.test.tsx (the async full-app mount made asserting it here flaky
  // under parallel-suite load).

  it('nests tag groups under x-tagGroups in the sidebar (finding 7)', async () => {
    const spec = {
      asyncapi: '2.6.0',
      info: { title: 'Grouped', version: '1.0.0' },
      channels: {
        'orders/placed': {
          subscribe: { operationId: 'onPlaced', tags: [{ name: 'orders' }], message: { name: 'M', payload: { type: 'object' } } },
        },
      },
      tags: [{ name: 'orders' }],
      'x-tagGroups': [{ name: 'Commerce', tags: ['orders'] }],
    }
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} />)
    const nav = await screen.findByRole('navigation')
    // The x-tagGroup parent node appears, wrapping the tag group.
    expect(within(nav).getByText('Commerce')).toBeInTheDocument()
    expect(within(nav).getByText('orders')).toBeInTheDocument()
  })

  it('filters the sidebar, not just the main content', async () => {
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} />)

    const nav = await screen.findByRole('navigation')
    const filter = screen.getByPlaceholderText(/filter channels/i)
    fireEvent.change(filter, { target: { value: 'heartbeat' } })

    // The matching channel stays; the non-matching one drops out of the sidebar.
    expect(within(nav).getByText('system/heartbeat')).toBeInTheDocument()
    expect(within(nav).queryByText('orders/updated')).toBeNull()
  })
})
