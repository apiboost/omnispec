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
import { ExternalLink } from './ExternalLink'

afterEach(cleanup)

describe('ExternalLink', () => {
  it('renders a safe new-tab link with the ↗ icon and an "opens in new tab" label', () => {
    render(
      <ExternalLink href="https://example.com" label="Example website">
        example.com
      </ExternalLink>,
    )
    const link = screen.getByRole('link', { name: /example website, opens in new tab/i })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('example.com')).toBeInTheDocument()
    expect(link.querySelector('svg')).toBeTruthy()
  })
})
