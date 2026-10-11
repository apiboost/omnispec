/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TagGroupHeader } from './TagGroupHeader'

afterEach(cleanup)

describe('TagGroupHeader', () => {
  it('renders the tag label, description, and externalDocs via ExternalDocsLink', () => {
    render(
      <TagGroupHeader
        group={{
          id: 'orders',
          label: 'orders',
          tag: {
            name: 'orders',
            description: 'Everything about orders',
            externalDocs: { url: 'https://example.com/orders', description: 'Order docs' },
          },
          channels: [],
        }}
      />,
    )
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('Everything about orders')).toBeInTheDocument()
    // ExternalDocsLink derives the accessible name from the group label + "opens in new tab".
    const link = screen.getByRole('link', { name: /orders external docs, opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://example.com/orders')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('Order docs')).toBeInTheDocument()
    // The ↗ external-link icon comes from ExternalDocsLink's <Icon>.
    expect(link.querySelector('svg')).toBeTruthy()
  })

  it('renders both description and externalDocs for a 3.x-style tag (no version suppression)', () => {
    render(
      <TagGroupHeader
        group={{
          id: 'accounts',
          label: 'accounts',
          tag: {
            name: 'accounts',
            description: 'Account lifecycle events',
            externalDocs: { url: 'https://example.com/accounts' },
          },
          channels: [],
        }}
      />,
    )
    expect(screen.getByText('Account lifecycle events')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /accounts external docs, opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://example.com/accounts')
    // No description on externalDocs → falls back to "External docs".
    expect(screen.getByText('External docs')).toBeInTheDocument()
  })

  it('renders without a description or docs for the untagged group', () => {
    render(<TagGroupHeader group={{ id: 'untagged', label: 'Untagged', tag: undefined, channels: [] }} />)
    expect(screen.getByText('Untagged')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
