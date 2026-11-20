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
import { SecurityRequirementBadges } from './SecurityRequirementBadges'
import type { AsyncApiSecurityRequirement } from '../types/asyncapi.types'

afterEach(cleanup)

describe('SecurityRequirementBadges', () => {
  it('renders nothing when requirements are empty', () => {
    const { container } = render(<SecurityRequirementBadges requirements={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the default Security label and a scheme chip linking to its scheme', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [[{ name: 'userPass', scopes: [] }]]
    render(<SecurityRequirementBadges requirements={requirements} />)
    expect(screen.getByText('Security')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /userPass/ })
    expect(link).toHaveAttribute('href', '#security-userPass')
  })

  it('supports a custom label', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [[{ name: 'userPass', scopes: [] }]]
    render(<SecurityRequirementBadges requirements={requirements} label="Auth" />)
    expect(screen.getByText('Auth')).toBeInTheDocument()
  })

  it('shows per-requirement scopes alongside the scheme name', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [
      [{ name: 'oauth2Auth', scopes: ['read', 'write'] }],
    ]
    render(<SecurityRequirementBadges requirements={requirements} />)
    const link = screen.getByRole('link', { name: /oauth2Auth/ })
    expect(link).toHaveTextContent('oauth2Auth')
    expect(link).toHaveTextContent('read, write')
  })

  it('does not render a scope list when a scheme has no scopes', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [[{ name: 'apiKey', scopes: [] }]]
    render(<SecurityRequirementBadges requirements={requirements} />)
    const link = screen.getByRole('link', { name: /apiKey/ })
    // No separator / scope text leaks in for a scopeless scheme.
    expect(link.textContent).not.toMatch(/·/)
  })

  it('does not render an OR separator for a single alternative', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [[{ name: 'userPass', scopes: [] }]]
    render(<SecurityRequirementBadges requirements={requirements} />)
    expect(screen.queryByText('OR')).toBeNull()
  })

  it('renders every scheme in an AND alternative', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [
      [
        { name: 'apiKey', scopes: [] },
        { name: 'oauth2Auth', scopes: ['read'] },
      ],
    ]
    render(<SecurityRequirementBadges requirements={requirements} />)
    expect(screen.getByRole('link', { name: /apiKey/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /oauth2Auth/ })).toBeInTheDocument()
    // A single alternative has no OR separator.
    expect(screen.queryByText('OR')).toBeNull()
  })

  it('separates multiple OR alternatives with an OR divider', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [
      [{ name: 'apiKey', scopes: [] }],
      [{ name: 'oauth2Auth', scopes: ['read', 'write'] }],
    ]
    render(<SecurityRequirementBadges requirements={requirements} />)
    expect(screen.getByRole('link', { name: /apiKey/ })).toBeInTheDocument()
    const oauthLink = screen.getByRole('link', { name: /oauth2Auth/ })
    expect(oauthLink).toHaveTextContent('read, write')
    // Exactly one OR divider between two alternatives.
    expect(screen.getAllByText('OR')).toHaveLength(1)
  })

  it('renders one fewer OR divider than there are alternatives', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [
      [{ name: 'a', scopes: [] }],
      [{ name: 'b', scopes: [] }],
      [{ name: 'c', scopes: [] }],
    ]
    render(<SecurityRequirementBadges requirements={requirements} />)
    expect(screen.getAllByText('OR')).toHaveLength(2)
  })

  it('leaves breathing room below the security row (finding 3)', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [[{ name: 'userPass', scopes: [] }]]
    const { container } = render(<SecurityRequirementBadges requirements={requirements} />)
    const row = container.firstElementChild as HTMLElement
    // The row carries a bottom margin so it doesn't butt against the next section.
    expect(getComputedStyle(row).marginBottom).toBe('0.5rem')
  })

  it('keeps each OR divider grouped with the chip that follows it so they wrap as a unit (finding 4)', () => {
    const requirements: AsyncApiSecurityRequirement[][] = [
      [{ name: 'apiKey', scopes: [] }],
      [{ name: 'oauth2Auth', scopes: ['read', 'write'] }],
    ]
    render(<SecurityRequirementBadges requirements={requirements} />)
    const or = screen.getByText('OR')
    // The "OR" and the following chip share a non-wrapping group, so the divider
    // never strands at the end of a line alone.
    const group = or.parentElement as HTMLElement
    expect(getComputedStyle(group).whiteSpace).toBe('nowrap')
    // The chip that follows the OR lives inside the same group.
    expect(group).toContainElement(screen.getByRole('link', { name: /oauth2Auth/ }))
  })
})
