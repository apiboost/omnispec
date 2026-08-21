/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

afterEach(cleanup)
import { TryItPanel } from '@core/components/TryIt/TryItPanel'
import { ConfigProvider } from '@core/context/ConfigContext'
import { AuthProvider, useAuth } from '@core/context/AuthContext'
import type { AppliedAuthValue } from '@core/types/auth.types'

function ApplyCredential({ value }: { value: AppliedAuthValue }) {
  const { applyAuth } = useAuth()
  useEffect(() => {
    applyAuth(value)
    // Intentionally applied once on mount — the test harness seeds one credential.
  }, [])
  return null
}

function renderPanel(security?: string[][], applied?: AppliedAuthValue) {
  return render(
    <ConfigProvider config={{}}>
      <AuthProvider schemes={[]}>
        {applied && <ApplyCredential value={applied} />}
        <TryItPanel method="get" path="/profile" serverUrl="https://api.example.com" security={security} />
      </AuthProvider>
    </ConfigProvider>,
  )
}

const oidcCredential: AppliedAuthValue = {
  schemeId: 'openIdConnect',
  headerName: 'Authorization',
  headerValue: 'Bearer test-token',
}

describe('TryItPanel Send authorization gating', () => {
  it('blocks Send when auth is required and no credentials are applied', () => {
    renderPanel([['oauth2AuthCode']])
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    expect(screen.getByText(/Authorization required/)).toBeInTheDocument()
  })

  it('enables Send when credentials are applied under a different scheme than the operation declares', () => {
    renderPanel([['oauth2AuthCode']], oidcCredential)
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()
    expect(screen.getByText(/declares oauth2AuthCode/)).toBeInTheDocument()
    expect(screen.queryByText(/Authorization required/)).not.toBeInTheDocument()
  })

  it('enables Send with no notice when the declared scheme is applied', () => {
    renderPanel([['oauth2AuthCode']], { ...oidcCredential, schemeId: 'oauth2AuthCode' })
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()
    expect(screen.queryByText(/declares/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Authorization required/)).not.toBeInTheDocument()
  })

  it('never blocks operations without security requirements', () => {
    renderPanel(undefined)
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()
  })
})
