/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { css, cx } from '../../styles/css'
import { Icon } from '@core/components/common/Icon'
import type { AuthScheme, AppliedAuthValue, ClientAuthMethod, OAuth2Flow } from '../../types/auth.types'
import { resolveFlowUrl, substituteFlowVariables } from '@core/utils/oauth-pkce'
import type { OAuthTokenResponse } from '@core/utils/oauth-pkce'
import { useConfig } from '@core/context/ConfigContext'
import { usePkceFlow } from '@core/components/Auth/usePkceFlow'
import { useClientCredentialsFlow } from '@core/components/Auth/useClientCredentialsFlow'
import { authStyles } from './ApiKeyAuth'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

interface OAuth2AuthProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied?: boolean
  appliedValue?: AppliedAuthValue
  /**
   * Currently selected server URL. Relative OAuth flow URLs
   * (tokenUrl/authorizationUrl/refreshUrl) resolve against it so the token
   * endpoint follows the server dropdown across environments. See ABOSPEC-220.
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
  // No horizontal inset — the flow labels align flush-left with the section
  // label and the credential fields below.
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

// Flow-URL variable inputs (the `x-flowVariables` extension — ABOSPEC-221).
// Mirrors the server-variable input pattern from ServerSelector: a <select>
// when the variable declares an `enum`, else a free-text input. Sits with the
// flow details, just under the Token URL, so it reads as a modifier of the URLs.
const flowVariablesStyle = css({
  marginTop: '0.5rem',
  marginBottom: '0.825rem',
})

const flowVarRowStyle = css({
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  flexDirection: 'column',
})

const flowVarLabelStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  fontWeight: 600,
  minWidth: '5rem',
})

const flowVarInputStyle = css({
  flex: 1,
  minWidth: 0,
  padding: '0.25rem 0.5rem',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  '&:focus': {
    borderColor: 'var(--omnispec-color-primary)',
    outline: 'none',
  },
})

const flowVarDescStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
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

const scopeCheckboxLabelStyle = css({
  display: 'inline-flex',
  gap: '0.375rem',
  cursor: 'pointer',
})

const scopeDescStyle = css({
  color: 'var(--omnispec-fg-muted)',
})

// Native <select> for the token-endpoint client-authentication method
// (RFC 6749 §2.3.1), mirroring RapiDoc's "Send client authentication in"
// control. Sits directly under the Client Secret input so it reads as a
// modifier of that credential. Styled to match the adjacent auth inputs.
const clientAuthFieldStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
})

const clientAuthLabelStyle = css({
  color: 'var(--omnispec-fg-muted)',
  fontWeight: 600,
  fontSize: 'var(--omnispec-font-size-sm)',
})

const clientAuthSelectStyle = css({
  padding: '6px 10px',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  cursor: 'pointer',
  '&:focus': {
    borderColor: 'var(--omnispec-color-primary)',
    outline: 'none',
  },
  '&:hover': {
    borderColor: 'var(--omnispec-color-primary)',
  },
})

const credentialsColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '8px',
})

const tokenSectionStyle = css({
  marginTop: '8px',
})

// Hairline separating the interactive/config area (flow details, Get Token)
// from the manual access-token entry below it.
const tokenDividerStyle = css({
  height: '1px',
  backgroundColor: 'var(--omnispec-border-color)',
  opacity: 0.6,
  margin: '0.75rem 0 0.25rem',
})

const flowErrorStyle = css({
  marginTop: '8px',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-error)',
})

const pkceFlowLabels: Record<string, string> = {
  authorizing: 'Waiting for authorization…',
  exchanging: 'Exchanging code…',
}

const buttonRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
})

const tokenSuccessStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-success)',
})

/** Transient "Token received" confirmation shown beside Get Token. */
function TokenReceived() {
  return (
    <span role="status" className={tokenSuccessStyle}>
      <Icon name="check" size="1rem" /> Token received
    </span>
  )
}

export function OAuth2Auth({ scheme, onApply, onRemove, applied, appliedValue, serverUrl }: OAuth2AuthProps) {
  const flows = scheme.flows
  const availableFlows = flows ? Object.entries(flows).filter(([, v]) => v) as [FlowType, OAuth2Flow][] : []
  const [activeFlow, setActiveFlow] = useState<FlowType>(availableFlows[0]?.[0] ?? 'authorizationCode')
  const [token, setToken] = useState(appliedValue?.input?.token ?? '')
  const [clientId, setClientId] = useState(appliedValue?.input?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState(appliedValue?.input?.clientSecret ?? '')
  const [applyError, setApplyError] = useState<string | undefined>(undefined)
  // Per-flow scope selection. An absent entry means "all declared scopes"
  // (the default), so a fresh render requests everything as before. Restored
  // from the applied value so a customized selection survives closing and
  // reopening the Authorize panel, the same way credentials do.
  const [scopeSelection, setScopeSelection] = useState<Record<string, string[]>>(() => {
    try {
      const raw = appliedValue?.input?.scopeSelection
      return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
    } catch {
      return {}
    }
  })
  // Per-flow OAuth-URL variable values (the `x-flowVariables` extension —
  // ABOSPEC-221). An absent entry for a variable means "use its declared
  // default". Serialized into the applied input and re-hydrated on reopen, the
  // same way scopeSelection and clientAuth are, so a chosen environment /
  // tenant survives closing and reopening the Authorize panel.
  const [flowVariables, setFlowVariables] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const raw = appliedValue?.input?.flowVariables
      return raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {}
    } catch {
      return {}
    }
  })

  // Effective value for each of a flow's `x-flowVariables`: the user's chosen
  // value, else the variable's declared default. Absent extension → {}.
  const varsForFlow = useCallback((flowType: string): Record<string, string> => {
    const declared = flows?.[flowType as FlowType]?.variables
    if (!declared) return {}
    const chosen = flowVariables[flowType] ?? {}
    const out: Record<string, string> = {}
    for (const [name, variable] of Object.entries(declared)) {
      out[name] = chosen[name] ?? variable.default
    }
    return out
  }, [flows, flowVariables])

  // Resolve each flow's URLs: first substitute its `x-flowVariables` into the
  // `{name}` placeholders (ABOSPEC-221), then resolve any relative URL against
  // the selected server so it follows the environment (ABOSPEC-220). Absolute
  // URLs are left untouched by the resolve step. Substitution runs *before*
  // resolution so the two compose (e.g. a relative `/{tenant}/token`).
  const resolvedFlows = useMemo(() => {
    if (!flows) return flows
    const substituteAndResolve = (url: string, vars: Record<string, string>) =>
      resolveFlowUrl(substituteFlowVariables(url, vars), serverUrl)
    const out: Record<string, OAuth2Flow> = {}
    for (const [name, flow] of Object.entries(flows)) {
      if (!flow) continue
      const vars = varsForFlow(name)
      out[name] = {
        ...flow,
        ...(flow.tokenUrl ? { tokenUrl: substituteAndResolve(flow.tokenUrl, vars) } : {}),
        ...(flow.authorizationUrl ? { authorizationUrl: substituteAndResolve(flow.authorizationUrl, vars) } : {}),
        ...(flow.refreshUrl ? { refreshUrl: substituteAndResolve(flow.refreshUrl, vars) } : {}),
      }
    }
    return out as typeof flows
  }, [flows, serverUrl, varsForFlow])

  // Token-endpoint client-authentication method (RFC 6749 §2.3.1). Precedence
  // (highest first): a value persisted in the applied input (survives close /
  // reopen, mirroring scopeSelection) → the `x-tokenEndpointAuthMethod`
  // extension default on the scheme → `'header'` (Authorization Header).
  const [clientAuth, setClientAuth] = useState<ClientAuthMethod>(() => {
    const persisted = appliedValue?.input?.clientAuth
    if (persisted === 'header' || persisted === 'body') return persisted
    return scheme.tokenEndpointAuthMethod ?? 'header'
  })

  const currentFlow = resolvedFlows?.[activeFlow]
  // Variable declarations come off the raw flow (unsubstituted); the labels /
  // enums / defaults render the inputs, whose values feed back into the URLs.
  const currentFlowVariables = flows?.[activeFlow]?.variables
  const clientAuthSelectId = `${scheme.id}-client-auth`

  const scopesForFlow = (flowType: FlowType): string[] =>
    scopeSelection[flowType] ?? Object.keys(flows?.[flowType]?.scopes ?? {})

  // Brief "Token received" confirmation next to Get Token — makes it obvious a
  // fresh token was fetched, e.g. after changing scopes and re-requesting.
  const [tokenSuccess, setTokenSuccess] = useState(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
  }, [])
  const flashTokenSuccess = useCallback(() => {
    setTokenSuccess(true)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setTokenSuccess(false), 3000)
  }, [])

  const handlePkceToken = useCallback((tokenResponse: OAuthTokenResponse) => {
    setToken(tokenResponse.accessToken)
    onApply({
      schemeId: scheme.id,
      headerName: 'Authorization',
      headerValue: `Bearer ${tokenResponse.accessToken}`,
      input: {
        token: tokenResponse.accessToken,
        clientId,
        clientSecret,
        scopeSelection: JSON.stringify(scopeSelection),
        clientAuth,
        flowVariables: JSON.stringify(flowVariables),
      },
    })
    flashTokenSuccess()
  }, [scheme.id, clientId, clientSecret, scopeSelection, clientAuth, flowVariables, onApply, flashTokenSuccess])

  const pkce = usePkceFlow({
    flow: resolvedFlows?.authorizationCode,
    clientId,
    clientSecret,
    scopes: scopesForFlow('authorizationCode'),
    clientAuth,
    onToken: handlePkceToken,
  })
  const pkceInProgress = pkce.status === 'authorizing' || pkce.status === 'exchanging'

  const clientCreds = useClientCredentialsFlow({
    flow: resolvedFlows?.clientCredentials,
    clientId,
    clientSecret,
    scopes: scopesForFlow('clientCredentials'),
    clientAuth,
    onToken: handlePkceToken,
  })

  // Pro-gated: Free renders the flow details and manual token paste only.
  const { interactiveOAuthEnabled } = useConfig()
  // Authorization Code needs both endpoints (it redirects the user to log in).
  const canRunPkceFlow = interactiveOAuthEnabled
    && activeFlow === 'authorizationCode'
    && Boolean(currentFlow?.authorizationUrl && currentFlow?.tokenUrl)
  // Client Credentials is a direct id/secret exchange — only a token URL.
  const canRunClientCreds = interactiveOAuthEnabled
    && activeFlow === 'clientCredentials'
    && Boolean(currentFlow?.tokenUrl)
  const clientCredsInProgress = clientCreds.status === 'exchanging'

  // Scopes become selectable checkboxes only where an interactive Get Token
  // runs; otherwise (Free tier, other flows) they render read-only.
  const scopesSelectable = canRunPkceFlow || canRunClientCreds
  const selectedScopes = scopesForFlow(activeFlow)
  const toggleScope = (scope: string) => {
    setScopeSelection((prev) => {
      const current = prev[activeFlow] ?? Object.keys(currentFlow?.scopes ?? {})
      const next = current.includes(scope)
        ? current.filter((s) => s !== scope)
        : [...current, scope]
      return { ...prev, [activeFlow]: next }
    })
  }

  const handleFlowVariableChange = (name: string, value: string) => {
    setFlowVariables((prev) => ({
      ...prev,
      [activeFlow]: { ...prev[activeFlow], [name]: value },
    }))
  }

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
      input: {
        token, clientId, clientSecret,
        scopeSelection: JSON.stringify(scopeSelection),
        clientAuth,
        flowVariables: JSON.stringify(flowVariables),
      },
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
          {currentFlowVariables && Object.keys(currentFlowVariables).length > 0 && (
            <div className={flowVariablesStyle}>
              {Object.entries(currentFlowVariables).map(([name, variable]) => {
                const inputId = `${scheme.id}-${activeFlow}-var-${name}`
                const value = flowVariables[activeFlow]?.[name] ?? variable.default
                return (
                  <div key={name} className={flowVarRowStyle}>
                    <label className={flowVarLabelStyle} htmlFor={inputId}>{name}</label>
                    {variable.enum ? (
                      <select
                        id={inputId}
                        value={value}
                        onChange={(e) => handleFlowVariableChange(name, e.target.value)}
                        className={flowVarInputStyle}
                      >
                        {variable.enum.map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={inputId}
                        type="text"
                        value={value}
                        onChange={(e) => handleFlowVariableChange(name, e.target.value)}
                        className={flowVarInputStyle}
                      />
                    )}
                    {variable.description && (
                      <span className={flowVarDescStyle}>{variable.description}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {currentFlow.scopes && Object.keys(currentFlow.scopes).length > 0 && (
            <div className={scopesStyle}>
              <span className={urlLabelStyle}>Scopes:</span>
              <div className={scopeListStyle}>
                {Object.entries(currentFlow.scopes).map(([scope, desc]) => (
                  <div key={scope} className={scopeItemStyle}>
                    {scopesSelectable ? (
                      <label className={scopeCheckboxLabelStyle}>
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                        />
                        <code className={scopeNameStyle}>{scope}</code>
                        {desc && <span className={scopeDescStyle}> &mdash; {desc}</span>}
                      </label>
                    ) : (
                      <>
                        <code className={scopeNameStyle}>{scope}</code>
                        {desc && <span className={scopeDescStyle}> &mdash; {desc}</span>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client ID/Secret exist only to obtain a token interactively, so they
          render only when interactive OAuth is enabled (Pro). On Free the only
          way to authorize is the manual access-token paste below. */}
      {interactiveOAuthEnabled
        && (activeFlow === 'clientCredentials' || activeFlow === 'authorizationCode') && (
        <div className={credentialsColumnStyle}>
          <div className={clientAuthFieldStyle}>
            <label className={clientAuthLabelStyle} htmlFor={clientAuthSelectId}>
              Send client authentication in
            </label>
            <select
              id={clientAuthSelectId}
              className={clientAuthSelectStyle}
              value={clientAuth}
              onChange={(e) => setClientAuth(e.target.value as ClientAuthMethod)}
            >
              <option value="header">Authorization Header</option>
              <option value="body">Request Body</option>
            </select>
          </div>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
            className={authStyles.input}
          />
          <SecretInput
            value={clientSecret}
            onChange={setClientSecret}
            placeholder={activeFlow === 'clientCredentials' ? 'Client Secret' : 'Client Secret (optional)'}
            className={authStyles.input}
            aria-label={`${scheme.displayName} client secret`}
          />
          {canRunPkceFlow && (
            <div>
              <div className={buttonRowStyle}>
                <button
                  type="button"
                  onClick={() => {
                    setTokenSuccess(false); void pkce.start()
                  }}
                  disabled={!clientId.trim() || pkceInProgress}
                  className={authStyles.applyBtn}
                >
                  {pkceFlowLabels[pkce.status] ?? 'Get Token'}
                </button>
                {tokenSuccess && <TokenReceived />}
              </div>
              {pkce.status === 'error' && pkce.error && (
                <p role="alert" className={flowErrorStyle}>{pkce.error}</p>
              )}
            </div>
          )}
          {canRunClientCreds && (
            <div>
              <div className={buttonRowStyle}>
                <button
                  type="button"
                  onClick={() => {
                    setTokenSuccess(false); void clientCreds.start()
                  }}
                  disabled={!clientId.trim() || !clientSecret.trim() || clientCredsInProgress}
                  className={authStyles.applyBtn}
                >
                  {clientCredsInProgress ? 'Requesting token…' : 'Get Token'}
                </button>
                {tokenSuccess && <TokenReceived />}
              </div>
              {clientCreds.status === 'error' && clientCreds.error && (
                <p role="alert" className={flowErrorStyle}>{clientCreds.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* The divider separates the interactive credential/Get-Token area from
          the manual paste field, so it only appears when that area is shown. */}
      {interactiveOAuthEnabled
        && (activeFlow === 'clientCredentials' || activeFlow === 'authorizationCode') && (
        <div className={tokenDividerStyle} role="separator" />
      )}

      <div className={tokenSectionStyle}>
        <div className={authStyles.label}>
          {/* On Pro the paste field is an alternative to Get Token ("Or …
              directly"); on Free it's the only path, so it reads standalone. */}
          <span className={authStyles.hint}>
            {interactiveOAuthEnabled ? 'Or enter access token directly:' : 'Enter access token:'}
          </span>
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
