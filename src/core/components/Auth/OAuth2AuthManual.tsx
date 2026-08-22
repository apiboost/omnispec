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
import { css, cx } from '../../styles/css'
import type { AuthScheme, AppliedAuthValue, OAuth2Flow } from '../../types/auth.types'
import { authStyles } from './ApiKeyAuth'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

interface OAuth2AuthManualProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied: boolean
  appliedValue?: AppliedAuthValue
  /**
   * Currently selected server URL. Carried for parity with {@link OAuth2Auth};
   * the manual shell renders the flow URLs verbatim (no interactive resolution),
   * so it is not used here beyond documenting the contract.
   */
  serverUrl?: string
}

type FlowType = 'authorizationCode' | 'implicit' | 'clientCredentials' | 'password'

const flowLabels: Record<FlowType, string> = {
  authorizationCode: 'Authorization Code',
  implicit: 'Implicit',
  clientCredentials: 'Client Credentials',
  password: 'Resource Owner Password',
}

const flowSelectorStyle = css({
  display: 'flex',
  gap: '4px',
  marginBottom: '.5rem',
})

const flowTabStyle = css({
  padding: '4px 10px',
  background: 'var(--omnispec-bg-tertiary)',
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: 'var(--omnispec-border-radius)',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  '&:hover': {
    borderColor: 'var(--omnispec-color-primary)',
  },
})

const activeFlowTabStyle = css({
  backgroundColor: 'var(--omnispec-color-primary)',
  color: 'var(--omnispec-color-primary-text)',
  borderColor: 'var(--omnispec-color-primary)',
})

const flowDetailsStyle = css({
  marginBottom: '0.5rem',
})

const urlRowStyle = css({
  display: 'flex',
  gap: '0.5rem',
  fontSize: 'var(--omnispec-font-size-sm)',
  marginBottom: '0.25rem',
})

const urlLabelStyle = css({
  color: 'var(--omnispec-fg-muted)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  marginBottom: '.5rem',
  display: 'inline-block',
})

const urlValueStyle = css({
  color: 'var(--omnispec-fg-secondary)',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  wordBreak: 'break-all',
})

const scopesStyle = css({
  marginTop: '0.5rem',
  fontSize: 'var(--omnispec-font-size-sm)',
})

const scopeListStyle = css({
  marginTop: '0.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
})

const scopeItemStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
})

const scopeNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-secondary)',
})

const scopeDescStyle = css({
  color: 'var(--omnispec-fg-muted)',
})

const tokenSectionStyle = css({
  marginTop: '8px',
})

const flowErrorStyle = css({
  marginTop: '8px',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-error)',
})

/**
 * Manual (non-interactive) OAuth 2.0 authorize shell. Renders read-only flow
 * details — authorization / token / refresh URLs and the declared scopes for
 * each flow — plus a manual access-token entry with Apply / Remove.
 *
 * This is the Free-tier surface: there is no Get Token, no PKCE, no
 * client id/secret, no scope selection and no flow-variable inputs. The only
 * way to authorize is by pasting a token, which is applied verbatim as a
 * `Bearer` credential. The interactive counterpart lives in
 * {@link OAuth2Auth} (Pro-gated).
 */
export function OAuth2AuthManual({ scheme, onApply, onRemove, applied, appliedValue }: OAuth2AuthManualProps) {
  const flows = scheme.flows
  const availableFlows = flows ? (Object.entries(flows).filter(([, v]) => v) as [FlowType, OAuth2Flow][]) : []
  const [activeFlow, setActiveFlow] = useState<FlowType>(availableFlows[0]?.[0] ?? 'authorizationCode')
  const [token, setToken] = useState(appliedValue?.input?.token ?? '')
  const [applyError, setApplyError] = useState<string | undefined>(undefined)

  const currentFlow = flows?.[activeFlow]

  const handleTokenChange = (value: string) => {
    setToken(value)
    if (applyError) setApplyError(undefined)
  }

  const handleApplyToken = () => {
    if (!token.trim()) {
      setApplyError('Enter an access token to apply.')
      return
    }
    setApplyError(undefined)
    onApply({
      schemeId: scheme.id,
      headerName: 'Authorization',
      headerValue: `Bearer ${token}`,
      input: { token },
    })
  }

  const handleRemove = () => {
    // Clear the access token field so removing the auth also empties the input.
    setToken('')
    setApplyError(undefined)
    onRemove(scheme.id)
  }

  return (
    <div className={authStyles.section}>
      <div className={authStyles.label}>
        {scheme.displayName}
        <span className={authStyles.hint}>(OAuth 2.0)</span>
      </div>
      {scheme.description && (
        <MarkdownRenderer content={scheme.description} className={authStyles.description} />
      )}

      {availableFlows.length > 1 && (
        <div className={flowSelectorStyle}>
          {availableFlows.map(([key]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFlow(key)}
              className={cx(flowTabStyle, key === activeFlow && activeFlowTabStyle)}
            >
              {flowLabels[key]}
            </button>
          ))}
        </div>
      )}

      {currentFlow && (
        <div className={flowDetailsStyle}>
          {currentFlow.authorizationUrl && (
            <div className={urlRowStyle}>
              <span className={urlLabelStyle}>Auth URL:</span>
              <code className={urlValueStyle}>{currentFlow.authorizationUrl}</code>
            </div>
          )}
          {currentFlow.tokenUrl && (
            <div className={urlRowStyle}>
              <span className={urlLabelStyle}>Token URL:</span>
              <code className={urlValueStyle}>{currentFlow.tokenUrl}</code>
            </div>
          )}
          {currentFlow.refreshUrl && (
            <div className={urlRowStyle}>
              <span className={urlLabelStyle}>Refresh URL:</span>
              <code className={urlValueStyle}>{currentFlow.refreshUrl}</code>
            </div>
          )}
          {currentFlow.scopes && Object.keys(currentFlow.scopes).length > 0 && (
            <div className={scopesStyle}>
              <span className={urlLabelStyle}>Scopes:</span>
              <div className={scopeListStyle}>
                {Object.entries(currentFlow.scopes).map(([scope, desc]) => (
                  <div key={scope} className={scopeItemStyle}>
                    <code className={scopeNameStyle}>{scope}</code>
                    {desc && <span className={scopeDescStyle}> &mdash; {desc}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={tokenSectionStyle}>
        <div className={authStyles.label}>
          <span className={authStyles.hint}>Enter access token:</span>
        </div>
        <div className={authStyles.inputRow}>
          <SecretInput
            value={token}
            onChange={handleTokenChange}
            placeholder="Access token"
            className={authStyles.input}
            aria-label={`${scheme.displayName} access token`}
          />
          {applied ? (
            <button type="button" onClick={handleRemove} className={authStyles.removeBtn}>
              Remove
            </button>
          ) : (
            <button type="button" onClick={handleApplyToken} className={authStyles.applyBtn}>
              Apply
            </button>
          )}
        </div>
        {applyError && <p role="alert" className={flowErrorStyle}>{applyError}</p>}
      </div>
    </div>
  )
}
