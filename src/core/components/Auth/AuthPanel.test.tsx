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
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { AuthProvider } from '@core/context/AuthContext'
import { ConfigProvider } from '@core/context/ConfigContext'
import { AuthPanel } from '@core/components/Auth/AuthPanel'
import type { AuthScheme } from '@core/types/auth.types'
import type { InteractiveAuthProps } from '@core/types/interactive-auth.types'

const apiKeyScheme: AuthScheme = {
  id: 'ApiKeyAuth', type: 'apiKey', displayName: 'ApiKeyAuth', in: 'header', name: 'X-API-Key',
}
const oauthScheme: AuthScheme = {
  id: 'oAuth2', type: 'oauth2', displayName: 'OAuth2',
  flows: { clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: {} } },
}

const renderPanel = (schemes: AuthScheme[]) =>
  render(<AuthProvider schemes={schemes}><AuthPanel schemes={schemes} /></AuthProvider>)

describe('AuthPanel scheme tabs', () => {
  afterEach(cleanup)

  it('renders a single scheme directly, with no tab bar', () => {
    renderPanel([apiKeyScheme])
    expect(screen.getByPlaceholderText('Enter API key')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('renders one tab per scheme when there are multiple, showing only the active scheme form', () => {
    renderPanel([apiKeyScheme, oauthScheme])

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    // Tab labels come from the canonical type map, not the raw scheme id (ABOSPEC-215).
    expect(tabs[0]).toHaveTextContent('API Key')
    expect(tabs[1]).toHaveTextContent('OAuth2')

    // First scheme active: its form is visible, the other is not.
    expect(screen.getByPlaceholderText('Enter API key')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Access token')).not.toBeInTheDocument()
  })

  it('switches the visible form when another tab is selected', () => {
    renderPanel([apiKeyScheme, oauthScheme])

    fireEvent.click(screen.getByRole('tab', { name: /OAuth2/ }))

    expect(screen.getByPlaceholderText('Access token')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Enter API key')).not.toBeInTheDocument()
  })

  it('appends the scheme id to disambiguate two schemes of the same type', () => {
    const apiKeyA: AuthScheme = { id: 'keyA', type: 'apiKey', displayName: 'keyA', in: 'header', name: 'X-A' }
    const apiKeyB: AuthScheme = { id: 'keyB', type: 'apiKey', displayName: 'keyB', in: 'header', name: 'X-B' }
    renderPanel([apiKeyA, apiKeyB])

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveTextContent('API Key (keyA)')
    expect(tabs[1]).toHaveTextContent('API Key (keyB)')
  })

  it('marks a scheme tab as authorized once its credentials are applied', () => {
    renderPanel([apiKeyScheme, oauthScheme])

    // Apply the API key.
    fireEvent.change(screen.getByPlaceholderText('Enter API key'), { target: { value: 'secret-key' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    const apiKeyTab = screen.getByRole('tab', { name: /API Key/ })
    expect(within(apiKeyTab).getByTitle(/authorized/i)).toBeInTheDocument()
    // The other tab is not marked authorized.
    expect(within(screen.getByRole('tab', { name: /OAuth2/ })).queryByTitle(/authorized/i)).toBeNull()
  })
})

describe('AuthPanel — interactive vs manual resolution', () => {
  afterEach(cleanup)

  // A stand-in for Pro's interactive OAuth component.
  const StubInteractive = (_props: InteractiveAuthProps) => <div>INTERACTIVE-OAUTH</div>

  const renderWithConfig = (config: Parameters<typeof ConfigProvider>[0]['config']) =>
    render(
      <AuthProvider schemes={[oauthScheme]}>
        <ConfigProvider config={config}>
          <AuthPanel schemes={[oauthScheme]} />
        </ConfigProvider>
      </AuthProvider>,
    )

  it('renders the free manual shell when no interactiveAuth is supplied', () => {
    renderWithConfig({})
    expect(screen.getByPlaceholderText('Access token')).toBeInTheDocument()
    expect(screen.queryByText('INTERACTIVE-OAUTH')).not.toBeInTheDocument()
  })

  it('renders the Pro interactive component when supplied via interactiveAuth', () => {
    renderWithConfig({ interactiveAuth: { oauth2: StubInteractive } })
    expect(screen.getByText('INTERACTIVE-OAUTH')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Access token')).not.toBeInTheDocument()
  })

  it('falls back to the manual shell when the consumer opts out (interactiveOAuth=false)', () => {
    renderWithConfig({ interactiveAuth: { oauth2: StubInteractive }, interactiveOAuth: false })
    expect(screen.getByPlaceholderText('Access token')).toBeInTheDocument()
    expect(screen.queryByText('INTERACTIVE-OAUTH')).not.toBeInTheDocument()
  })
})
