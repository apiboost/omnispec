/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect, useState } from 'react'
import { css } from '../../styles/css'
import type { AuthScheme, AppliedAuthValue } from '../../types/auth.types'
import { useConfig } from '@core/context/ConfigContext'
import { resolveFlowUrl } from '@core/utils/oauth-pkce'
import { discoverOpenIdConfiguration, mapOpenIdConfigToFlows } from '@core/utils/oidc-discovery'
import { OAuth2Auth } from './OAuth2Auth'
import { authStyles } from './ApiKeyAuth'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

interface OpenIdConnectAuthProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied?: boolean
  appliedValue?: AppliedAuthValue
  /**
   * Selected server URL. Used to resolve a relative `openIdConnectUrl` before
   * discovery, and forwarded to OAuth2Auth so relative flow URLs resolve too.
   */
  serverUrl?: string
}

type DiscoveryState =
  | { status: 'loading' }
  | { status: 'ready'; scheme: AuthScheme }
  | { status: 'error'; message: string }

const discoveryStatusStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  margin: '4px 0 8px',
})

const discoveryErrorStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-error)',
  margin: '4px 0 8px',
})

/**
 * OpenID Connect (`openIdConnect` security scheme). Fetches the OpenID
 * configuration from the scheme's `openIdConnectUrl`, maps the discovered
 * `authorization_endpoint` / `token_endpoint` / `scopes_supported` into the
 * OAuth2 flow model, and hands off to {@link OAuth2Auth} so the Authorize panel
 * renders identically to a declared `oauth2` scheme (Authorization Code + PKCE,
 * with `openid` requested by default). If discovery fails — malformed doc,
 * unreachable IdP, disallowed origin — it degrades to a themed error and manual
 * access-token paste, which never breaks the UI. See ABOSPEC-215.
 */
export function OpenIdConnectAuth(props: OpenIdConnectAuthProps) {
  const { scheme, serverUrl } = props
  const { proxyUrl, proxyHeaders } = useConfig()
  const [state, setState] = useState<DiscoveryState>({ status: 'loading' })

  // Resolve a relative `openIdConnectUrl` against the selected server before
  // discovery — the same treatment oauth2 flow URLs get (OAuth2Auth via
  // resolveFlowUrl). An absolute discovery URL is returned unchanged, so a spec
  // that points at a central/third-party IdP keeps working. This runs before
  // the allow-list check and fetch so a same-origin relative URL passes both.
  const discoveryUrl = scheme.openIdConnectUrl
    ? resolveFlowUrl(scheme.openIdConnectUrl, serverUrl)
    : undefined

  useEffect(() => {
    if (!discoveryUrl) {
      setState({ status: 'error', message: 'This scheme has no OpenID Connect discovery URL.' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })
    discoverOpenIdConfiguration(discoveryUrl, { proxyUrl, proxyHeaders })
      .then((config) => {
        if (cancelled) return
        // Present the discovered flows through the OAuth2 renderer by handing it
        // an oauth2-typed scheme; the id/description/label carry over unchanged.
        setState({
          status: 'ready',
          scheme: {
            ...scheme,
            type: 'oauth2',
            flows: mapOpenIdConfigToFlows(config),
          },
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'OpenID Connect discovery failed.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [discoveryUrl, proxyUrl, proxyHeaders, scheme])

  if (state.status === 'ready') {
    // Discovered flows render exactly like a declared oauth2 scheme.
    return <OAuth2Auth {...props} scheme={state.scheme} />
  }

  // Loading and error both fall back to the manual-token section so the panel
  // is always usable (manual paste is available on both tiers).
  return (
    <div className={authStyles.section}>
      <div className={authStyles.label}>
        {scheme.displayName}
        <span className={authStyles.hint}>(OpenID Connect)</span>
      </div>
      {scheme.description && (
        <MarkdownRenderer content={scheme.description} className={authStyles.description} />
      )}
      {state.status === 'loading' ? (
        <p className={discoveryStatusStyle} role="status">
          Discovering OpenID configuration…
        </p>
      ) : (
        <p className={discoveryErrorStyle} role="alert">
          {state.message} Enter an access token manually to continue.
        </p>
      )}
      <ManualTokenEntry {...props} />
    </div>
  )
}

/**
 * Manual access-token entry — the graceful fallback when discovery fails (and
 * available on both tiers). Mirrors the manual-token section of OAuth2Auth.
 */
function ManualTokenEntry({ scheme, onApply, onRemove, applied, appliedValue }: OpenIdConnectAuthProps) {
  const [token, setToken] = useState(appliedValue?.input?.token ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  const handleApply = () => {
    if (!token.trim()) {
      setError('Enter an access token to apply.')
      return
    }
    setError(undefined)
    onApply({
      schemeId: scheme.id,
      headerName: 'Authorization',
      headerValue: `Bearer ${token}`,
      input: { token },
    })
  }

  const handleRemove = () => {
    setToken('')
    setError(undefined)
    onRemove(scheme.id)
  }

  return (
    <div>
      <div className={authStyles.label}>
        <span className={authStyles.hint}>Enter access token directly:</span>
      </div>
      <div className={authStyles.inputRow}>
        <SecretInput
          value={token}
          onChange={(value) => {
            setToken(value)
            if (error) setError(undefined)
          }}
          placeholder="Access token"
          className={authStyles.input}
          aria-label={`${scheme.displayName} access token`}
        />
        {applied ? (
          <button type="button" onClick={handleRemove} className={authStyles.removeBtn}>
            Remove
          </button>
        ) : (
          <button type="button" onClick={handleApply} className={authStyles.applyBtn}>
            Apply
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={discoveryErrorStyle}>
          {error}
        </p>
      )}
    </div>
  )
}
