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
import { Icon } from '@core/components/common/Icon'

interface SecurityRequirementBadgesProps {
  /** Security-scheme names to render as lock badges linking to the schemes section. */
  names?: string[]
  label?: string
}

/**
 * Renders a row of security-scheme lock badges (server- or operation-level),
 * each linking to its entry in the Security Schemes section. Shared by
 * ServerList and ChannelDetail so the two stay visually identical.
 */
export function SecurityRequirementBadges({ names, label = 'Security' }: SecurityRequirementBadgesProps) {
  if (!names || names.length === 0) return null
  return (
    <div className={rowStyle}>
      <span className={labelStyle}>{label}</span>
      {names.map((name) => (
        <a key={name} href={`#security-${name}`} className={badgeStyle}>
          <Icon name="lock" size="0.625rem" strokeWidth={2.5} />
          {name}
        </a>
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
  fontWeight: 600,
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
