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
import type { AsyncApiComponents } from '../types/asyncapi.types'
import { Collapsible } from '@core/components/common/Collapsible'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes } from '@core/components/SchemaViewer/schema-utils'

interface ComponentsSectionProps {
  components: AsyncApiComponents
}

export function ComponentsSection({ components }: ComponentsSectionProps) {
  const schemas = Object.entries(components.schemas)
  if (schemas.length === 0) return null

  return (
    <div className={`omnispec-async-components ${containerStyle}`} id="schemas">
      <h2 className={titleStyle}>Schemas</h2>
      <div className={schemaWrapperStyle}>
        {schemas.map(([name, schema]) => (
          <div key={name} className={schemaStyle} id={`schema-${name}`}>
            <Collapsible
              title={<code className={schemaNameStyle}>{name}</code>}
              defaultOpen={false}
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
  borderRadius: '8px',
  padding: '1.5rem 1rem',
})

const schemaStyle = css({
  marginBottom: '8px',
})

const schemaNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 600,
  color: 'var(--omnispec-color-primary)',
  backgroundColor: 'transparent',
  padding: 0,
  '&:hover': {
    textDecoration: 'underline',
  },
})
