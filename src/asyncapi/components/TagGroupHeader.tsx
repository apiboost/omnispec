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
import { MarkdownRenderer } from '@core/components/MarkdownRenderer'
import type { TagGroup } from '../tag-grouping'

/**
 * Header shown above a tag group's channels: the tag label, a channel count, the
 * tag description, and its externalDocs link (ABOSPEC-51).
 */
export function TagGroupHeader({ group }: { group: TagGroup }) {
  return (
    <div className={headerStyle}>
      <h3 className={titleStyle}>
        {group.label}
        <span className={countStyle}>{group.channels.length}</span>
      </h3>
      {group.tag?.description && (
        <div className={descStyle}>
          <MarkdownRenderer content={group.tag.description} />
        </div>
      )}
      {group.tag?.externalDocs && (
        <a
          href={group.tag.externalDocs.url}
          target="_blank"
          rel="noopener noreferrer"
          className={docsStyle}
        >
          {group.tag.externalDocs.description ?? 'External docs'}
          <span aria-hidden="true"> &#8599;</span>
        </a>
      )}
    </div>
  )
}

const headerStyle = css({
  marginBottom: '0.75rem',
  paddingBottom: '0.5rem',
  borderBottom: '0.125rem solid var(--omnispec-border-color)',
})

const titleStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  margin: 0,
  fontSize: 'var(--omnispec-h3-font-size)',
  fontWeight: 800,
  color: 'var(--omnispec-h3-color)',
})

const countStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 500,
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.125rem 0.5rem',
  borderRadius: '0.625rem',
  fontFamily: 'var(--omnispec-font-mono)',
})

const descStyle = css({
  marginTop: '0.5rem',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.6,
})

const docsStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  marginTop: '0.5rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
})
