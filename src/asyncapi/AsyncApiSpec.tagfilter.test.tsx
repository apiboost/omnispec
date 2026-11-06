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
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  // Reset the URL between tests — these cases read and write query params.
  window.history.replaceState({}, '', '/')
})

// A 2.x spec with a single tagged publish operation: the operation yields the
// "Group by" toggle (it has operations) and a clickable "orders" tag chip.
const spec = {
  asyncapi: '2.6.0',
  info: { title: 'Orders API', version: '1.0.0' },
  channels: {
    'orders/created': {
      publish: {
        operationId: 'publishOrderCreated',
        summary: 'Publish order created',
        tags: [{ name: 'orders' }],
        message: { payload: { type: 'object' } },
      },
    },
  },
}

describe('AsyncApiSpec filter UI', () => {
  it('uses an operation-aware filter placeholder in Group by: Operation mode', async () => {
    render(<AsyncApiSpec spec={spec} defaultExpandOperations theme={{ base: 'light' }} />)

    expect(await screen.findByPlaceholderText('Filter channels...')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Group by operation' }))

    expect(await screen.findByPlaceholderText('Filter operations...')).toBeInTheDocument()
  })

  it('reflects the active tag filter in the URL so it can be shared/bookmarked', async () => {
    render(<AsyncApiSpec spec={spec} defaultExpandOperations theme={{ base: 'light' }} />)

    const chip = await screen.findByRole('button', { name: 'orders' })
    fireEvent.click(chip)

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('omnispec-tag')).toBe('orders')
    })
  })

  it('clears the tag query param from the URL when the filter is cleared', async () => {
    window.history.replaceState({}, '', '/?omnispec-tag=orders')
    render(<AsyncApiSpec spec={spec} defaultExpandOperations theme={{ base: 'light' }} />)

    fireEvent.click(await screen.findByRole('button', { name: /Clear tag filter/i }))

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('omnispec-tag')).toBeNull()
    })
  })

  it('applies a tag filter supplied in the URL (namespaced param) on load', async () => {
    window.history.replaceState({}, '', '/?omnispec-tag=orders')
    render(<AsyncApiSpec spec={spec} defaultExpandOperations theme={{ base: 'light' }} />)

    // The dismissible "Filtered by tag" indicator reflects the URL-provided tag.
    expect(await screen.findByText('Filtered by tag:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear tag filter: orders/i })).toBeInTheDocument()
  })

  it('ignores a URL tag the spec does not declare (no blind filter)', async () => {
    window.history.replaceState({}, '', '/?omnispec-tag=not-a-real-tag')
    render(<AsyncApiSpec spec={spec} defaultExpandOperations theme={{ base: 'light' }} />)

    // The spec renders and no filter indicator appears (the undeclared tag is ignored).
    await screen.findByRole('navigation')
    expect(screen.queryByText('Filtered by tag:')).toBeNull()
  })

  it('marks the active tag chip with aria-pressed for screen readers', async () => {
    render(<AsyncApiSpec spec={spec} defaultExpandOperations theme={{ base: 'light' }} />)

    const chip = await screen.findByRole('button', { name: 'orders' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(chip)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'orders' })).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
