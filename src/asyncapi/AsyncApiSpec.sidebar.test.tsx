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

const spec = {
  asyncapi: '2.6.0',
  info: { title: 'Sidebar API', version: '1.0.0' },
  channels: {
    'orders/placed': {
      subscribe: { operationId: 'onOrderPlaced', message: { name: 'M', payload: { type: 'object' } } },
    },
    'orders/shipped': {
      subscribe: { operationId: 'onOrderShipped', message: { name: 'S', payload: { type: 'object' } } },
    },
  },
}

describe('AsyncApiSpec sidebar empty-search state', () => {
  it('shows a "No results" affordance instead of a bare empty Channels node when a search matches nothing', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} />)
    const nav = await screen.findByRole('navigation')

    fireEvent.change(screen.getByPlaceholderText(/filter channels/i), {
      target: { value: 'zzz-nothing-matches' },
    })

    // The empty "Channels" parent with no children must not be left dangling.
    const channelsNode = within(nav).queryByText('Channels')
    const noResults = within(nav).queryByText(/no results/i)
    expect(noResults).not.toBeNull()
    // If a Channels node is still shown, it must carry the no-results child; a
    // bare empty "Channels" heading is the bug.
    if (channelsNode) {
      expect(noResults).toBeInTheDocument()
    }
  })
})

describe('AsyncApiSpec sidebar action-badge dedupe', () => {
  it('shows a single action badge when a channel has two same-action operations', async () => {
    const dupeSpec = {
      asyncapi: '3.0.0',
      info: { title: 'Dupe actions', version: '1.0.0' },
      channels: { userEvents: { address: 'user/events' } },
      operations: {
        onCreated: { action: 'receive', channel: { $ref: '#/channels/userEvents' }, messages: [] },
        onUpdated: { action: 'receive', channel: { $ref: '#/channels/userEvents' }, messages: [] },
      },
    }
    render(<AsyncApiSpec spec={dupeSpec} theme={{ base: 'light' }} />)
    const nav = await screen.findByRole('navigation')

    // The badge should be a single "RECEIVE", not "RECEIVE/RECEIVE".
    expect(within(nav).queryByText(/RECEIVE\/RECEIVE/i)).toBeNull()
    expect(within(nav).getByText('RECEIVE')).toBeInTheDocument()
  })
})

describe('AsyncApiSpec tag chip click filters', () => {
  it('filters the list to the clicked tag', async () => {
    const taggedSpec = {
      asyncapi: '2.6.0',
      info: { title: 'Tag click', version: '1.0.0' },
      channels: {
        'orders/placed': {
          subscribe: {
            operationId: 'onOrderPlaced',
            tags: [{ name: 'orders' }],
            message: { name: 'M', payload: { type: 'object' } },
          },
        },
        'system/heartbeat': {
          subscribe: {
            operationId: 'onHeartbeat',
            tags: [{ name: 'system' }],
            message: { name: 'H', payload: { type: 'object' } },
          },
        },
      },
    }
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} defaultExpandOperations />)
    await screen.findByRole('navigation')

    // The operation tag chip (in the main content, not the sidebar nav) renders as
    // a button because onTagClick is wired. Await it: the ExpandableCard body
    // lazy-renders after its viewport effect.
    await screen.findAllByRole('button', { name: 'orders' })
    const main = document.querySelector('main') as HTMLElement
    const chip = within(main).getAllByRole('button', { name: 'orders' })[0]
    fireEvent.click(chip)

    // The search is now filtered to "orders" — the heartbeat channel drops from
    // the sidebar nav.
    const nav = screen.getByRole('navigation')
    expect(within(nav).queryByText('system/heartbeat')).toBeNull()
    expect(within(nav).getByText('orders/placed')).toBeInTheDocument()
  })
})

const taggedSpec = {
  asyncapi: '2.6.0',
  info: { title: 'Tag filter UX', version: '1.0.0' },
  channels: {
    'orders/placed': {
      subscribe: {
        operationId: 'onOrderPlaced',
        tags: [{ name: 'orders' }],
        message: { name: 'M', payload: { type: 'object' } },
      },
    },
    'system/heartbeat': {
      subscribe: {
        operationId: 'onHeartbeat',
        tags: [{ name: 'system' }],
        message: { name: 'H', payload: { type: 'object' } },
      },
    },
  },
}

function clickOrdersChip() {
  const main = document.querySelector('main') as HTMLElement
  const chip = within(main).getAllByRole('button', { name: 'orders' })[0]
  fireEvent.click(chip)
}

describe('AsyncApiSpec active tag-filter indicator (finding 2)', () => {
  it('shows an active-filter indicator naming the tag once a tag filter is applied', async () => {
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} defaultExpandOperations />)
    await screen.findByRole('navigation')
    await screen.findAllByRole('button', { name: 'orders' })

    // No active-filter indicator before a tag is clicked.
    expect(screen.queryByText(/filtered by tag/i)).toBeNull()

    clickOrdersChip()

    // A visible indicator names the active tag.
    const indicator = screen.getByText(/filtered by tag/i)
    expect(indicator).toBeInTheDocument()
    expect(indicator.parentElement?.textContent).toMatch(/orders/)
  })

  it('reflects the active tag in the filter input', async () => {
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} defaultExpandOperations />)
    await screen.findByRole('navigation')
    await screen.findAllByRole('button', { name: 'orders' })

    clickOrdersChip()

    const input = screen.getByPlaceholderText(/filter channels/i) as HTMLInputElement
    expect(input.value).toBe('orders')
  })
})

describe('AsyncApiSpec tag-filter clearing (finding 1)', () => {
  it('restores all channels when the Clear control is used', async () => {
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} defaultExpandOperations />)
    await screen.findByRole('navigation')
    await screen.findAllByRole('button', { name: 'orders' })

    clickOrdersChip()
    let nav = screen.getByRole('navigation')
    expect(within(nav).queryByText('system/heartbeat')).toBeNull()

    // A Clear control removes the filter and brings every channel back.
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))

    nav = screen.getByRole('navigation')
    expect(within(nav).getByText('system/heartbeat')).toBeInTheDocument()
    expect(within(nav).getByText('orders/placed')).toBeInTheDocument()
    expect(screen.queryByText(/filtered by tag/i)).toBeNull()
  })

  it('toggles the filter off when the already-active tag chip is clicked again', async () => {
    render(<AsyncApiSpec spec={taggedSpec} theme={{ base: 'light' }} defaultExpandOperations />)
    await screen.findByRole('navigation')
    await screen.findAllByRole('button', { name: 'orders' })

    clickOrdersChip()
    let nav = screen.getByRole('navigation')
    expect(within(nav).queryByText('system/heartbeat')).toBeNull()

    // Clicking the active chip again clears the filter.
    clickOrdersChip()
    nav = screen.getByRole('navigation')
    expect(within(nav).getByText('system/heartbeat')).toBeInTheDocument()
    expect(within(nav).getByText('orders/placed')).toBeInTheDocument()
  })
})
