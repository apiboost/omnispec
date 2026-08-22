/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { OpenIdConnectManual } from '@core/components/Auth/OpenIdConnectManual'
import type { AuthScheme } from '@core/types/auth.types'

const scheme: AuthScheme = {
  id: 'oidc',
  type: 'openIdConnect',
  displayName: 'oidc',
  description: 'Sign in with the corporate identity provider.',
  openIdConnectUrl: 'https://idp.example.com/.well-known/openid-configuration',
}

describe('OpenIdConnectManual', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders the description and the discovery URL as a link without fetching', () => {
    render(
      <OpenIdConnectManual scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} applied={false} />,
    )

    // Description renders.
    expect(
      screen.getByText('Sign in with the corporate identity provider.'),
    ).toBeInTheDocument()

    // openIdConnectUrl shown as a link pointing at the discovery document.
    const link = screen.getByRole('link', { name: scheme.openIdConnectUrl }) as HTMLAnchorElement
    expect(link).toHaveAttribute('href', scheme.openIdConnectUrl)

    // Free shell must never touch the network (no discovery fetch).
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('applies a pasted token as a Bearer Authorization header', () => {
    const onApply = vi.fn()
    render(
      <OpenIdConnectManual scheme={scheme} onApply={onApply} onRemove={vi.fn()} applied={false} />,
    )

    fireEvent.change(screen.getByPlaceholderText('Access token'), {
      target: { value: 'manual-token' },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onApply).toHaveBeenCalledWith({
      schemeId: 'oidc',
      headerName: 'Authorization',
      headerValue: 'Bearer manual-token',
      input: { token: 'manual-token' },
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
