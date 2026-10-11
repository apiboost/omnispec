/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css, cx } from '@core/styles/css'
import { Icon } from '@core/components/common/Icon'
import type { AsyncApiExternalDocs } from '../types/asyncapi.types'

interface ExternalDocsLinkProps {
  externalDocs: AsyncApiExternalDocs
  /**
   * A short name for the thing these docs belong to (tag, operation, message, or
   * "API"). Used only to disambiguate the accessible label — several
   * "External docs" links on one page are indistinguishable to a screen reader
   * otherwise (ABOSPEC-53).
   */
  context?: string
  className?: string
}

/**
 * The single external-documentation link used across the AsyncAPI renderer
 * (root, tag, channel, operation, message). Guarantees a consistent ↗ icon,
 * safe `target="_blank"`, and an accessible "opens in new tab" label everywhere.
 */
export function ExternalDocsLink({ externalDocs, context, className }: ExternalDocsLinkProps) {
  const label = externalDocs.description ?? 'External docs'
  const ariaLabel = `${context ? `${context} external docs` : 'External docs'}, opens in new tab`

  return (
    <a
      href={externalDocs.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={cx(linkStyle, className)}
    >
      {label}
      <Icon name="external-link" size="0.875em" />
    </a>
  )
}

const linkStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  minWidth: 0,
  overflowWrap: 'anywhere',
  '&:hover': {
    textDecoration: 'underline',
  },
})
