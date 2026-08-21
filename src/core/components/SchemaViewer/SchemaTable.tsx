/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css, cx } from '../../styles/css'
import type { SchemaNode } from './schema-utils'

interface SchemaTableProps {
  nodes: SchemaNode[]
}

const wrapperStyle = css({
  borderRadius: 'var(--omnispec-border-radius)',
})

const tableStyle = css({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--omnispec-font-size-sm)',
})

const thStyle = css({
  textAlign: 'left',
  padding: '8px 12px',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  borderBottom: '2px solid var(--omnispec-border-color)',
  color: 'var(--omnispec-fg-secondary)',
  fontWeight: 600,
  fontSize: 'var(--omnispec-font-size-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const tdStyle = css({
  padding: '6px 12px',
  borderBottom: '1px solid var(--omnispec-border-color)',
  verticalAlign: 'top',
  color: 'var(--omnispec-fg-primary)',
})

const nameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontWeight: 600,
})

const requiredStyle = css({
  color: 'var(--omnispec-color-error)',
  marginLeft: '1px',
})

const typeTdStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-color-primary)',
  whiteSpace: 'nowrap',
})

const descriptionTdStyle = css({
  maxWidth: '300px',
  lineHeight: 1.4,
})

const constraintsTdStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  whiteSpace: 'nowrap',
})

const deprecatedStyle = css({
  color: 'var(--omnispec-color-warning)',
  fontWeight: 600,
})

const enumSpanStyle = css({
  color: 'var(--omnispec-color-info)',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const indentStyle = css({
  color: 'var(--omnispec-fg-muted)',
})

const nestedRowStyle = css({
  opacity: 0.85,
})

const rowHoverStyle = css({
  '&:hover': {
    backgroundColor: 'var(--omnispec-bg-tertiary)',
  },
})

export function SchemaTable({ nodes }: SchemaTableProps) {
  const flatNodes = flattenNodes(nodes)

  return (
    <div className={cx('omnispec-schema-table', wrapperStyle)}>
      <table className={tableStyle}>
        <thead>
          <tr>
            <th className={thStyle}>Name</th>
            <th className={thStyle}>Type</th>
            <th className={thStyle}>Required</th>
            <th className={thStyle}>Description</th>
            <th className={thStyle}>Constraints</th>
          </tr>
        </thead>
        <tbody>
          {flatNodes.map((node, idx) => (
            <tr key={`${node.path}-${idx}`} className={cx(rowHoverStyle, node.depth > 0 && nestedRowStyle)}>
              <td className={tdStyle}>
                <span className={css({ paddingLeft: `${node.depth * 16}px` })}>
                  {node.depth > 0 && <span className={indentStyle}>&#8627; </span>}
                  <span className={nameStyle}>{node.node.name}</span>
                  {node.node.required && <span className={requiredStyle}>*</span>}
                </span>
              </td>
              <td className={cx(tdStyle, typeTdStyle)}>
                {node.node.type}
                {node.node.format && ` (${node.node.format})`}
                {node.node.nullable && ' | null'}
              </td>
              <td className={tdStyle}>
                {node.node.required ? 'Yes' : 'No'}
              </td>
              <td className={cx(tdStyle, descriptionTdStyle)}>
                {node.node.deprecated && <span className={deprecatedStyle}>Deprecated. </span>}
                {node.node.description ?? ''}
                {node.node.enum && (
                  <span className={enumSpanStyle}>
                    {' '}Allowed: {node.node.enum.map(String).join(', ')}
                  </span>
                )}
              </td>
              <td className={cx(tdStyle, constraintsTdStyle)}>
                {node.node.constraints.join(', ')}
                {node.node.default !== undefined && ` Default: ${JSON.stringify(node.node.default)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FlatNode {
  node: SchemaNode
  depth: number
  path: string
}

function flattenNodes(nodes: SchemaNode[], depth = 0, parentPath = ''): FlatNode[] {
  const result: FlatNode[] = []

  for (const node of nodes) {
    const path = parentPath ? `${parentPath}.${node.name}` : node.name
    result.push({ node, depth, path })

    if (node.children) {
      result.push(...flattenNodes(node.children, depth + 1, path))
    }
    if (node.compositionChildren) {
      for (const branch of node.compositionChildren) {
        result.push(...flattenNodes(branch, depth + 1, path))
      }
    }
  }

  return result
}
