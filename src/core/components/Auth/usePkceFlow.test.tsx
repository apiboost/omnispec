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
import { usePkceFlow } from '@core/components/Auth/usePkceFlow'
import { OAUTH_CALLBACK_MESSAGE_TYPE } from '@core/utils/oauth-callback-html'
import { exchangeAuthorizationCode } from '@core/utils/oauth-pkce'
import type { OAuth2Flow } from '@core/types/auth.types'

vi.mock('@core/utils/oauth-pkce', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal()
  return { ...actual, exchangeAuthorizationCode: vi.fn() }
})

const flow: OAuth2Flow = {
  authorizationUrl: 'https://auth.example.com/authorize',
  tokenUrl: 'https://auth.example.com/token',
  scopes: { 'read:pets': 'Read pets' },
}

function wrapperWith(config: Record<string, unknown> = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ConfigProvider config={config}>{children}</ConfigProvider>
  }
}

function renderFlow(options: { clientSecret?: string; config?: Record<string, unknown> } = {}) {
  const onToken = vi.fn()
  const hook = renderHook(
    () => usePkceFlow({ flow, clientId: 'client-1', clientSecret: options.clientSecret, onToken }),
    { wrapper: wrapperWith(options.config) },
  )
  return { ...hook, onToken }
}

function openedUrl(): URL {
  return new URL(vi.mocked(window.open).mock.calls[0][0] as string)
}

function dispatchCallback(data: Record<string, unknown>, origin = window.location.origin) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }))
  })
}

describe('usePkceFlow', () => {
  let popup: { closed: boolean; close: () => void }

  beforeEach(() => {
    popup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    vi.mocked(exchangeAuthorizationCode).mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('opens the authorization popup with PKCE parameters and enters the authorizing state', async () => {
    const { result } = renderFlow()

    await act(() => result.current.start())

    const url = openedUrl()
    expect(`${url.origin}${url.pathname}`).toBe('https://auth.example.com/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('client-1')
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9\-_]{43}$/)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toBe('read:pets')
    expect(url.searchParams.get('state')).toBeTruthy()
    expect(result.current.status).toBe('authorizing')
  })

  it('defaults the redirect_uri to {origin}/oauth2-redirect.html', async () => {
    const { result } = renderFlow()
    await act(() => result.current.start())
    expect(openedUrl().searchParams.get('redirect_uri')).toBe(`${window.location.origin}/oauth2-redirect.html`)
  })

  it('uses the configured oauth.redirectUri', async () => {
    const { result } = renderFlow({ config: { oauth: { redirectUri: '/swagger/oauth2-redirect.html' } } })
    await act(() => result.current.start())
    expect(openedUrl().searchParams.get('redirect_uri')).toBe(`${window.location.origin}/swagger/oauth2-redirect.html`)
  })

  it('omits the PKCE challenge when oauth.usePkce is false', async () => {
    const { result } = renderFlow({ config: { oauth: { usePkce: false } } })
    await act(() => result.current.start())
    const url = openedUrl()
    expect(url.searchParams.has('code_challenge')).toBe(false)
    expect(url.searchParams.has('code_challenge_method')).toBe(false)
    expect(url.searchParams.get('response_type')).toBe('code')
  })

  it('exchanges the code and delivers the token when the callback message matches the state', async () => {
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue({ accessToken: 'tok-1', tokenType: 'Bearer' })
    const { result, onToken } = renderFlow({ config: { proxyUrl: '/api/proxy' } })

    await act(() => result.current.start())
    const state = openedUrl().searchParams.get('state') as string
    dispatchCallback({ type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'code-1', state, error: null, errorDescription: null })

    await waitFor(() => expect(onToken).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'tok-1' })))
    expect(exchangeAuthorizationCode).toHaveBeenCalledWith(expect.objectContaining({
      tokenUrl: 'https://auth.example.com/token',
      code: 'code-1',
      clientId: 'client-1',
      codeVerifier: expect.any(String),
      proxyUrl: '/api/proxy',
    }))
    expect(result.current.status).toBe('idle')
  })

  it('clears the stored verifier from sessionStorage after the exchange', async () => {
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue({ accessToken: 'tok-1', tokenType: 'Bearer' })
    const { result, onToken } = renderFlow()

    await act(() => result.current.start())
    const state = openedUrl().searchParams.get('state') as string
    expect(sessionStorage.getItem(`omnispec:pkce:${state}`)).toBeTruthy()

    dispatchCallback({ type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'code-1', state, error: null, errorDescription: null })
    await waitFor(() => expect(onToken).toHaveBeenCalled())
    expect(sessionStorage.getItem(`omnispec:pkce:${state}`)).toBeNull()
  })

  it('aborts with an error on a state mismatch and never exchanges the code', async () => {
    const { result, onToken } = renderFlow()

    await act(() => result.current.start())
    dispatchCallback({ type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'code-1', state: 'tampered', error: null, errorDescription: null })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatch(/state/i)
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled()
    expect(onToken).not.toHaveBeenCalled()
  })

  it('surfaces provider errors from the callback', async () => {
    const { result } = renderFlow()

    await act(() => result.current.start())
    const state = openedUrl().searchParams.get('state') as string
    dispatchCallback({ type: OAUTH_CALLBACK_MESSAGE_TYPE, code: null, state, error: 'access_denied', errorDescription: 'User cancelled' })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('access_denied')
    expect(result.current.error).toContain('User cancelled')
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled()
  })

  it('ignores callback messages from foreign origins', async () => {
    const { result } = renderFlow()

    await act(() => result.current.start())
    const state = openedUrl().searchParams.get('state') as string
    dispatchCallback(
      { type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'stolen', state, error: null, errorDescription: null },
      'https://evil.example.com',
    )

    expect(result.current.status).toBe('authorizing')
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled()
  })

  it('reports an error when the popup is blocked', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    const { result } = renderFlow()

    await act(() => result.current.start())

    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/popup/i)
  })

  it('reports an error when the exchange fails', async () => {
    vi.mocked(exchangeAuthorizationCode).mockRejectedValue(new Error('Token request failed — invalid_grant'))
    const { result } = renderFlow()

    await act(() => result.current.start())
    const state = openedUrl().searchParams.get('state') as string
    dispatchCallback({ type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'code-1', state, error: null, errorDescription: null })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('invalid_grant')
  })

  it('does not flash a "closed" error when the popup closes while exchanging the code', async () => {
    vi.useFakeTimers()
    let resolveExchange: (v: { accessToken: string; tokenType: string }) => void = () => {}
    vi.mocked(exchangeAuthorizationCode).mockReturnValue(
      new Promise((resolve) => {
        resolveExchange = resolve
      }),
    )
    try {
      const { result, onToken } = renderFlow()
      await act(() => result.current.start())
      const state = openedUrl().searchParams.get('state') as string

      // The callback posts the code (exchange begins), then the popup closes
      // itself and the closed-watcher polls.
      dispatchCallback({ type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'code-1', state, error: null, errorDescription: null })
      popup.closed = true
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      // Having already received the code, the close must not raise an error.
      expect(result.current.status).not.toBe('error')
      expect(result.current.error).toBeUndefined()

      // The exchange resolves and the token is still delivered.
      await act(async () => {
        resolveExchange({ accessToken: 'tok-1', tokenType: 'Bearer' })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(onToken).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'tok-1' }))
      expect(result.current.status).toBe('idle')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports an error when the authorization window is closed before completing', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderFlow()
      await act(() => result.current.start())

      popup.closed = true
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toMatch(/closed/i)
    } finally {
      vi.useRealTimers()
    }
  })

  it('is unsupported outside secure contexts and errors instead of starting', async () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) })
    try {
      const { result } = renderFlow()
      expect(result.current.supported).toBe(false)

      await act(() => result.current.start())
      expect(result.current.status).toBe('error')
      expect(result.current.error).toMatch(/secure context/i)
      expect(window.open).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('includes only the provided scope subset in the authorization URL', async () => {
    const twoScopeFlow: OAuth2Flow = {
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: { 'read:pets': 'Read pets', 'write:pets': 'Write pets' },
    }
    const onToken = vi.fn()
    const { result } = renderHook(
      () => usePkceFlow({ flow: twoScopeFlow, clientId: 'client-1', scopes: ['read:pets'], onToken }),
      { wrapper: wrapperWith() },
    )

    await act(() => result.current.start())

    expect(openedUrl().searchParams.get('scope')).toBe('read:pets')
  })
})
