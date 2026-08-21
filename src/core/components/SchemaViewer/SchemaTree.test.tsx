/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { afterEach, describe, it, expect } from 'vitest'
import { render, cleanup, within, fireEvent } from '@testing-library/react'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import type { SchemaNode } from '@core/components/SchemaViewer/schema-utils'
import { ConfigProvider } from '@core/context/ConfigContext'
import { resolveSchemaStyle } from '@core/components/SchemaViewer/schema-style'
import type { SchemaStyle } from '@core/components/SchemaViewer/schema-style'

function makeNode(partial: Partial<SchemaNode> & { name: string; type: string }): SchemaNode {
  return {
    required: false,
    constraints: [],
    ...partial,
  }
}

describe('SchemaTree — Lines look', () => {
  afterEach(cleanup)

  it('renders `type · format` (middot form) instead of parenthesized format', () => {
    const nodes: SchemaNode[] = [
      makeNode({ name: 'createdAt', type: 'string', format: 'date-time' }),
    ]
    const { container } = render(<SchemaTree nodes={nodes} />)
    const text = container.textContent ?? ''
    expect(text).toContain('· date-time')
    expect(text).not.toContain('(date-time)')
  })

  it('renders the bare-primitive `type · format` form too', () => {
    const nodes: SchemaNode[] = [makeNode({ name: '', type: 'string', format: 'uuid' })]
    const { container } = render(<SchemaTree nodes={nodes} />)
    const text = container.textContent ?? ''
    expect(text).toContain('· uuid')
    expect(text).not.toContain('(uuid)')
  })

  it('renders a chevron toggle button for a node with children and toggles them', () => {
    const nodes: SchemaNode[] = [
      makeNode({
        name: 'address',
        type: 'object',
        children: [makeNode({ name: 'street', type: 'string' })],
      }),
    ]
    const { container, queryByText, getByText } = render(<SchemaTree nodes={nodes} />)
    const scope = within(container)

    // Collapsed by default at depth 0 (defaultExpandOperations = false)
    const toggle = scope.getByRole('button', { name: /toggle child attributes/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(queryByText('street')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(getByText('street')).toBeTruthy()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(queryByText('street')).toBeNull()
  })

  it('does not render a toggle button for a leaf node', () => {
    const nodes: SchemaNode[] = [makeNode({ name: 'id', type: 'string' })]
    const { queryByRole } = render(<SchemaTree nodes={nodes} />)
    expect(queryByRole('button', { name: /toggle child attributes/i })).toBeNull()
  })

  it('does not render the removed pill / "Show child attributes" text', () => {
    const nodes: SchemaNode[] = [
      makeNode({
        name: 'address',
        type: 'object',
        children: [makeNode({ name: 'street', type: 'string' })],
      }),
    ]
    const { container } = render(<SchemaTree nodes={nodes} />)
    expect(container.textContent).not.toContain('Show child attributes')
    expect(container.textContent).not.toContain('Hide child attributes')
  })

  it('renders composition branches under the chevron toggle', () => {
    const nodes: SchemaNode[] = [
      makeNode({
        name: 'pet',
        type: 'object',
        compositionType: 'oneOf',
        compositionChildren: [
          [makeNode({ name: 'bark', type: 'string' })],
          [makeNode({ name: 'meow', type: 'string' })],
        ],
        compositionBranchLabels: ['Dog', 'Cat'],
      }),
    ]
    const { container, getByText } = render(<SchemaTree nodes={nodes} />)
    const toggle = within(container).getByRole('button', { name: /toggle child attributes/i })
    fireEvent.click(toggle)
    expect(getByText('Dog')).toBeTruthy()
    expect(getByText('bark')).toBeTruthy()
  })
})

describe('SchemaTree — configurable schemaStyle', () => {
  afterEach(cleanup)

  const nodes: SchemaNode[] = [makeNode({ name: 'name', type: 'string', required: true })]

  function renderWithStyle(style: SchemaStyle | undefined) {
    return render(
      <ConfigProvider config={style ? { schemaStyle: style } : {}}>
        <SchemaTree nodes={nodes} />
      </ConfigProvider>,
    )
  }

  function markerOf(container: HTMLElement): string | null {
    return container.querySelector('.omnispec-schema-tree')!.getAttribute('data-schema-style')
  }

  it('defaults to the "lines" presentation when no style is configured', () => {
    const { container } = renderWithStyle(undefined)
    expect(markerOf(container)).toBe('lines')
  })

  it.each(['lines', 'table', 'card', 'tokens', 'chain'] as const)(
    'renders the "%s" presentation marker when configured',
    (style) => {
      const { container } = renderWithStyle(style)
      expect(markerOf(container)).toBe(style)
    },
  )

  it('gating fallback: a Free config requesting "card" renders as "lines"', () => {
    // Mirrors how a spec component resolves the public prop before ConfigProvider.
    const freeResolved = resolveSchemaStyle('card', /* advancedAllowed */ false)
    const { container } = renderWithStyle(freeResolved)
    expect(markerOf(container)).toBe('lines')
  })

  it('Pro config requesting "card" renders as "card"', () => {
    const proResolved = resolveSchemaStyle('card', /* advancedAllowed */ true)
    const { container } = renderWithStyle(proResolved)
    expect(markerOf(container)).toBe('card')
  })
})
