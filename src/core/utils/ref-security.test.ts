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
import { isOriginAllowed } from './ref-security'

const options = (allowedOrigins: string[]) => ({
  specOrigin: 'https://docs.example.com',
  allowedOrigins,
})

describe('isOriginAllowed', () => {
  it("allows the spec's own origin without configuration", () => {
    expect(isOriginAllowed('https://docs.example.com/schemas/pet.yaml', options([]))).toBe(true)
  })

  it('blocks cross-origin refs by default', () => {
    expect(isOriginAllowed('https://schemas.example.com/pet.yaml', options([]))).toBe(false)
  })

  it('allows an origin listed exactly', () => {
    expect(
      isOriginAllowed(
        'https://schemas.example.com/v1/pet.yaml',
        options(['https://schemas.example.com']),
      ),
    ).toBe(true)
  })

  it('does not treat a listed origin as covering its subdomains or apex', () => {
    const allowed = options(['https://example.com'])
    expect(isOriginAllowed('https://schemas.example.com/pet.yaml', allowed)).toBe(false)
    expect(isOriginAllowed('https://example.com/pet.yaml', allowed)).toBe(true)
  })

  it('does not support wildcard subdomains', () => {
    const allowed = options(['https://*.example.com', '*.example.com'])
    expect(isOriginAllowed('https://schemas.example.com/pet.yaml', allowed)).toBe(false)
    expect(isOriginAllowed('https://a.b.example.com/pet.yaml', allowed)).toBe(false)
  })

  it('requires the scheme and port to match', () => {
    const allowed = options(['https://schemas.example.com'])
    expect(isOriginAllowed('http://schemas.example.com/pet.yaml', allowed)).toBe(false)
    expect(isOriginAllowed('https://schemas.example.com:8443/pet.yaml', allowed)).toBe(false)
    expect(
      isOriginAllowed(
        'https://schemas.example.com:8443/pet.yaml',
        options(['https://schemas.example.com:8443']),
      ),
    ).toBe(true)
  })

  it('compares entries as origin strings: default ports are dropped, trailing slashes never match', () => {
    expect(
      isOriginAllowed(
        'https://schemas.example.com:443/pet.yaml',
        options(['https://schemas.example.com']),
      ),
    ).toBe(true)
    expect(
      isOriginAllowed(
        'https://schemas.example.com/pet.yaml',
        options(['https://schemas.example.com/', 'https://schemas.example.com:443']),
      ),
    ).toBe(false)
  })

  it('blocks private addresses even when allow-listed', () => {
    expect(
      isOriginAllowed('http://127.0.0.1:8080/pet.yaml', options(['http://127.0.0.1:8080'])),
    ).toBe(false)
  })
})
