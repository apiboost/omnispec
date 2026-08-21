/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '../../core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { ParsedOpenApiSpec } from '../types/openapi.types'
import { MarkdownRenderer } from '../../core/components/MarkdownRenderer'

interface ApiOverviewProps {
  spec: ParsedOpenApiSpec
}

export function ApiVersionBadge({ version }: { version: string }) {
  return <span className={versionBadgeMobileStyle}>v{version}</span>
}

export function ApiOverview({ spec }: ApiOverviewProps) {
  return (
    <div className={`omnispec-api-overview ${containerStyle}`}>
      <div className={titleRowStyle}>
        <h1 className={titleStyle}>{spec.title}</h1>
        <span className={versionBadgeStyle}>v{spec.version}</span>
      </div>

      {spec.description && (
        <div className={descriptionStyle}>
          <MarkdownRenderer content={spec.description} />
        </div>
      )}

      {(spec.contact || spec.license || spec.termsOfService || spec.externalDocs) && (
        <div className={metaRowStyle}>
          {spec.contact?.name && (
            <span className={metaItemStyle}>
              {spec.contact.email
                ? <a href={`mailto:${spec.contact.email}`} className={linkStyle}>{spec.contact.name}</a>
                : spec.contact.name
              }
              {spec.contact.url && (
                <>
                  {' · '}
                  <a href={spec.contact.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>
                    {spec.contact.url}
                  </a>
                </>
              )}
            </span>
          )}
          {spec.license && (
            <span className={metaItemStyle}>
              {spec.license.url
                ? <a href={spec.license.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>{spec.license.name}</a>
                : spec.license.name
              }
            </span>
          )}
          {spec.termsOfService && (
            <span className={metaItemStyle}>
              <a href={spec.termsOfService} target="_blank" rel="noopener noreferrer" className={linkStyle}>Terms of Service</a>
            </span>
          )}
          {spec.externalDocs && (
            <span className={metaItemStyle}>
              <a href={spec.externalDocs.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>
                {spec.externalDocs.description ?? 'Docs'}
              </a>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const containerStyle = css({
  marginBottom: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const titleRowStyle = css({
  display: 'flex',
  gap: '0.75rem',
  marginBottom: '0.25rem',
  flexWrap: 'wrap',
  flexDirection: 'column',
})

const titleStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-h1-font-size)',
  color: 'var(--omnispec-h1-color)',
  fontWeight: 'var(--omnispec-h1-font-weight)',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  wordBreak: 'break-word',
})

const versionBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  fontFamily: 'var(--omnispec-font-mono)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.125rem 0.5rem',
  borderRadius: '0.25rem',
  alignSelf: 'baseline',
  fontWeight: 500,
  [mq.mobile]: {
    display: 'none',
  },
})

const descriptionStyle = css({
  marginTop: '0.75rem',
})

const metaRowStyle = css({
  display: 'flex',
  gap: '1rem',
  marginTop: '0.75rem',
  flexWrap: 'wrap',
})

const metaItemStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
})

const versionBadgeMobileStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  fontFamily: 'var(--omnispec-font-mono)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.125rem 0.5rem',
  borderRadius: '0.25rem',
  fontWeight: 500,
})

const linkStyle = css({
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
})
