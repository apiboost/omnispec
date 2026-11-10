/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi } from 'vitest'
import { isOriginAllowed, normalizeOrigin, normalizeAllowedOrigins } from './ref-security'

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

  it('normalizes a trailing slash on an entry', () => {
    expect(
      isOriginAllowed('https://schemas.example.com/pet.yaml', options(['https://schemas.example.com/'])),
    ).toBe(true)
  })

  it('normalizes an explicit default port on an entry or a ref', () => {
    expect(
      isOriginAllowed('https://schemas.example.com/pet.yaml', options(['https://schemas.example.com:443'])),
    ).toBe(true)
    expect(isOriginAllowed('http://x.example.com/pet.yaml', options(['http://x.example.com:80']))).toBe(true)
    expect(
      isOriginAllowed('https://schemas.example.com:443/pet.yaml', options(['https://schemas.example.com'])),
    ).toBe(true)
  })

  it('normalizes the case of an entry host and scheme', () => {
    expect(
      isOriginAllowed('https://schemas.example.com/pet.yaml', options(['https://Schemas.Example.com'])),
    ).toBe(true)
    expect(
      isOriginAllowed('https://SCHEMAS.example.com/pet.yaml', options(['HTTPS://schemas.example.com'])),
    ).toBe(true)
  })

  it('normalizes IDN hosts to punycode on both sides', () => {
    expect(isOriginAllowed('https://xn--bcher-kva.example/pet.yaml', options(['https://bücher.example']))).toBe(true)
    expect(isOriginAllowed('https://bücher.example/pet.yaml', options(['https://xn--bcher-kva.example']))).toBe(true)
  })

  it('keeps non-default ports distinct after normalization', () => {
    expect(
      isOriginAllowed('https://schemas.example.com:8443/pet.yaml', options(['https://schemas.example.com/'])),
    ).toBe(false)
    expect(
      isOriginAllowed('https://schemas.example.com/pet.yaml', options(['https://schemas.example.com:8443/'])),
    ).toBe(false)
    expect(isOriginAllowed('http://x.example.com/pet.yaml', options(['http://x.example.com:443']))).toBe(false)
  })

  it('keeps http and https distinct after normalization', () => {
    expect(isOriginAllowed('http://schemas.example.com/pet.yaml', options(['HTTPS://Schemas.Example.com/']))).toBe(false)
    expect(isOriginAllowed('https://schemas.example.com/pet.yaml', options(['http://schemas.example.com:80']))).toBe(false)
  })

  it('ignores entries that are not bare http(s) origins', () => {
    const invalid = [
      'https://schemas.example.com/v1',
      'https://schemas.example.com/?x=1',
      'https://schemas.example.com/#frag',
      'https://user:pass@schemas.example.com',
      'ftp://schemas.example.com',
      'schemas.example.com',
      'not a url',
    ]
    for (const entry of invalid) {
      expect(isOriginAllowed('https://schemas.example.com/pet.yaml', options([entry]))).toBe(false)
    }
  })

  it('blocks private addresses even when allow-listed', () => {
    expect(
      isOriginAllowed('http://127.0.0.1:8080/pet.yaml', options(['http://127.0.0.1:8080'])),
    ).toBe(false)
  })
})

describe('normalizeOrigin', () => {
  it('returns the WHATWG origin for valid http(s) origins', () => {
    expect(normalizeOrigin('https://Schemas.Example.com:443/')).toBe('https://schemas.example.com')
    expect(normalizeOrigin('http://x.example.com:80')).toBe('http://x.example.com')
    expect(normalizeOrigin('https://x.example.com:8443')).toBe('https://x.example.com:8443')
    expect(normalizeOrigin('https://bücher.example')).toBe('https://xn--bcher-kva.example')
  })

  it('returns null for entries with a path, query, fragment, credentials, or a non-http(s) scheme', () => {
    expect(normalizeOrigin('https://x.example.com/v1')).toBeNull()
    expect(normalizeOrigin('https://x.example.com?a=1')).toBeNull()
    expect(normalizeOrigin('https://x.example.com#a')).toBeNull()
    expect(normalizeOrigin('https://user@x.example.com')).toBeNull()
    expect(normalizeOrigin('https://user:pass@x.example.com')).toBeNull()
    expect(normalizeOrigin('ftp://x.example.com')).toBeNull()
    expect(normalizeOrigin('x.example.com')).toBeNull()
    expect(normalizeOrigin('')).toBeNull()
  })

  it('returns null for wildcard entries rather than treating them as patterns', () => {
    expect(normalizeOrigin('https://*.example.com')).toBeNull()
    expect(normalizeOrigin('*.example.com')).toBeNull()
  })
})

describe('normalizeAllowedOrigins', () => {
  it('normalizes valid entries and drops duplicates', () => {
    const warn = vi.fn()
    expect(
      normalizeAllowedOrigins(
        ['https://Schemas.Example.com/', 'https://schemas.example.com:443', 'http://x.example.com:8080'],
        warn,
      ),
    ).toEqual(['https://schemas.example.com', 'http://x.example.com:8080'])
    expect(warn).not.toHaveBeenCalled()
  })

  it('ignores invalid entries with a single warning listing all of them, without throwing', () => {
    const warn = vi.fn()
    const result = normalizeAllowedOrigins(
      ['https://ok.example.com', 'https://x.example.com/v1', 'ftp://y.example.com', 'https://u:p@z.example.com'],
      warn,
    )
    expect(result).toEqual(['https://ok.example.com'])
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0][0])
    expect(message).toContain('externalRefOrigins')
    expect(message).toContain('https://x.example.com/v1')
    expect(message).toContain('ftp://y.example.com')
    expect(message).toContain('https://u:p@z.example.com')
  })

  it('defaults to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      normalizeAllowedOrigins(['https://x.example.com/v1'])
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
    }
  })
})
