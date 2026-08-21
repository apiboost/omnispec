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
import { mq } from '@core/styles/breakpoints'
import type { OpenApiComponents } from '../types/openapi.types'
import { Collapsible } from '@core/components/common/Collapsible'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes } from '@core/components/SchemaViewer/schema-utils'
import { LinkableHeading } from '@core/components/common/LinkableHeading'

interface ComponentsSectionProps {
  components: OpenApiComponents
  /** Mirrors the toolbar "expand all" toggle so schemas open/close with it. */
  expandAll?: boolean
  expandGeneration?: number
}

export function ComponentsSection({ components, expandAll, expandGeneration }: ComponentsSectionProps) {
  const schemas = Object.entries(components.schemas)
  if (schemas.length === 0) return null

  return (
    <div className={`omnispec-components ${containerStyle}`}>
      <LinkableHeading id="schemas" as="h2" className={titleStyle}>Schemas</LinkableHeading>
      <div className={schemaWrapperStyle}>
        {schemas.map(([name, schema]) => (
          <div key={name} className={schemaStyle} id={`schema-${name}`}>
            <Collapsible
              title={<span className={schemaNameStyle}>{name}</span>}
              defaultOpen={false}
              expandAll={expandAll}
              expandGeneration={expandGeneration}
            >
              <SchemaTree nodes={schemaToNodes(schema)} />
            </Collapsible>
          </div>
        ))}
      </div>
    </div>
  )
}

const containerStyle = css({
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid var(--omnispec-border-color)',
  [mq.mobile]: {
    borderTop: 'none',
    marginTop: '1.5rem',
    paddingTop: '1rem',
  },
})

const titleStyle = css({
  margin: '0 0 16px',
  fontSize: 'var(--omnispec-h2-font-size)',
  color: 'var(--omnispec-h2-color)',
  fontWeight: 700,
})

const schemaWrapperStyle = css({
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: '0.5rem',
  padding: '1.5rem 1rem',
  minWidth: 0,
})

const schemaStyle = css({
  marginBottom: '8px',
})

const schemaNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 600,
  color: 'var(--omnispec-color-primary)',
  overflowWrap: 'break-word',
  wordBreak: 'break-all',
  '&:hover': {
    textDecoration: 'none',
  },
})
