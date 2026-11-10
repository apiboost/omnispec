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
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

afterEach(cleanup)
import { TryItPanel } from '@core/components/TryIt/TryItPanel'
import { ConfigProvider } from '@core/context/ConfigContext'
import { AuthProvider, useAuth } from '@core/context/AuthContext'
import type { AppliedAuthValue, AuthScheme } from '@core/types/auth.types'
import type { ProxyRequest, TryItRequest } from '@core/types/try-it.types'
import type { ParameterDef } from '@core/components/TryIt/ParameterForm'

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

describe('TryItPanel Reset', () => {
  it('clears applied authorization (resets the Authorization panel state)', () => {
    renderPanel([['oauth2AuthCode']], { ...oidcCredential, schemeId: 'oauth2AuthCode' })
    // Precondition: credential applied → Send enabled, no "Authorization required".
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()
    expect(screen.queryByText(/Authorization required/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    // After Reset, the applied credential is gone → Send blocks again.
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    expect(screen.getByText(/Authorization required/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// apiKey placement — `in: header | query | cookie` must be honored on the wire
// and in the generated code samples.
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string
  init: RequestInit
}

function stubFetch(proxied: boolean): FetchCall[] {
  const calls: FetchCall[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    if (proxied) {
      return new Response(
        JSON.stringify({ status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, body: '{}', bodyEncoding: 'utf-8', duration: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
  return calls
}

const apiKeyScheme = (location: 'header' | 'query' | 'cookie', name: string): AuthScheme => ({
  id: 'apiKeyAuth',
  type: 'apiKey',
  displayName: 'apiKeyAuth',
  in: location,
  name,
})

function renderApiKeyPanel(opts: {
  scheme: AuthScheme
  applied: AppliedAuthValue
  proxyUrl?: string
  parameters?: ParameterDef[]
  onRequest?: (r: TryItRequest) => void
}) {
  return render(
    <ConfigProvider config={{ proxyUrl: opts.proxyUrl }}>
      <AuthProvider schemes={[opts.scheme]}>
        <ApplyCredential value={opts.applied} />
        <TryItPanel
          method="get"
          path="/pets"
          serverUrl="https://api.example.com/v1"
          parameters={opts.parameters}
          security={[[opts.scheme.id]]}
          onRequest={opts.onRequest}
        />
      </AuthProvider>
    </ConfigProvider>,
  )
}

async function clickSend() {
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(screen.getByRole('button', { name: /send/i })).toBeEnabled())
}

const limitParam: ParameterDef = { name: 'limit', in: 'query', required: false, example: '10' }

describe('TryItPanel apiKey placement', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('appends an `in: query` apiKey to the URL (URL-encoded) and not as a header', async () => {
    const calls = stubFetch(false)
    renderApiKeyPanel({
      scheme: apiKeyScheme('query', 'apikey'),
      applied: { schemeId: 'apiKeyAuth', headerName: 'apikey', headerValue: 'a/b c&d', in: 'query', input: { value: 'a/b c&d' } },
      parameters: [limitParam],
    })
    await clickSend()
    expect(calls).toHaveLength(1)
    const url = new URL(calls[0].url)
    expect(url.searchParams.get('apikey')).toBe('a/b c&d')
    expect(url.searchParams.get('limit')).toBe('10')
    expect(calls[0].url).toContain('apikey=a%2Fb+c%26d')
    const headers = calls[0].init.headers as Record<string, string>
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('apikey')
  })

  it('resolves placement from the scheme for credentials persisted before `in` was recorded', async () => {
    const calls = stubFetch(false)
    renderApiKeyPanel({
      scheme: apiKeyScheme('query', 'apikey'),
      applied: { schemeId: 'apiKeyAuth', headerName: 'apikey', headerValue: 'k1' },
    })
    await clickSend()
    expect(new URL(calls[0].url).searchParams.get('apikey')).toBe('k1')
    expect(calls[0].init.headers as Record<string, string>).not.toHaveProperty('apikey')
  })

  it('keeps an `in: header` apiKey as a request header', async () => {
    const calls = stubFetch(false)
    renderApiKeyPanel({
      scheme: apiKeyScheme('header', 'X-API-Key'),
      applied: { schemeId: 'apiKeyAuth', headerName: 'X-API-Key', headerValue: 'k2', in: 'header' },
    })
    await clickSend()
    expect(calls[0].url).toBe('https://api.example.com/v1/pets')
    expect(calls[0].init.headers).toMatchObject({ 'X-API-Key': 'k2' })
  })

  it('sends an `in: cookie` apiKey as a Cookie header the proxy can forward', async () => {
    const calls = stubFetch(true)
    renderApiKeyPanel({
      scheme: apiKeyScheme('cookie', 'session_key'),
      applied: { schemeId: 'apiKeyAuth', headerName: 'session_key', headerValue: 'k3', in: 'cookie' },
      proxyUrl: '/api/proxy',
    })
    await clickSend()
    const payload = JSON.parse(calls[0].init.body as string) as ProxyRequest
    expect(payload.url).toBe('https://api.example.com/v1/pets')
    expect(payload.headers).toMatchObject({ Cookie: 'session_key=k3' })
    expect(payload.headers).not.toHaveProperty('session_key')
    expect(screen.queryByText(/cannot set cookies/i)).not.toBeInTheDocument()
  })

  it('warns that cookie credentials cannot be sent in direct (non-proxy) mode', () => {
    stubFetch(false)
    renderApiKeyPanel({
      scheme: apiKeyScheme('cookie', 'session_key'),
      applied: { schemeId: 'apiKeyAuth', headerName: 'session_key', headerValue: 'k3', in: 'cookie' },
    })
    expect(screen.getByText(/cannot set cookies/i)).toBeInTheDocument()
  })

  it('generates code samples that match the actual placement', () => {
    stubFetch(false)
    const { container } = renderApiKeyPanel({
      scheme: apiKeyScheme('query', 'apikey'),
      applied: { schemeId: 'apiKeyAuth', headerName: 'apikey', headerValue: 'k4', in: 'query' },
    })
    const sample = container.textContent ?? ''
    expect(sample).toContain('https://api.example.com/v1/pets?apikey=k4')
    expect(sample).not.toMatch(/-H\s+'apikey: k4'/)
  })
})
