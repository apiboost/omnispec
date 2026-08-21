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
import { Icon } from '../common/Icon'

interface SecretInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Applied to the underlying input (e.g. the shared auth input style). */
  className?: string
  autoComplete?: string
  'aria-label'?: string
}

/**
 * A masked credential input (password/API-key/token). Renders as a password
 * field by default with an eye toggle to reveal/hide the value. Reveal state is
 * local and defaults to hidden, so a persisted secret is never shown until the
 * user explicitly reveals it.
 */
export function SecretInput({
  value,
  onChange,
  placeholder,
  className,
  autoComplete,
  'aria-label': ariaLabel,
}: SecretInputProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className={wrapStyle}>
      <input
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        // Inline overrides win over the shared class regardless of stylesheet
        // insertion order: fill the wrapper and leave room for the toggle.
        style={{ width: '100%', paddingRight: '2.25rem' }}
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className={toggleStyle}
        aria-label={revealed ? 'Hide value' : 'Show value'}
        aria-pressed={revealed}
        title={revealed ? 'Hide' : 'Show'}
      >
        <Icon name={revealed ? 'eye-off' : 'eye'} size="1rem" />
      </button>
    </div>
  )
}

const wrapStyle = css({
  position: 'relative',
  flex: 1,
  display: 'flex',
  alignItems: 'stretch',
})

const toggleStyle = css({
  position: 'absolute',
  right: '4px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.75rem',
  height: '1.75rem',
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-muted)',
  borderRadius: 'var(--omnispec-border-radius)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
  '&:focus-visible': {
    outline: '2px solid var(--omnispec-color-primary)',
    outlineOffset: '1px',
  },
})
