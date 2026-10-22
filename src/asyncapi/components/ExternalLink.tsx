/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactNode } from 'react'
import { css, cx } from '@core/styles/css'
import { Icon } from '@core/components/common/Icon'

interface ExternalLinkProps {
  href: string
  /** Visible link text. */
  children: ReactNode
  /**
   * Accessible name for the link. The "opens in new tab" affordance is appended
   * automatically so screen-reader users know the target opens in a new tab.
   */
  label: string
  className?: string
}

/**
 * The shared "opens in a new tab" link treatment used across the AsyncAPI
 * renderer — a safe `target="_blank"` anchor with the ↗ external-link icon and
 * an accessible "opens in new tab" label. `ExternalDocsLink` composes this for
 * documentation links; overview contact/license links use it directly so every
 * new-tab link gets the same icon + a11y treatment.
 */
export function ExternalLink({ href, children, label, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}, opens in new tab`}
      className={cx(linkStyle, className)}
    >
      {children}
      <Icon name="external-link" size="0.875em" />
    </a>
  )
}

const linkStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  minWidth: 0,
  overflowWrap: 'anywhere',
  '&:hover': {
    textDecoration: 'underline',
  },
})
