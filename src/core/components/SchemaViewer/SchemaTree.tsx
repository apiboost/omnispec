/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { css, cx } from '@core/styles/css'
import type { SchemaNode } from './schema-utils'
import { Badge } from '@core/components/common/Badge'
import { Icon } from '@core/components/common/Icon'
import { SchemaBadge, SchemaRefLink } from '@core/components/SchemaViewer/SchemaPrimitives'
import {
  PresentationContainer,
  SchemaPropRow,
  SchemaPropChildren,
  PropName,
  PropType,
  PropFormat,
  PropReq,
  PropRequiredStar,
  PropDesc,
  PropDefault,
  EnumList,
  EnumLabel,
  EnumItem,
} from '@core/components/SchemaViewer/SchemaPresentation'
import type { SchemaStyle } from '@core/components/SchemaViewer/schema-style'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'
import { useConfig } from '@core/context/ConfigContext'

/** Rendering context — hides readOnly props in requests, writeOnly in responses. */
export type SchemaContext = 'request' | 'response'

interface SchemaTreeProps {
  nodes: SchemaNode[]
  depth?: number
  /** When set, filters readOnly/writeOnly properties contextually. */
  context?: SchemaContext
}

/**
 * Deep-filters nodes for a request/response context: request schemas hide
 * readOnly properties, response schemas hide writeOnly properties.
 */
export function filterNodesForContext(nodes: SchemaNode[], context?: SchemaContext): SchemaNode[] {
  if (!context) return nodes
  return nodes
    .filter((node) =>
      !(context === 'request' && node.readOnly) &&
      !(context === 'response' && node.writeOnly),
    )
    .map((node) => ({
      ...node,
      children: node.children ? filterNodesForContext(node.children, context) : undefined,
      compositionChildren: node.compositionChildren?.map((branch) => filterNodesForContext(branch, context)),
    }))
}

export function SchemaTree({ nodes: rawNodes, depth = 0, context }: SchemaTreeProps) {
  // Gated presentation style resolved once upstream (ConfigContext).
  const { schemaStyle } = useConfig()
  // Contextual filtering happens once at the root; children are pre-filtered.
  const nodes = depth === 0 ? filterNodesForContext(rawNodes, context) : rawNodes

  // Bare primitive type (e.g. { type: "string" }) — render inline
  if (
    depth === 0 &&
    nodes.length === 1 &&
    !nodes[0].name &&
    !nodes[0].children?.length &&
    !nodes[0].compositionChildren
  ) {
    const node = nodes[0]
    return (
      <PresentationContainer variant={schemaStyle} className={cx('omnispec-schema-tree', bareTypeStyle)}>
        <PropType variant={schemaStyle}>
          {node.type}
          {node.format && <PropFormat variant={schemaStyle}> · {node.format}</PropFormat>}
        </PropType>
        {node.description && <span className={bareTypeDescStyle}>— {node.description}</span>}
      </PresentationContainer>
    )
  }

  // Root-level unnamed object/array: skip the wrapper node and render
  // its children directly so users see properties immediately instead
  // of a bare "object" row with "Show child attributes".
  if (
    depth === 0 &&
    nodes.length === 1 &&
    !nodes[0].name &&
    nodes[0].children?.length
  ) {
    return (
      <PresentationContainer variant={schemaStyle} className={cx('omnispec-schema-tree', rootStyle)}>
        {nodes[0].children.map((child, idx) => (
          <SchemaTreeNode key={`${child.name}-${idx}`} node={child} depth={0} variant={schemaStyle} />
        ))}
      </PresentationContainer>
    )
  }

  // Nested renders (depth > 0) don't re-wrap in a container — the parent
  // SchemaPropChildren already provides the nesting shell.
  const Wrapper = depth === 0 ? PresentationContainer : NestedFragment

  return (
    <Wrapper variant={schemaStyle} className={cx('omnispec-schema-tree', depth === 0 && rootStyle)}>
      {nodes.map((node, idx) => (
        <SchemaTreeNode key={`${node.name}-${idx}`} node={node} depth={depth} variant={schemaStyle} />
      ))}
    </Wrapper>
  )
}

/** Depth>0 pass-through so nested trees don't emit a second container. */
function NestedFragment({ children }: { variant: SchemaStyle; className?: string; children: ReactNode }) {
  return <>{children}</>
}

function SchemaTreeNode({ node, depth, variant }: { node: SchemaNode; depth: number; variant: SchemaStyle }) {
  const hasChildren = (node.children && node.children.length > 0) || Boolean(node.compositionChildren)
  const { defaultExpandOperations } = useConfig()
  // Expand top-level children by default when defaultExpandOperations is true
  const [expanded, setExpanded] = useState(depth === 0 && defaultExpandOperations)

  return (
    <SchemaPropRow variant={variant}>
      {/* Name (+ chevron, + tokens `*`) */}
      <PropName variant={variant}>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className={chevronBtnStyle}
            aria-label="Toggle child attributes"
            aria-expanded={expanded}
          >
            <Icon
              name="chevron-right"
              size="1em"
              className={cx(chevronIconStyle, expanded && chevronIconExpandedStyle)}
            />
          </button>
        )}
        {node.name}
        {node.title && node.title !== node.name && (
          <span className={titleStyle}>{node.title}</span>
        )}
        {node.required && variant === 'tokens' && <PropRequiredStar>*</PropRequiredStar>}
      </PropName>

      {/* Type signature + format + nullable + metadata badges */}
      <PropType variant={variant}>
        {node.compositionType ? (
          <Badge label={node.compositionType} variant="default" />
        ) : node.refTarget ? (
          <SchemaRefLink onClick={() => scrollToSchema(node.refTarget!)}>
            {node.type}
          </SchemaRefLink>
        ) : (
          node.type
        )}
        {node.format && <PropFormat variant={variant}> · {node.format}</PropFormat>}
        {node.nullable && <span className={nullableStyle}> | null</span>}

        {node.deprecated && <SchemaBadge variant="deprecated">deprecated</SchemaBadge>}
        {node.readOnly && <SchemaBadge variant="readonly">read-only</SchemaBadge>}
        {node.writeOnly && <SchemaBadge variant="writeonly">write-only</SchemaBadge>}
        {node.constraints.length > 0 && (
          <SchemaBadge variant="constraint">{node.constraints.join(', ')}</SchemaBadge>
        )}
      </PropType>

      {/* Required label (tokens uses the `*` marker instead) */}
      {node.required && variant !== 'tokens' && <PropReq variant={variant}>required</PropReq>}

      {/* Enum — chips + label, or the richer value/description table */}
      {node.enum && !node.enumDescriptions && (
        <EnumList variant={variant}>
          <EnumLabel variant={variant}>enum</EnumLabel>
          {node.enum.map((val) => (
            <EnumItem key={String(val)} variant={variant}>{String(val)}</EnumItem>
          ))}
        </EnumList>
      )}
      {node.enum && node.enumDescriptions && (
        <div className={enumTableStyle}>
          {node.enum.map((val) => (
            <div key={String(val)} className={enumRowStyle}>
              <span className={enumValueStyle}>{String(val)}</span>
              {node.enumDescriptions?.[String(val)] && (
                <span className={enumDescStyle}>{node.enumDescriptions[String(val)]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Description (markdown, sanitized) */}
      {node.description && (
        <PropDesc variant={variant}>
          <MarkdownRenderer content={node.description} />
        </PropDesc>
      )}

      {/* Default value */}
      {node.default !== undefined && (
        <PropDefault variant={variant}>Default: {JSON.stringify(node.default)}</PropDefault>
      )}

      {/* Child attributes: expanded children render in the nesting shell. */}
      {hasChildren && expanded && (
        <SchemaPropChildren variant={variant}>
          {node.children && (
            <SchemaTree nodes={node.children} depth={depth + 1} />
          )}
          {node.compositionChildren && (
            <div>
              {node.discriminator && (
                <span className={discriminatorStyle}>
                  Discriminated by <span className={discriminatorPropStyle}>{node.discriminator.propertyName}</span>
                </span>
              )}
              {node.compositionChildren.map((branch, idx) => (
                <div key={idx} className={compositionBranchStyle}>
                  <span className={compositionLabelStyle}>
                    {node.compositionBranchLabels?.[idx] ?? `Option ${idx + 1}`}
                  </span>
                  <SchemaTree nodes={branch} depth={depth + 1} />
                </div>
              ))}
            </div>
          )}
        </SchemaPropChildren>
      )}
    </SchemaPropRow>
  )
}

/**
 * Navigates to a component schema's anchor (`#schema-{name}`) rendered by
 * ComponentsSection, updating the URL hash so the deep link is shareable.
 */
function scrollToSchema(name: string): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(`schema-${name}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
      history.replaceState(null, '', `#schema-${name}`)
    }
  }
}

// --- Styles (row-local only; per-item styling lives in SchemaPresentation) ---

const rootStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const chevronBtnStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-muted)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})

const chevronIconStyle = css({
  transition: 'transform 0.15s ease',
})

const chevronIconExpandedStyle = css({
  transform: 'rotate(90deg)',
})

const nullableStyle = css({
  opacity: 0.65,
})

const titleStyle = css({
  color: 'var(--omnispec-fg-muted)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-sans)',
  fontStyle: 'italic',
})

const enumTableStyle = css({
  padding: '0.25rem 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
})

const enumRowStyle = css({
  display: 'flex',
  gap: '0.5rem',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const enumValueStyle = css({
  color: 'var(--omnispec-color-info)',
  fontFamily: 'var(--omnispec-font-mono)',
  flexShrink: 0,
})

const enumDescStyle = css({
  color: 'var(--omnispec-fg-muted)',
  fontFamily: 'var(--omnispec-font-sans)',
})

const discriminatorStyle = css({
  display: 'block',
  color: 'var(--omnispec-fg-muted)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-sans)',
  padding: '0.25rem 0',
})

const discriminatorPropStyle = css({
  color: 'var(--omnispec-fg-primary)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const compositionBranchStyle = css({
  borderLeft: '2px solid var(--omnispec-border-color)',
  marginBottom: '0.25rem',
  paddingLeft: '0.5rem',
})

const compositionLabelStyle = css({
  color: 'var(--omnispec-fg-muted)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontStyle: 'italic',
  display: 'block',
  padding: '0.25rem 0',
})

const bareTypeStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const bareTypeDescStyle = css({
  color: 'var(--omnispec-fg-secondary)',
  fontFamily: 'var(--omnispec-font-sans)',
  fontSize: 'var(--omnispec-font-size-xs)',
})
