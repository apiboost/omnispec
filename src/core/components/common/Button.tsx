/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * Shared action button.
 *
 * The single source of truth for the `--omnispec-btn-*` action-button styling
 * (toolbar buttons, Try-It/SOAP send, upgrade CTA, etc.). Renders a `<button>`
 * by default, or an `<a>` when `href` is provided (for download / external
 * links that should look identical to a button).
 *
 * Do NOT re-implement `--omnispec-btn-*` styling locally — compose this instead.
 * (Bare icon/toggle buttons with no chrome are a different concern and stay
 * as plain `<button>` elements.)
 */

import type { ReactNode } from 'react'
import { css, cx } from '@core/styles/css'

export type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps {
  /** Visual style. `secondary` (default) is the subtle toolbar button; `primary` is the filled CTA. */
  variant?: ButtonVariant
  /** Render a secondary button in its "on"/selected state (e.g. an active toggle). */
  active?: boolean
  /** When set, renders an `<a>` instead of a `<button>`. */
  href?: string
  download?: boolean
  target?: string
  rel?: string
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  disabled?: boolean
  title?: string
  'aria-label'?: string
  className?: string
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  active = false,
  href,
  download,
  target,
  rel,
  type = 'button',
  onClick,
  disabled,
  title,
  'aria-label': ariaLabel,
  className,
  children,
}: ButtonProps) {
  const classes = cx(
    baseStyle,
    variant === 'primary' ? primaryStyle : secondaryStyle,
    active && activeStyle,
    className,
  )

  if (href) {
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={rel}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className={classes}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  )
}

const baseStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.375rem',
  padding: '0.5rem 0.875rem',
  fontSize: 'var(--omnispec-btn-font-size)',
  lineHeight: 1.4,
  fontWeight: 600,
  borderRadius: 'var(--omnispec-btn-radius)',
  border: '1px solid transparent',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
})

const secondaryStyle = css({
  color: 'var(--omnispec-btn-secondary-text)',
  backgroundColor: 'var(--omnispec-btn-secondary-bg)',
  borderColor: 'var(--omnispec-btn-secondary-bg)',
  boxShadow: 'var(--omnispec-btn-secondary-shadow)',
  '&:hover:not(:disabled)': {
    color: 'var(--omnispec-btn-secondary-text-hover)',
    backgroundColor: 'var(--omnispec-btn-secondary-bg-hover)',
    boxShadow: 'var(--omnispec-btn-secondary-shadow-hover)',
  },
})

const primaryStyle = css({
  color: 'var(--omnispec-btn-primary-text)',
  backgroundColor: 'var(--omnispec-btn-primary-bg)',
  borderColor: 'var(--omnispec-btn-primary-bg)',
  boxShadow: 'var(--omnispec-btn-primary-shadow)',
  '&:hover:not(:disabled)': {
    color: 'var(--omnispec-btn-primary-text-hover)',
    backgroundColor: 'var(--omnispec-btn-primary-bg-hover)',
    boxShadow: 'var(--omnispec-btn-primary-shadow-hover)',
  },
})

const activeStyle = css({
  backgroundColor: 'var(--omnispec-btn-primary-bg)',
  color: 'var(--omnispec-btn-primary-text)',
  borderColor: 'var(--omnispec-btn-primary-bg)',
  boxShadow: 'var(--omnispec-btn-primary-shadow)',
})
