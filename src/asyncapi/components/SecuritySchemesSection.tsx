/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { Icon } from '@core/components/common/Icon'
import type { AsyncApiSecurityScheme, AsyncApiOAuthFlow } from '../types/asyncapi.types'

interface SecuritySchemesSectionProps {
  securitySchemes: Record<string, AsyncApiSecurityScheme>
}

/** Scheme keys rendered specially or already shown, so they skip the generic row list. */
const SPECIAL_KEYS = new Set(['type', 'description', 'flows'])

/**
 * Renders the components.securitySchemes for an AsyncAPI document. Every scheme
 * type is supported: the `type` shows as a badge, `description` as prose, OAuth2
 * `flows` render their scopes, and all remaining fields render as labelled rows —
 * so apiKey, http, oauth2, openIdConnect, userPassword, X509, scramSha256/512,
 * gssapi, plain, and the rest all display without a bespoke renderer per type.
 */
export function SecuritySchemesSection({ securitySchemes }: SecuritySchemesSectionProps) {
  const entries = Object.entries(securitySchemes ?? {})
  if (entries.length === 0) return null

  return (
    <div className={`omnispec-async-security ${containerStyle}`} id="security">
      <h2 className={titleStyle}>Security Schemes</h2>
      <div className={listStyle}>
        {entries.map(([name, scheme]) => (
          <div key={name} className={cardStyle} id={`security-${name}`}>
            <div className={headerStyle}>
              <Icon name="lock" size="0.875rem" />
              <code className={nameStyle}>{name}</code>
              <span className={typeBadgeStyle}>{scheme.type}</span>
            </div>

            {scheme.description && <p className={descStyle}>{scheme.description}</p>}

            {(() => {
              const rows = Object.entries(scheme).filter(
                ([key, value]) => !SPECIAL_KEYS.has(key) && value !== undefined && typeof value !== 'object',
              )
              if (rows.length === 0) return null
              return (
                <dl className={fieldListStyle}>
                  {rows.map(([field, value]) => (
                    <div key={field} className={fieldRowStyle}>
                      <dt className={fieldNameStyle}>{humanizeField(field)}</dt>
                      <dd className={fieldValueStyle}>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )
            })()}

            {scheme.flows && Object.keys(scheme.flows).length > 0 && (
              <div className={flowsStyle}>
                {Object.entries(scheme.flows).map(([flowName, flow]) => (
                  <OAuthFlow key={flowName} name={flowName} flow={flow} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OAuthFlow({ name, flow }: { name: string; flow: AsyncApiOAuthFlow }) {
  const scopes = flow.availableScopes ?? flow.scopes ?? {}
  const urls = Object.entries(flow).filter(
    ([key, value]) => key !== 'availableScopes' && key !== 'scopes' && typeof value === 'string',
  )
  return (
    <div className={flowCardStyle}>
      <div className={flowNameStyle}>{name}</div>
      {urls.length > 0 && (
        <dl className={fieldListStyle}>
          {urls.map(([field, value]) => (
            <div key={field} className={fieldRowStyle}>
              <dt className={fieldNameStyle}>{humanizeField(field)}</dt>
              <dd className={fieldValueStyle}><code className={urlStyle}>{String(value)}</code></dd>
            </div>
          ))}
        </dl>
      )}
      {Object.keys(scopes).length > 0 && (
        <div className={scopesStyle}>
          <span className={scopesLabelStyle}>Scopes</span>
          <ul className={scopeListStyle}>
            {Object.entries(scopes).map(([scope, desc]) => (
              <li key={scope} className={scopeRowStyle}>
                <code className={scopeNameStyle}>{scope}</code>
                {desc && <span className={scopeDescStyle}>{desc}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function humanizeField(field: string): string {
  const spaced = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const containerStyle = css({
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid var(--omnispec-border-color)',
  [mq.mobile]: {
    borderTop: 'none',
    marginTop: '1.5rem',
    paddingTop: '1rem',
  },
})

const titleStyle = css({
  margin: '0 0 16px',
  fontSize: 'var(--omnispec-h2-font-size)',
  color: 'var(--omnispec-h2-color)',
  fontWeight: 700,
})

const listStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
})

const cardStyle = css({
  padding: '12px 14px',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
})

const headerStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
})

const nameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 700,
  color: 'var(--omnispec-color-primary)',
  backgroundColor: 'transparent',
  padding: 0,
})

const typeBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-secondary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 6px',
  borderRadius: '3px',
})

const descStyle = css({
  margin: '0 0 8px',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
})

const fieldListStyle = css({
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  gap: '4px 16px',
  margin: '4px 0 0',
})

const fieldRowStyle = css({ display: 'contents' })

const fieldNameStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-secondary)',
})

const fieldValueStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-primary)',
  margin: 0,
  minWidth: 0,
  wordBreak: 'break-word',
})

const urlStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
})

const flowsStyle = css({
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const flowCardStyle = css({
  padding: '8px 10px',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
})

const flowNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
})

const scopesStyle = css({
  marginTop: '6px',
})

const scopesLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-fg-muted)',
})

const scopeListStyle = css({
  listStyle: 'none',
  margin: '4px 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
})

const scopeRowStyle = css({
  display: 'flex',
  gap: '8px',
  alignItems: 'baseline',
  flexWrap: 'wrap',
})

const scopeNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-primary)',
})

const scopeDescStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
})
