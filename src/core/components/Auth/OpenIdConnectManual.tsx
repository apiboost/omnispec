/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState } from 'react'
import { css } from '../../styles/css'
import type { AuthScheme, AppliedAuthValue } from '../../types/auth.types'
import { authStyles } from './ApiKeyAuth'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

interface OpenIdConnectManualProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied: boolean
  appliedValue?: AppliedAuthValue
  /**
   * Selected server URL. Accepted for parity with the discovery-backed
   * OpenIdConnectAuth, but this free shell performs no network resolution.
   */
  serverUrl?: string
}

const errorStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-error)',
  margin: '4px 0 8px',
})

const urlRowStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  margin: '4px 0 8px',
  wordBreak: 'break-all',
})

const urlLinkStyle = css({
  color: 'var(--omnispec-color-primary)',
})

/**
 * OpenID Connect manual shell (`openIdConnect` security scheme, free tier).
 * Shows only what the spec declares — the scheme `description` and its
 * `openIdConnectUrl` (as a link) — plus a manual access-token paste. It performs
 * NO discovery fetch: runtime discovery of the OpenID configuration is a Pro
 * feature (see OpenIdConnectAuth). The free experience is spec data + manual
 * token entry, which never touches the network.
 */
export function OpenIdConnectManual({
  scheme,
  onApply,
  onRemove,
  applied,
  appliedValue,
}: OpenIdConnectManualProps) {
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
    <div className={authStyles.section}>
      <div className={authStyles.label}>
        {scheme.displayName}
        <span className={authStyles.hint}>(OpenID Connect)</span>
      </div>
      {scheme.description && (
        <MarkdownRenderer content={scheme.description} className={authStyles.description} />
      )}
      {scheme.openIdConnectUrl && (
        <p className={urlRowStyle}>
          Discovery URL:{' '}
          <a
            className={urlLinkStyle}
            href={scheme.openIdConnectUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {scheme.openIdConnectUrl}
          </a>
        </p>
      )}
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
        <p role="alert" className={errorStyle}>
          {error}
        </p>
      )}
    </div>
  )
}
