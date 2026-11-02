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
import { AsyncOverview } from './AsyncOverview'
import type { ParsedAsyncApiSpec } from '../types/asyncapi.types'

afterEach(cleanup)

function makeSpec(overrides: Partial<ParsedAsyncApiSpec> = {}): ParsedAsyncApiSpec {
  return {
    title: 'Streetlights API',
    version: '1.0.0',
    specVersion: '2.6.0',
    servers: [],
    channels: [],
    components: {} as ParsedAsyncApiSpec['components'],
    ...overrides,
  }
}

describe('AsyncOverview', () => {
  it('renders root externalDocs via ExternalDocsLink (icon + accessible label)', () => {
    render(
      <AsyncOverview
        spec={makeSpec({
          externalDocs: { url: 'https://docs.example.com', description: 'Full documentation' },
        })}
      />,
    )

    // ExternalDocsLink builds the aria-label from the context + "opens in new tab".
    const link = screen.getByRole('link', {
      name: /streetlights api external docs, opens in new tab/i,
    })
    expect(link).toHaveAttribute('href', 'https://docs.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('Full documentation')).toBeInTheDocument()
    // The ↗ external-link icon comes from ExternalDocsLink's <Icon>.
    expect(link.querySelector('svg')).toBeTruthy()
  })

  it('renders root externalDocs for a 3.x spec (no version guard hides it)', () => {
    render(
      <AsyncOverview
        spec={makeSpec({
          title: 'Account Service',
          specVersion: '3.0.0',
          externalDocs: { url: 'https://docs.example.com/v3' },
        })}
      />,
    )

    const link = screen.getByRole('link', {
      name: /account service external docs, opens in new tab/i,
    })
    expect(link).toHaveAttribute('href', 'https://docs.example.com/v3')
    // No description on the externalDocs object → falls back to "External docs".
    expect(screen.getByText('External docs')).toBeInTheDocument()
  })

  it('does not render an externalDocs link when none is present', () => {
    render(<AsyncOverview spec={makeSpec()} />)
    expect(screen.queryByRole('link', { name: /external docs/i })).toBeNull()
  })

  it('routes the contact URL through the external-link treatment (icon + opens in new tab)', () => {
    render(
      <AsyncOverview
        spec={makeSpec({
          contact: { name: 'Support', url: 'https://support.example.com' },
        })}
      />,
    )
    const link = screen.getByRole('link', { name: /opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://support.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    // The shared ↗ external-link icon is present.
    expect(link.querySelector('svg')).toBeTruthy()
  })

  it('routes the license URL through the external-link treatment (icon + opens in new tab)', () => {
    render(
      <AsyncOverview
        spec={makeSpec({
          license: { name: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
        })}
      />,
    )
    const link = screen.getByRole('link', { name: /opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://www.apache.org/licenses/LICENSE-2.0')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.querySelector('svg')).toBeTruthy()
  })
})
