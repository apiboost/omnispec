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
  it('renders the tag label, description, and externalDocs link', () => {
    render(
      <TagGroupHeader
        group={{
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
    const link = screen.getByRole('link', { name: /order docs/i })
    expect(link).toHaveAttribute('href', 'https://example.com/orders')
  })

  it('renders without a description or docs for the untagged group', () => {
    render(<TagGroupHeader group={{ label: 'Untagged', tag: undefined, channels: [] }} />)
    expect(screen.getByText('Untagged')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
