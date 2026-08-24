/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { upgradeMixedContent } from './direct-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('upgradeMixedContent', () => {
  it('upgrades an http:// target to https:// when the page is served over https', () => {
    vi.stubGlobal('window', { location: { protocol: 'https:' } })
    expect(upgradeMixedContent('http://api.thecatapi.com/v1/images/search')).toBe(
      'https://api.thecatapi.com/v1/images/search',
    )
  })

  it('leaves http:// untouched on an http page (a real http-only API must stay reachable)', () => {
    vi.stubGlobal('window', { location: { protocol: 'http:' } })
    expect(upgradeMixedContent('http://localhost:8080/api')).toBe('http://localhost:8080/api')
  })

  it('leaves https:// URLs unchanged', () => {
    vi.stubGlobal('window', { location: { protocol: 'https:' } })
    expect(upgradeMixedContent('https://api.example.com/v1')).toBe('https://api.example.com/v1')
  })
})
