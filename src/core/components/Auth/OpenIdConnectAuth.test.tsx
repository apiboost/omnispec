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
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ConfigProvider } from '@core/context/ConfigContext'
import { OpenIdConnectAuth } from '@core/components/Auth/OpenIdConnectAuth'
import { discoverOpenIdConfiguration } from '@core/utils/oidc-discovery'
import type { AuthScheme, AppliedAuthValue } from '@core/types/auth.types'

vi.mock('@core/utils/oidc-discovery', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal()
  return { ...actual, discoverOpenIdConfiguration: vi.fn() }
})

const scheme: AuthScheme = {
  id: 'oidc',
  type: 'openIdConnect',
  displayName: 'oidc',
  openIdConnectUrl: 'https://idp.example.com/.well-known/openid-configuration',
}

const discoverMock = vi.mocked(discoverOpenIdConfiguration)

function renderScheme(
  overrides: Partial<{
    onApply: (v: AppliedAuthValue) => void
    pro: boolean
    scheme: AuthScheme
    serverUrl: string
  }> = {},
): { onApply: ReturnType<typeof vi.fn> } {
  const onApply = vi.fn()
  const ui: ReactElement = (
    <OpenIdConnectAuth
      scheme={overrides.scheme ?? scheme}
      onApply={onApply}
      onRemove={vi.fn()}
      serverUrl={overrides.serverUrl}
    />
  )
  render(
    <ConfigProvider config={{ interactiveOAuthEnabled: overrides.pro ?? false }}>{ui}</ConfigProvider>,
  )
  return { onApply }
}

describe('OpenIdConnectAuth', () => {
  beforeEach(() => {
    discoverMock.mockReset()
  })
  afterEach(cleanup)

  it('renders the discovered OAuth2 flow (endpoints + scopes) on success', async () => {
    discoverMock.mockResolvedValue({
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
      scopes_supported: ['openid', 'profile'],
    })

    renderScheme({ pro: true })

    // Once discovery resolves, it renders like an oauth2 scheme: the token URL
    // and scopes appear, and the OAuth 2.0 hint is shown.
    await waitFor(() => {
      expect(screen.getByText('https://idp.example.com/token')).toBeInTheDocument()
    })
    expect(screen.getByText('(OAuth 2.0)')).toBeInTheDocument()
    expect(screen.getByText('openid')).toBeInTheDocument()
    expect(screen.getByText('profile')).toBeInTheDocument()
  })

  it('resolves a relative openIdConnectUrl against the selected server before discovery', async () => {
    discoverMock.mockResolvedValue({
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
      scopes_supported: ['openid'],
    })
    const relativeScheme: AuthScheme = {
      id: 'oidc', type: 'openIdConnect', displayName: 'oidc',
      openIdConnectUrl: '/.well-known/openid-configuration',
    }

    renderScheme({ scheme: relativeScheme, serverUrl: 'https://idp.example.com' })

    // The relative URL is resolved to absolute against the server before the
    // discovery util is called (ABOSPEC-215 relative-URL fix).
    await waitFor(() => {
      expect(discoverMock).toHaveBeenCalledWith(
        'https://idp.example.com/.well-known/openid-configuration',
        expect.anything(),
      )
    })
  })

  it('leaves an absolute openIdConnectUrl unchanged regardless of the selected server', async () => {
    discoverMock.mockResolvedValue({
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
      scopes_supported: ['openid'],
    })

    renderScheme({ serverUrl: 'https://other.example.com' })

    await waitFor(() => {
      expect(discoverMock).toHaveBeenCalledWith(
        'https://idp.example.com/.well-known/openid-configuration',
        expect.anything(),
      )
    })
  })

  it('hides Client ID/Secret and uses the standalone token label on Free after discovery', async () => {
    discoverMock.mockResolvedValue({
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
      scopes_supported: ['openid', 'profile'],
    })

    renderScheme({ pro: false })

    // The discovered scheme renders through OAuth2Auth, inheriting the
    // Free-tier credential hiding (ABOSPEC-215).
    await waitFor(() => {
      expect(screen.getByText('https://idp.example.com/token')).toBeInTheDocument()
    })
    expect(screen.queryByPlaceholderText('Client ID')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Client Secret')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /get token/i })).not.toBeInTheDocument()
    expect(screen.getByText('Enter access token:')).toBeInTheDocument()
    expect(screen.queryByText(/or enter access token directly/i)).not.toBeInTheDocument()
  })

  it('shows a themed error and manual token paste when discovery fails', async () => {
    discoverMock.mockRejectedValue(new Error('The OpenID configuration is not valid JSON.'))

    const { onApply } = renderScheme()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not valid JSON/)
    })
    // Manual paste is the graceful fallback — still available.
    const input = screen.getByPlaceholderText('Access token')
    fireEvent.change(input, { target: { value: 'manual-token' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        schemeId: 'oidc',
        headerName: 'Authorization',
        headerValue: 'Bearer manual-token',
      }),
    )
  })

  it('shows the "not a valid URL" error and manual paste for a genuinely invalid discovery URL', async () => {
    // The real util throws this for input that stays unresolvable even after
    // resolveFlowUrl (covered directly in oidc-discovery.test.ts). Here we
    // assert the component surfaces that message as a themed error + fallback.
    discoverMock.mockRejectedValue(
      new Error('The OpenID Connect discovery URL is not a valid URL.'),
    )
    const badScheme: AuthScheme = {
      id: 'oidc', type: 'openIdConnect', displayName: 'oidc',
      openIdConnectUrl: ':://not a url',
    }

    const { onApply } = renderScheme({ scheme: badScheme })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not a valid URL/)
    })
    fireEvent.change(screen.getByPlaceholderText('Access token'), { target: { value: 'paste-tok' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ headerValue: 'Bearer paste-tok' }),
    )
  })

  it('shows a loading state while discovery is in flight', () => {
    discoverMock.mockReturnValue(new Promise(() => {}))
    renderScheme()
    expect(screen.getByRole('status')).toHaveTextContent(/Discovering OpenID configuration/)
    // Manual paste is available even while discovery runs.
    expect(screen.getByPlaceholderText('Access token')).toBeInTheDocument()
  })
})
