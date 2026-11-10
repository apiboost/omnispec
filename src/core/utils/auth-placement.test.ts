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
import { resolveAuthPlacement } from './auth-placement'
import type { AppliedAuthValue, AuthScheme } from '../types/auth.types'

const bearer: AppliedAuthValue = { schemeId: 'bearer', headerName: 'Authorization', headerValue: 'Bearer t' }

describe('resolveAuthPlacement', () => {
  it('places credentials as headers by default', () => {
    expect(resolveAuthPlacement([bearer], [])).toEqual({
      headers: { Authorization: 'Bearer t' },
      queryParams: {},
      cookies: {},
    })
  })

  it('honors an explicit `in` on the applied value', () => {
    const placed = resolveAuthPlacement([
      { schemeId: 'q', headerName: 'apikey', headerValue: 'k1', in: 'query' },
      { schemeId: 'c', headerName: 'sid', headerValue: 'k2', in: 'cookie' },
      { schemeId: 'h', headerName: 'X-Key', headerValue: 'k3', in: 'header' },
    ], [])
    expect(placed).toEqual({
      headers: { 'X-Key': 'k3' },
      queryParams: { apikey: 'k1' },
      cookies: { sid: 'k2' },
      cookieHeader: 'sid=k2',
    })
  })

  it('falls back to the apiKey scheme location when the applied value predates `in`', () => {
    const schemes: AuthScheme[] = [{ id: 'q', type: 'apiKey', displayName: 'q', in: 'query', name: 'apikey' }]
    const placed = resolveAuthPlacement([{ schemeId: 'q', headerName: 'apikey', headerValue: 'k1' }], schemes)
    expect(placed.queryParams).toEqual({ apikey: 'k1' })
    expect(placed.headers).toEqual({})
  })

  it('ignores scheme `in` for non-apiKey schemes', () => {
    const schemes = [{ id: 'bearer', type: 'http-bearer', displayName: 'b', in: 'query' }] as AuthScheme[]
    expect(resolveAuthPlacement([bearer], schemes).headers).toEqual({ Authorization: 'Bearer t' })
  })

  it('serializes cookies into a single Cookie header value', () => {
    const placed = resolveAuthPlacement([
      { schemeId: 'a', headerName: 'a', headerValue: '1', in: 'cookie' },
      { schemeId: 'b', headerName: 'b', headerValue: '2', in: 'cookie' },
    ], [])
    expect(placed.cookieHeader).toBe('a=1; b=2')
  })
})
