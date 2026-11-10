/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveTimeout } from './proxy-router'

describe('resolveTimeout', () => {
  const max = 30_000

  it('uses the requested timeout when it is below the maximum', () => {
    expect(resolveTimeout(1000, max)).toBe(1000)
  })

  it('never exceeds the maximum', () => {
    expect(resolveTimeout(10_000_000, max)).toBe(max)
    expect(resolveTimeout(Number.MAX_SAFE_INTEGER, max)).toBe(max)
  })

  it.each([undefined, null, NaN, Infinity, -Infinity, -1, 0, '1000', {}, []])(
    'falls back to the maximum for %p',
    (requested) => {
      expect(resolveTimeout(requested, max)).toBe(max)
    },
  )

  it('floors fractional values', () => {
    expect(resolveTimeout(1500.9, max)).toBe(1500)
  })
})
