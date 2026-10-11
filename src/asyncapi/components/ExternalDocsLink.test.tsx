/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { ExternalDocsLink } from './ExternalDocsLink'

afterEach(cleanup)

describe('ExternalDocsLink', () => {
  it('renders an anchor to the url that opens in a new tab safely', () => {
    render(<ExternalDocsLink externalDocs={{ url: 'https://docs.example.com' }} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://docs.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('shows the description as the visible label when provided', () => {
    render(
      <ExternalDocsLink
        externalDocs={{ url: 'https://docs.example.com', description: 'Read the payments guide' }}
      />,
    )
    expect(screen.getByRole('link')).toHaveTextContent('Read the payments guide')
  })

  it('falls back to "External docs" when no description is given', () => {
    render(<ExternalDocsLink externalDocs={{ url: 'https://docs.example.com' }} />)
    expect(screen.getByRole('link')).toHaveTextContent('External docs')
  })

  it('builds a disambiguating aria-label from the context and announces the new tab', () => {
    render(
      <ExternalDocsLink externalDocs={{ url: 'https://docs.example.com' }} context="Payments" />,
    )
    expect(screen.getByRole('link')).toHaveAttribute(
      'aria-label',
      'Payments external docs, opens in new tab',
    )
  })

  it('still announces the new tab without a context', () => {
    render(<ExternalDocsLink externalDocs={{ url: 'https://docs.example.com' }} />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'aria-label',
      'External docs, opens in new tab',
    )
  })

  it('renders an external-link icon marked decorative for screen readers', () => {
    const { container } = render(
      <ExternalDocsLink externalDocs={{ url: 'https://docs.example.com' }} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
