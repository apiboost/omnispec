/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { memo } from 'react'
import { css } from '@core/styles/css'
import type { OpenApiTag } from '../types/openapi.types'
import { Collapsible } from '@core/components/common/Collapsible'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer'
import { EndpointCard } from './EndpointCard'

interface TagGroupProps {
  tag: OpenApiTag
  serverUrl: string
  expandAll?: boolean
  expandGeneration?: number
}

export const TagGroup = memo(function TagGroup({ tag, serverUrl, expandAll, expandGeneration }: TagGroupProps) {
  const title = (
    <span className={tagTitleStyle}>
      {tag.displayName ?? tag.name}
      <span className={tagCountStyle}>{tag.operations.length}</span>
    </span>
  )

  return (
    <div className={`omnispec-tag-group ${tagContainerStyle}`} id={`tag-${tag.name}`}>
      <Collapsible title={title} defaultOpen={true} headerStyle={tagHeaderStyleObj}>
        {tag.description && (
          <div className={tagDescriptionStyle}>
            <MarkdownRenderer content={tag.description} />
          </div>
        )}
        {tag.externalDocs && (
          <a
            href={tag.externalDocs.url}
            target="_blank"
            rel="noopener noreferrer"
            className={externalDocsStyle}
          >
            {tag.externalDocs.description ?? 'External docs'}
            <span className={externalDocsArrowStyle}>&#8599;</span>
          </a>
        )}
        <div className={tagOperationsStyle}>
          {tag.operations.map((op, idx) => (
            <EndpointCard
              key={op.operationId ?? `${op.method}-${op.path}-${idx}`}
              id={op.operationId ?? `${op.method}-${op.path}`}
              operation={op}
              serverUrl={serverUrl}
              expandAll={expandAll}
              expandGeneration={expandGeneration}
            />
          ))}
        </div>
      </Collapsible>
    </div>
  )
})

const tagContainerStyle = css({
  marginBottom: '32px',
})

const tagHeaderStyleObj = {
  paddingBottom: '8px',
  borderBottom: '2px solid var(--omnispec-border-color)',
  marginBottom: '12px',
}

const tagTitleStyle = css({
  fontSize: '18px',
  fontWeight: 800,
  color: 'var(--omnispec-fg-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  letterSpacing: '-0.01em',
})

const tagCountStyle = css({
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '2px 8px',
  borderRadius: '10px',
  fontFamily: 'var(--omnispec-font-mono)',
})

const tagDescriptionStyle = css({
  marginBottom: '16px',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.6,
})

const externalDocsStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  marginBottom: '1rem',
  '&:hover': {
    textDecoration: 'underline',
  },
})

const externalDocsArrowStyle = css({
  fontSize: '0.75em',
})

const tagOperationsStyle = css({
  display: 'flex',
  flexDirection: 'column',
})
