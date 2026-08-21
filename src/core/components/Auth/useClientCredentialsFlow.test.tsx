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
import { renderHook, act, cleanup, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ConfigProvider } from '@core/context/ConfigContext'
import { useClientCredentialsFlow } from '@core/components/Auth/useClientCredentialsFlow'
import { exchangeClientCredentials } from '@core/utils/oauth-pkce'
import type { OAuth2Flow } from '@core/types/auth.types'

vi.mock('@core/utils/oauth-pkce', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal()
  return { ...actual, exchangeClientCredentials: vi.fn() }
})

const flow: OAuth2Flow = {
  tokenUrl: 'https://auth.example.com/token',
  scopes: { 'read:pets': 'Read pets', 'write:pets': 'Write pets' },
}

function wrapperWith(config: Record<string, unknown> = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ConfigProvider config={config}>{children}</ConfigProvider>
  }
}

function renderFlow(config: Record<string, unknown> = {}) {
  const onToken = vi.fn()
  const hook = renderHook(
    () => useClientCredentialsFlow({ flow, clientId: 'cc-client', clientSecret: 'cc-secret', onToken }),
    { wrapper: wrapperWith(config) },
  )
  return { ...hook, onToken }
}

describe('useClientCredentialsFlow', () => {
  beforeEach(() => {
    vi.mocked(exchangeClientCredentials).mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('exchanges credentials with the flow scopes and proxy config, then applies the token', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'cc-tok', tokenType: 'Bearer' })
    const { result, onToken } = renderFlow({ proxyUrl: '/api/proxy', proxyHeaders: { 'X-Referer': 'Apiboost' } })

    await act(() => result.current.start())

    expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({
      tokenUrl: 'https://auth.example.com/token',
      clientId: 'cc-client',
      clientSecret: 'cc-secret',
      scopes: ['read:pets', 'write:pets'],
      proxyUrl: '/api/proxy',
      proxyHeaders: { 'X-Referer': 'Apiboost' },
    }))
    await waitFor(() => expect(onToken).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'cc-tok' })))
    expect(result.current.status).toBe('idle')
  })

  it('surfaces an error and does not apply a token when the exchange fails', async () => {
    vi.mocked(exchangeClientCredentials).mockRejectedValue(new Error('Token request failed — invalid_client'))
    const { result, onToken } = renderFlow()

    await act(() => result.current.start())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('invalid_client')
    expect(onToken).not.toHaveBeenCalled()
  })

  it('reports an error when the flow has no token URL', async () => {
    const onToken = vi.fn()
    const { result } = renderHook(
      () => useClientCredentialsFlow({ flow: { scopes: {} }, clientId: 'x', clientSecret: 'y', onToken }),
      { wrapper: wrapperWith() },
    )

    await act(() => result.current.start())

    expect(result.current.status).toBe('error')
    expect(exchangeClientCredentials).not.toHaveBeenCalled()
  })
  it('forwards the provided scope subset to the exchange, overriding the flow default', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 't', tokenType: 'Bearer' })
    const onToken = vi.fn()
    const { result } = renderHook(
      () => useClientCredentialsFlow({ flow, clientId: 'c', clientSecret: 's', scopes: ['read:pets'], onToken }),
      { wrapper: wrapperWith() },
    )

    await act(() => result.current.start())

    expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({ scopes: ['read:pets'] }))
  })

  it('forwards an empty scope selection (request no scopes)', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 't', tokenType: 'Bearer' })
    const onToken = vi.fn()
    const { result } = renderHook(
      () => useClientCredentialsFlow({ flow, clientId: 'c', clientSecret: 's', scopes: [], onToken }),
      { wrapper: wrapperWith() },
    )

    await act(() => result.current.start())

    expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({ scopes: [] }))
  })
})
