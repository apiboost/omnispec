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
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { TagChips } from './TagChips'

afterEach(cleanup)

describe('TagChips', () => {
  it('renders each tag as a static chip when onTagClick is absent', () => {
    render(<TagChips tags={[{ name: 'orders' }, { name: 'alerts' }]} />)
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('alerts')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders chips as filter buttons that call onTagClick', () => {
    const clicked: string[] = []
    render(<TagChips tags={[{ name: 'orders' }]} onTagClick={(n) => clicked.push(n)} />)
    fireEvent.click(screen.getByRole('button', { name: 'orders' }))
    expect(clicked).toEqual(['orders'])
  })

  it('renders a tag\'s externalDocs link via ExternalDocsLink', () => {
    render(
      <TagChips
        tags={[{ name: 'orders', externalDocs: { description: 'Order docs', url: 'https://example.com/orders' } }]}
      />,
    )
    const link = screen.getByRole('link', { name: /orders external docs, opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://example.com/orders')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.querySelector('svg')).toBeTruthy()
  })

  it('renders nothing for an empty tag list', () => {
    const { container } = render(<TagChips tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
