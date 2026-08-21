/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css, cx } from '../../core/styles/css'
import type { ParsedAsyncApiSpec } from '../types/asyncapi.types'
import { MarkdownRenderer } from '../../core/components/MarkdownRenderer'

interface AsyncOverviewProps {
  spec: ParsedAsyncApiSpec
}

const containerStyle = css({
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '1px solid var(--omnispec-border-color)',
})

const titleStyle = css({
  margin: '0 0 4px',
  fontSize: 'var(--omnispec-h2-font-size)',
  color: 'var(--omnispec-h2-color)',
  fontWeight: 700,
  display: 'inline',
})

const versionStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  marginLeft: '12px',
  fontFamily: 'var(--omnispec-font-mono)',
})

const specBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-primary)',
  border: '1px solid var(--omnispec-color-primary)',
  borderRadius: '4px',
  padding: '1px 6px',
  marginLeft: '8px',
  fontFamily: 'var(--omnispec-font-mono)',
})

const metaStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  marginTop: '4px',
})

const linkStyle = css({
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
})

export function AsyncOverview({ spec }: AsyncOverviewProps) {
  return (
    <div className={cx('omnispec-async-overview', containerStyle)}>
      <h1 className={titleStyle}>{spec.title}</h1>
      <span className={versionStyle}>v{spec.version}</span>
      <span className={specBadgeStyle}>AsyncAPI {spec.specVersion}</span>

      {spec.description && (
        <MarkdownRenderer content={spec.description} />
      )}

      {spec.contact && (
        <div className={metaStyle}>
          {spec.contact.name && <span>Contact: {spec.contact.name}</span>}
          {spec.contact.email && (
            <span> &lt;<a href={`mailto:${spec.contact.email}`} className={linkStyle}>{spec.contact.email}</a>&gt;</span>
          )}
          {spec.contact.url && (
            <span> · <a href={spec.contact.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>{spec.contact.url}</a></span>
          )}
        </div>
      )}

      {spec.license && (
        <div className={metaStyle}>
          License: {spec.license.url
            ? <a href={spec.license.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>{spec.license.name}</a>
            : spec.license.name
          }
        </div>
      )}

      {spec.externalDocs && (
        <div className={metaStyle}>
          <a href={spec.externalDocs.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>
            {spec.externalDocs.description ?? 'External Documentation'}
          </a>
        </div>
      )}
    </div>
  )
}
