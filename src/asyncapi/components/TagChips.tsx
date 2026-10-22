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
import { ExternalDocsLink } from '@asyncapi/components/ExternalDocsLink'
import type { AsyncApiTag } from '@asyncapi/types/asyncapi.types'

interface TagChipsProps {
  tags: AsyncApiTag[]
  /**
   * When provided, each chip becomes a button that invokes this with the tag
   * name (e.g. to filter by tag). When absent, chips render as static spans.
   */
  onTagClick?: (tagName: string) => void
}

/**
 * The shared tag-chip row used wherever AsyncAPI tags render (channel,
 * operation, message). Renders each tag as a chip and, when a tag carries its
 * own `externalDocs`, that tag's docs link via the shared `ExternalDocsLink`
 * (↗ icon + accessible "opens in new tab" label).
 */
export function TagChips({ tags, onTagClick }: TagChipsProps) {
  if (!tags || tags.length === 0) return null

  return (
    <div className={tagChipsStyle}>
      {tags.map((tag) => (
        <span key={tag.name} className={tagItemStyle}>
          {onTagClick ? (
            <button
              type="button"
              className={tagChipButtonStyle}
              title={tag.description}
              onClick={() => onTagClick(tag.name)}
            >
              {tag.name}
            </button>
          ) : (
            <span className={tagChipStyle} title={tag.description}>{tag.name}</span>
          )}
          {tag.externalDocs && (
            <ExternalDocsLink externalDocs={tag.externalDocs} context={tag.name} />
          )}
        </span>
      ))}
    </div>
  )
}

const tagChipsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.5rem',
})

const tagItemStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
})

const tagChipStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-secondary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 0.5rem',
  borderRadius: '0.625rem',
})

const tagChipButtonStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-secondary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 0.5rem',
  borderRadius: '0.625rem',
  border: 'none',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})
