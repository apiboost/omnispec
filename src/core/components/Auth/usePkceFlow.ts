/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useConfig } from '@core/context/ConfigContext'
import { OAUTH_CALLBACK_MESSAGE_TYPE } from '@core/utils/oauth-callback-html'
import type { OAuthCallbackMessage } from '@core/utils/oauth-callback-html'
import {
  buildAuthorizationUrl,
  computeCodeChallenge,
  exchangeAuthorizationCode,
  generateCodeVerifier,
  generateState,
  isPkceSupported,
  resolveRedirectUri,
} from '@core/utils/oauth-pkce'
import type { OAuthTokenResponse } from '@core/utils/oauth-pkce'
import type { ClientAuthMethod, OAuth2Flow } from '@core/types/auth.types'

export type PkceFlowStatus = 'idle' | 'authorizing' | 'exchanging' | 'error'

export interface UsePkceFlowOptions {
  flow?: OAuth2Flow
  clientId: string
  clientSecret?: string
  /** Scopes to request. Defaults to every scope the flow declares. An empty array requests none. */
  scopes?: string[]
  /**
   * Token-endpoint client-authentication method (RFC 6749 §2.3.1) for
   * confidential clients (when a client secret is supplied). Defaults to `'header'`.
   */
  clientAuth?: ClientAuthMethod
  onToken: (token: OAuthTokenResponse) => void
}

export interface PkceFlowState {
  status: PkceFlowStatus
  error?: string
  /** Whether the WebCrypto APIs required for PKCE are available (secure contexts only). */
  supported: boolean
  /** Opens the authorization popup and drives the flow to a token. */
  start: () => Promise<void>
}

const STORAGE_PREFIX = 'omnispec:pkce:'
const POPUP_FEATURES = 'width=600,height=700,menubar=no,toolbar=no'
const POPUP_POLL_MS = 500

interface PendingAuthorization {
  state: string
  verifier: string
  redirectUri: string
  popup: Window
}

/**
 * Drives the OAuth 2.0 Authorization Code + PKCE flow for the Try-It
 * Authorize panel: opens the provider's consent page in a popup, receives the
 * authorization code back from the same-origin callback page via an
 * origin-checked postMessage, validates the CSRF state, and exchanges the
 * code (with the PKCE verifier) for an access token.
 */
export function usePkceFlow({ flow, clientId, clientSecret, scopes, clientAuth, onToken }: UsePkceFlowOptions): PkceFlowState {
  const { oauth, proxyUrl, proxyHeaders } = useConfig()
  const [status, setStatus] = useState<PkceFlowStatus>('idle')
  const [error, setError] = useState<string | undefined>(undefined)
  const pendingRef = useRef<PendingAuthorization | null>(null)
  const popupWatchRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supported = isPkceSupported()

  const finishPending = useCallback(() => {
    const pending = pendingRef.current
    if (pending) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${pending.state}`)
      pendingRef.current = null
    }
    if (popupWatchRef.current) {
      clearInterval(popupWatchRef.current)
      popupWatchRef.current = null
    }
  }, [])

  const fail = useCallback((message: string) => {
    finishPending()
    setError(message)
    setStatus('error')
  }, [finishPending])

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const pending = pendingRef.current
      if (!pending) return
      // The callback page always posts from our own origin — anything else is untrusted.
      if (event.origin !== window.location.origin) return
      const data = event.data as Partial<OAuthCallbackMessage> | null
      if (!data || data.type !== OAUTH_CALLBACK_MESSAGE_TYPE) return

      // The authorization response has arrived; the callback page closes the
      // popup right after posting it. Stop the closed-watcher now so that
      // expected close doesn't race the exchange into a spurious
      // "window was closed before completing" error.
      if (popupWatchRef.current) {
        clearInterval(popupWatchRef.current)
        popupWatchRef.current = null
      }

      if (data.error) {
        fail(data.errorDescription ? `${data.error}: ${data.errorDescription}` : data.error)
        return
      }
      if (data.state !== pending.state) {
        fail('Authorization response state did not match — the flow was aborted.')
        return
      }
      if (!data.code) {
        fail('Authorization response did not include a code.')
        return
      }

      setStatus('exchanging')
      try {
        const token = await exchangeAuthorizationCode({
          tokenUrl: flow?.tokenUrl as string,
          code: data.code,
          redirectUri: pending.redirectUri,
          clientId,
          codeVerifier: pending.verifier || undefined,
          clientSecret: clientSecret || undefined,
          clientAuth,
          proxyUrl,
          proxyHeaders,
        })
        finishPending()
        setError(undefined)
        setStatus('idle')
        onToken(token)
      } catch (exchangeError) {
        fail(exchangeError instanceof Error ? exchangeError.message : 'Token exchange failed.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      finishPending()
    }
  }, [flow?.tokenUrl, clientId, clientSecret, clientAuth, proxyUrl, proxyHeaders, onToken, fail, finishPending])

  const start = useCallback(async () => {
    if (!supported) {
      fail('PKCE authorization requires a secure context (HTTPS or localhost).')
      return
    }
    if (!flow?.authorizationUrl || !flow.tokenUrl) {
      fail('This flow does not declare both an authorization URL and a token URL.')
      return
    }

    const usePkce = oauth?.usePkce !== false
    const verifier = usePkce ? generateCodeVerifier() : ''
    const state = generateState()
    const challenge = usePkce ? await computeCodeChallenge(verifier) : undefined
    const redirectUri = resolveRedirectUri(oauth?.redirectUri)

    const authorizationUrl = buildAuthorizationUrl({
      authorizationUrl: flow.authorizationUrl,
      clientId,
      redirectUri,
      state,
      codeChallenge: challenge,
      scopes: scopes ?? Object.keys(flow.scopes ?? {}),
    })

    const popup = window.open(authorizationUrl, 'omnispec-oauth', POPUP_FEATURES)
    if (!popup) {
      fail('The authorization popup was blocked. Allow popups for this site and try again.')
      return
    }

    sessionStorage.setItem(`${STORAGE_PREFIX}${state}`, verifier)
    pendingRef.current = { state, verifier, redirectUri, popup }
    setError(undefined)
    setStatus('authorizing')

    popupWatchRef.current = setInterval(() => {
      if (pendingRef.current?.popup.closed) {
        fail('The authorization window was closed before completing.')
      }
    }, POPUP_POLL_MS)
  }, [supported, flow, clientId, scopes, oauth?.redirectUri, fail])

  return { status, error, supported, start }
}
