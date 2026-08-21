/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useState } from 'react'
import { useConfig } from '@core/context/ConfigContext'
import { exchangeClientCredentials } from '@core/utils/oauth-pkce'
import type { OAuthTokenResponse } from '@core/utils/oauth-pkce'
import type { ClientAuthMethod, OAuth2Flow } from '@core/types/auth.types'

export type ClientCredentialsFlowStatus = 'idle' | 'exchanging' | 'error'

export interface UseClientCredentialsFlowOptions {
  flow?: OAuth2Flow
  clientId: string
  clientSecret: string
  /** Scopes to request. Defaults to every scope the flow declares. An empty array requests none. */
  scopes?: string[]
  /** Token-endpoint client-authentication method (RFC 6749 §2.3.1). Defaults to `'header'`. */
  clientAuth?: ClientAuthMethod
  onToken: (token: OAuthTokenResponse) => void
}

export interface ClientCredentialsFlowState {
  status: ClientCredentialsFlowStatus
  error?: string
  /** Performs the client-credentials exchange and applies the resulting token. */
  start: () => Promise<void>
}

/**
 * Drives the OAuth 2.0 Client Credentials grant for the Try-It Authorize
 * panel: a direct (no user login) token request using the client id/secret,
 * routed through the Try-It proxy when one is configured.
 */
export function useClientCredentialsFlow({
  flow,
  clientId,
  clientSecret,
  scopes,
  clientAuth,
  onToken,
}: UseClientCredentialsFlowOptions): ClientCredentialsFlowState {
  const { proxyUrl, proxyHeaders } = useConfig()
  const [status, setStatus] = useState<ClientCredentialsFlowStatus>('idle')
  const [error, setError] = useState<string | undefined>(undefined)

  const start = useCallback(async () => {
    if (!flow?.tokenUrl) {
      setError('This flow does not declare a token URL.')
      setStatus('error')
      return
    }

    setError(undefined)
    setStatus('exchanging')
    try {
      const token = await exchangeClientCredentials({
        tokenUrl: flow.tokenUrl,
        clientId,
        clientSecret,
        scopes: scopes ?? Object.keys(flow.scopes ?? {}),
        clientAuth,
        proxyUrl,
        proxyHeaders,
      })
      setStatus('idle')
      onToken(token)
    } catch (exchangeError) {
      setError(exchangeError instanceof Error ? exchangeError.message : 'Token request failed.')
      setStatus('error')
    }
  }, [flow?.tokenUrl, flow?.scopes, scopes, clientId, clientSecret, clientAuth, proxyUrl, proxyHeaders, onToken])

  return { status, error, start }
}
