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
import {
  discoverOpenIdConfiguration,
  isDiscoveryOriginAllowed,
  mapOpenIdConfigToFlows,
  parseOpenIdConfiguration,
  OPENID_SCOPE,
} from './oidc-discovery'
import { resolveFlowUrl } from './oauth-pkce'

const DISCOVERY_URL = 'https://idp.example.com/.well-known/openid-configuration'

const validConfig = {
  issuer: 'https://idp.example.com',
  authorization_endpoint: 'https://idp.example.com/authorize',
  token_endpoint: 'https://idp.example.com/token',
  scopes_supported: ['openid', 'profile', 'email'],
}

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return vi.fn().mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => text,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mapOpenIdConfigToFlows', () => {
  it('maps endpoints and scopes into an Authorization Code flow', () => {
    const flows = mapOpenIdConfigToFlows(validConfig)
    expect(flows.authorizationCode).toBeDefined()
    expect(flows.authorizationCode!.authorizationUrl).toBe('https://idp.example.com/authorize')
    expect(flows.authorizationCode!.tokenUrl).toBe('https://idp.example.com/token')
    expect(Object.keys(flows.authorizationCode!.scopes)).toEqual(['openid', 'profile', 'email'])
  })

  it('includes the openid scope by default when scopes_supported omits it', () => {
    const flows = mapOpenIdConfigToFlows({
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
      scopes_supported: ['profile'],
    })
    expect(Object.keys(flows.authorizationCode!.scopes)).toEqual([OPENID_SCOPE, 'profile'])
  })

  it('includes the openid scope when scopes_supported is absent', () => {
    const flows = mapOpenIdConfigToFlows({
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
    })
    expect(Object.keys(flows.authorizationCode!.scopes)).toEqual([OPENID_SCOPE])
  })
})

describe('isDiscoveryOriginAllowed', () => {
  it('allows the discovery origin', () => {
    expect(
      isDiscoveryOriginAllowed('https://idp.example.com/authorize', 'https://idp.example.com'),
    ).toBe(true)
  })

  it('allows an explicitly allow-listed origin', () => {
    expect(
      isDiscoveryOriginAllowed('https://other.example.com/token', 'https://idp.example.com', [
        'https://other.example.com',
      ]),
    ).toBe(true)
  })

  it('rejects an off-origin endpoint', () => {
    expect(
      isDiscoveryOriginAllowed('https://evil.example.com/token', 'https://idp.example.com'),
    ).toBe(false)
  })
})

describe('parseOpenIdConfiguration', () => {
  it('parses a valid discovery document', () => {
    const config = parseOpenIdConfiguration(JSON.stringify(validConfig), DISCOVERY_URL)
    expect(config.authorization_endpoint).toBe('https://idp.example.com/authorize')
    expect(config.token_endpoint).toBe('https://idp.example.com/token')
  })

  it('throws on malformed JSON', () => {
    expect(() => parseOpenIdConfiguration('{ not json', DISCOVERY_URL)).toThrow(/not valid JSON/)
  })

  it('throws when required endpoints are missing', () => {
    expect(() =>
      parseOpenIdConfiguration(JSON.stringify({ issuer: 'x' }), DISCOVERY_URL),
    ).toThrow(/missing an authorization_endpoint or token_endpoint/)
  })

  it('throws when an endpoint points off the allowed origin', () => {
    const evil = { ...validConfig, token_endpoint: 'https://evil.example.com/token' }
    expect(() => parseOpenIdConfiguration(JSON.stringify(evil), DISCOVERY_URL)).toThrow(
      /disallowed origin/,
    )
  })
})

describe('discoverOpenIdConfiguration', () => {
  it('fetches and parses the discovery document directly', async () => {
    const fetchMock = mockFetchOnce(validConfig)
    vi.stubGlobal('fetch', fetchMock)

    const config = await discoverOpenIdConfiguration(DISCOVERY_URL)

    expect(fetchMock).toHaveBeenCalledWith(DISCOVERY_URL, expect.objectContaining({
      headers: { Accept: 'application/json' },
    }))
    expect(config.token_endpoint).toBe('https://idp.example.com/token')
  })

  it('allows the discovery URL on its own origin even with a separate allow-list', async () => {
    const fetchMock = mockFetchOnce(validConfig)
    vi.stubGlobal('fetch', fetchMock)

    // The discovery URL's own origin is always trusted, regardless of allowedOrigins.
    await expect(
      discoverOpenIdConfiguration(DISCOVERY_URL, {
        allowedOrigins: ['https://only-this.example.com'],
      }),
    ).resolves.toBeDefined()
  })

  it('rejects an invalid discovery URL before fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverOpenIdConfiguration('not-a-url')).rejects.toThrow(/not a valid URL/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a malformed discovery document as an error (manual-paste fallback)', async () => {
    const fetchMock = mockFetchOnce('<html>not json</html>')
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverOpenIdConfiguration(DISCOVERY_URL)).rejects.toThrow(/not valid JSON/)
  })

  it('surfaces an unreachable IdP (bad HTTP) as an error', async () => {
    const fetchMock = mockFetchOnce('nope', { ok: false, status: 503 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverOpenIdConfiguration(DISCOVERY_URL)).rejects.toThrow(/HTTP 503/)
  })

  it('falls back through the proxy on a CORS (TypeError) failure', async () => {
    const proxyBody = JSON.stringify(validConfig)
    const fetchMock = vi
      .fn()
      // Direct fetch rejects with a TypeError (how CORS surfaces).
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      // Proxy fetch returns the ProxyResponse envelope.
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, body: proxyBody }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const config = await discoverOpenIdConfiguration(DISCOVERY_URL, {
      proxyUrl: 'https://app.example.com/api/proxy',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(config.token_endpoint).toBe('https://idp.example.com/token')
  })

  it('does not fall back to the proxy on a real HTTP failure', async () => {
    const fetchMock = mockFetchOnce('nope', { ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverOpenIdConfiguration(DISCOVERY_URL, {
        proxyUrl: 'https://app.example.com/api/proxy',
      }),
    ).rejects.toThrow(/HTTP 500/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// Mirrors how OpenIdConnectAuth wires the two utilities: resolve the possibly
// relative `openIdConnectUrl` against the selected server first (resolveFlowUrl),
// then hand the absolute result to discovery. This proves the ABOSPEC-215
// relative-URL fix end-to-end at the util boundary. Network is mocked.
describe('resolve-then-discover (relative openIdConnectUrl)', () => {
  it('resolves a relative URL against the server and discovers successfully', async () => {
    const fetchMock = mockFetchOnce(validConfig)
    vi.stubGlobal('fetch', fetchMock)

    const resolved = resolveFlowUrl('/.well-known/openid-configuration', 'https://idp.example.com')
    expect(resolved).toBe('https://idp.example.com/.well-known/openid-configuration')

    const config = await discoverOpenIdConfiguration(resolved)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://idp.example.com/.well-known/openid-configuration',
      expect.anything(),
    )
    expect(config.token_endpoint).toBe('https://idp.example.com/token')
  })

  it('leaves an absolute URL unchanged and discovers successfully', async () => {
    const fetchMock = mockFetchOnce(validConfig)
    vi.stubGlobal('fetch', fetchMock)

    const resolved = resolveFlowUrl(DISCOVERY_URL, 'https://other.example.com')
    expect(resolved).toBe(DISCOVERY_URL)

    const config = await discoverOpenIdConfiguration(resolved)
    expect(config.token_endpoint).toBe('https://idp.example.com/token')
  })

  it('still preserves off-origin rejection after resolution', async () => {
    const evil = { ...validConfig, token_endpoint: 'https://evil.example.com/token' }
    const fetchMock = mockFetchOnce(evil)
    vi.stubGlobal('fetch', fetchMock)

    const resolved = resolveFlowUrl('/.well-known/openid-configuration', 'https://idp.example.com')
    await expect(discoverOpenIdConfiguration(resolved)).rejects.toThrow(/disallowed origin/)
  })
})
