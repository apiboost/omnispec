/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { filterNodesForContext } from '@core/components/SchemaViewer/SchemaTree'
import type { SchemaNode } from '@core/components/SchemaViewer/schema-utils'

const nodes: SchemaNode[] = [
  { name: 'id', type: 'string', required: true, constraints: [], readOnly: true },
  { name: 'password', type: 'string', required: true, constraints: [], writeOnly: true },
  {
    name: 'profile',
    type: 'object',
    required: false,
    constraints: [],
    children: [
      { name: 'createdAt', type: 'string', required: false, constraints: [], readOnly: true },
      { name: 'nickname', type: 'string', required: false, constraints: [] },
    ],
  },
]

describe('filterNodesForContext', () => {
  it('returns nodes unchanged without a context', () => {
    expect(filterNodesForContext(nodes)).toBe(nodes)
  })

  it('hides readOnly properties in request context (recursively)', () => {
    const filtered = filterNodesForContext(nodes, 'request')
    expect(filtered.map((n) => n.name)).toEqual(['password', 'profile'])
    expect(filtered[1].children!.map((n) => n.name)).toEqual(['nickname'])
  })

  it('hides writeOnly properties in response context', () => {
    const filtered = filterNodesForContext(nodes, 'response')
    expect(filtered.map((n) => n.name)).toEqual(['id', 'profile'])
    expect(filtered[1].children!.map((n) => n.name)).toEqual(['createdAt', 'nickname'])
  })
})
