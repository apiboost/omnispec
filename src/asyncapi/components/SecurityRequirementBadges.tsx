/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { Fragment } from 'react'
import { css } from '@core/styles/css'
import { Icon } from '@core/components/common/Icon'
import type { AsyncApiSecurityRequirement } from '../types/asyncapi.types'

interface SecurityRequirementBadgesProps {
  /**
   * Security requirements to render. Outer array = OR alternatives; inner array
   * = schemes that must ALL apply (AND) within an alternative.
   */
  requirements: AsyncApiSecurityRequirement[][]
  label?: string
}

/**
 * Renders a server- or operation-level security requirement as a row of lock-badge
 * links, each pointing to its entry in the Security Schemes section. Per-requirement
 * scopes render beside the scheme name (e.g. `oauth2Auth · read, write`). When more
 * than one OR alternative exists, alternatives are separated by an "OR" divider so
 * "any one of" semantics read clearly. Shared by ServerList and ChannelDetail so the
 * two stay visually identical.
 */
export function SecurityRequirementBadges({ requirements, label = 'Security' }: SecurityRequirementBadgesProps) {
  if (!requirements || requirements.length === 0) return null

  return (
    <div className={rowStyle}>
      <span className={labelStyle}>{label}</span>
      {requirements.map((alternative, altIndex) => (
        <Fragment key={altIndex}>
          {altIndex > 0 && <span className={orStyle}>OR</span>}
          {alternative.map((scheme) => (
            <a key={scheme.name} href={`#security-${scheme.name}`} className={badgeStyle}>
              <Icon name="lock" size="0.625rem" strokeWidth={2.5} />
              {scheme.name}
              {scheme.scopes.length > 0 && (
                <span className={scopesStyle}>
                  <span className={scopeSepStyle}>·</span>
                  {scheme.scopes.join(', ')}
                </span>
              )}
            </a>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

const rowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  flexWrap: 'wrap',
  marginTop: '0.5rem',
})

const labelStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  lineHeight: 1.5,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-fg-muted)',
})

const orStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  lineHeight: 1.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-fg-muted)',
})

const badgeStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3125rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.1875rem 0.625rem',
  borderRadius: 'var(--omnispec-border-radius)',
  fontWeight: 500,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
})

const scopesStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3125rem',
  color: 'var(--omnispec-fg-secondary)',
})

const scopeSepStyle = css({
  color: 'var(--omnispec-fg-muted)',
})
