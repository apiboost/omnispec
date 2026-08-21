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
import { operationMatchesSearch } from './search'
import type { OpenApiOperation } from './types/openapi.types'

function makeOp(overrides: Partial<OpenApiOperation>): OpenApiOperation {
  return {
    method: 'get',
    path: '/pets',
    responses: [],
    parameters: [],
    ...overrides,
  } as OpenApiOperation
}

describe('operationMatchesSearch', () => {
  it('matches on path', () => {
    expect(operationMatchesSearch(makeOp({ path: '/pets/{id}' }), 'pets')).toBe(true)
  })

  it('matches on summary', () => {
    expect(operationMatchesSearch(makeOp({ summary: 'List all pets' }), 'list')).toBe(true)
  })

  it('matches on operationId', () => {
    expect(operationMatchesSearch(makeOp({ operationId: 'findPetById' }), 'findpet')).toBe(true)
  })

  it('matches on method', () => {
    expect(operationMatchesSearch(makeOp({ method: 'post' }), 'post')).toBe(true)
  })

  it('matches on description (regression: APIM#823)', () => {
    const op = makeOp({
      path: '/orders',
      summary: 'Create',
      description: 'Places a new purchase for the authenticated customer',
    })
    expect(operationMatchesSearch(op, 'purchase')).toBe(true)
  })

  it('returns false when no field matches', () => {
    expect(
      operationMatchesSearch(makeOp({ path: '/pets', summary: 'List', description: 'all pets' }), 'zzz'),
    ).toBe(false)
  })
})
