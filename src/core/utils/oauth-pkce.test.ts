/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateCodeVerifier,
  computeCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  resolveRedirectUri,
  resolveFlowUrl,
  substituteFlowVariables,
  exchangeAuthorizationCode,
  exchangeClientCredentials,
} from '@core/utils/oauth-pkce'

describe('generateCodeVerifier', () => {
  it('produces a verifier within the RFC 7636 length bounds (43-128 chars)', () => {
    const verifier = generateCodeVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
  })

  it('uses only unreserved characters (A-Z a-z 0-9 - . _ ~)', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it('produces a different verifier on each call', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier())
  })
})

describe('computeCodeChallenge', () => {
  it('derives the S256 challenge from the RFC 7636 Appendix B test vector', async () => {
    const challenge = await computeCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('generateState', () => {
  it('produces a non-empty URL-safe value, different on each call', () => {
    const state = generateState()
    expect(state).toMatch(/^[A-Za-z0-9\-._~]+$/)
    expect(state).not.toBe(generateState())
  })
})

describe('resolveRedirectUri', () => {
  it('defaults to {origin}/oauth2-redirect.html when nothing is configured', () => {
    expect(resolveRedirectUri()).toBe(`${window.location.origin}/oauth2-redirect.html`)
  })

  it('returns a configured absolute URI unchanged', () => {
    expect(resolveRedirectUri('https://portal.example.com/swagger/oauth2-redirect.html'))
      .toBe('https://portal.example.com/swagger/oauth2-redirect.html')
  })

  it('resolves a configured relative path against the current origin', () => {
    expect(resolveRedirectUri('/swagger/oauth2-redirect.html'))
      .toBe(`${window.location.origin}/swagger/oauth2-redirect.html`)
  })
})

describe('resolveFlowUrl', () => {
  it('returns an absolute flow URL unchanged (central / third-party IdP)', () => {
    expect(resolveFlowUrl('https://auth.example.com/token', 'https://api.example.com'))
      .toBe('https://auth.example.com/token')
  })

  it('resolves a root-relative URL against the selected server origin', () => {
    expect(resolveFlowUrl('/oauth/token', 'https://api.example.com'))
      .toBe('https://api.example.com/oauth/token')
  })

  it('root-relative replaces the server path', () => {
    expect(resolveFlowUrl('/oauth/token', 'https://api.example.com/v1'))
      .toBe('https://api.example.com/oauth/token')
  })

  it('path-relative appends to the server path', () => {
    expect(resolveFlowUrl('oauth/token', 'https://api.example.com/v1/'))
      .toBe('https://api.example.com/v1/oauth/token')
  })

  it('falls back to the page origin when no server base is given', () => {
    expect(resolveFlowUrl('/oauth/token')).toBe(`${window.location.origin}/oauth/token`)
  })
})

describe('substituteFlowVariables (ABOSPEC-221)', () => {
  it('substitutes a single {name} placeholder from the supplied values', () => {
    expect(substituteFlowVariables('https://{env}.auth.example.com/oauth/token', { env: 'staging' }))
      .toBe('https://staging.auth.example.com/oauth/token')
  })

  it('substitutes every occurrence of the same placeholder', () => {
    expect(substituteFlowVariables('https://{env}.example.com/{env}/token', { env: 'prod' }))
      .toBe('https://prod.example.com/prod/token')
  })

  it('substitutes multiple distinct placeholders', () => {
    expect(substituteFlowVariables('https://{env}.{tenant}.example.com/token', { env: 'dev', tenant: 'acme' }))
      .toBe('https://dev.acme.example.com/token')
  })

  it('leaves the URL untouched when it has no placeholders', () => {
    expect(substituteFlowVariables('https://auth.example.com/token', { env: 'dev' }))
      .toBe('https://auth.example.com/token')
  })

  it('leaves a placeholder in place when no value is supplied for it', () => {
    expect(substituteFlowVariables('https://{env}.example.com/token', {}))
      .toBe('https://{env}.example.com/token')
  })

  it('composes with resolveFlowUrl for a relative templated URL + server', () => {
    const substituted = substituteFlowVariables('/{tenant}/oauth/token', { tenant: 'acme' })
    expect(resolveFlowUrl(substituted, 'https://api.example.com'))
      .toBe('https://api.example.com/acme/oauth/token')
  })
})

describe('buildAuthorizationUrl', () => {
  const base = {
    authorizationUrl: 'https://auth.example.com/authorize',
    clientId: 'my-client',
    redirectUri: 'https://portal.example.com/oauth2-redirect.html',
    state: 'xyz-state',
    codeChallenge: 'abc-challenge',
  }

  it('builds an authorization-code request with PKCE parameters', () => {
    const url = new URL(buildAuthorizationUrl(base))
    expect(`${url.origin}${url.pathname}`).toBe('https://auth.example.com/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('my-client')
    expect(url.searchParams.get('redirect_uri')).toBe('https://portal.example.com/oauth2-redirect.html')
    expect(url.searchParams.get('state')).toBe('xyz-state')
    expect(url.searchParams.get('code_challenge')).toBe('abc-challenge')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('joins scopes with spaces', () => {
    const url = new URL(buildAuthorizationUrl({ ...base, scopes: ['read:pets', 'write:pets'] }))
    expect(url.searchParams.get('scope')).toBe('read:pets write:pets')
  })

  it('omits the scope parameter when no scopes are given', () => {
    const url = new URL(buildAuthorizationUrl(base))
    expect(url.searchParams.has('scope')).toBe(false)
  })

  it('preserves query params already present on the authorization URL', () => {
    const url = new URL(buildAuthorizationUrl({
      ...base,
      authorizationUrl: 'https://auth.example.com/authorize?audience=api',
    }))
    expect(url.searchParams.get('audience')).toBe('api')
    expect(url.searchParams.get('response_type')).toBe('code')
  })
})

describe('exchangeAuthorizationCode', () => {
  const opts = {
    tokenUrl: 'https://auth.example.com/token',
    code: 'auth-code-123',
    redirectUri: 'https://portal.example.com/oauth2-redirect.html',
    clientId: 'my-client',
    codeVerifier: 'the-verifier',
  }

  const tokenJson = {
    access_token: 'token-abc',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'refresh-xyz',
    scope: 'read:pets',
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a form-encoded authorization_code grant with the code_verifier directly to the token URL', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(tokenJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const result = await exchangeAuthorizationCode(opts)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://auth.example.com/token')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/x-www-form-urlencoded')
    const body = new URLSearchParams(init?.body as string)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('auth-code-123')
    expect(body.get('redirect_uri')).toBe('https://portal.example.com/oauth2-redirect.html')
    expect(body.get('client_id')).toBe('my-client')
    expect(body.get('code_verifier')).toBe('the-verifier')
    expect(body.has('client_secret')).toBe(false)

    expect(result.accessToken).toBe('token-abc')
    expect(result.tokenType).toBe('Bearer')
    expect(result.expiresIn).toBe(3600)
    expect(result.refreshToken).toBe('refresh-xyz')
    expect(result.scope).toBe('read:pets')
  })

  it('falls back through the Try-It proxy when the direct request fails (CORS/network)', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tokenJson),
        bodyEncoding: 'utf-8',
        duration: 12,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const result = await exchangeAuthorizationCode({ ...opts, proxyUrl: '/api/proxy' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [proxyUrl, init] = fetchMock.mock.calls[1]
    expect(proxyUrl).toBe('/api/proxy')
    const envelope = JSON.parse(init?.body as string)
    expect(envelope.url).toBe('https://auth.example.com/token')
    expect(envelope.method).toBe('POST')
    expect(envelope.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(new URLSearchParams(envelope.body).get('code_verifier')).toBe('the-verifier')

    expect(result.accessToken).toBe('token-abc')
  })

  it('sends proxyHeaders to the proxy endpoint on fallback', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tokenJson),
        bodyEncoding: 'utf-8',
        duration: 5,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await exchangeAuthorizationCode({
      ...opts,
      proxyUrl: '/api/proxy',
      proxyHeaders: { 'X-Referer': 'Apiboost' },
    })

    const [, init] = fetchMock.mock.calls[1]
    expect(new Headers(init?.headers).get('X-Referer')).toBe('Apiboost')
  })

  it('does not fall back to the proxy when none is configured', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(exchangeAuthorizationCode(opts)).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('routes the exchange through the proxy immediately when a client secret is supplied', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokenJson),
      bodyEncoding: 'utf-8',
      duration: 8,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await exchangeAuthorizationCode({
      ...opts,
      clientSecret: 's3cret',
      clientAuth: 'body',
      proxyUrl: '/api/proxy',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/proxy')
    const envelope = JSON.parse(init?.body as string)
    expect(new URLSearchParams(envelope.body).get('client_secret')).toBe('s3cret')
  })

  it('throws a descriptive error when the token endpoint returns an OAuth error', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'invalid_grant',
      error_description: 'Code has expired',
    }), { status: 400, headers: { 'Content-Type': 'application/json' } }))

    await expect(exchangeAuthorizationCode(opts)).rejects.toThrow(/invalid_grant.*Code has expired/)
  })

  it('throws when the proxied token endpoint returns an OAuth error status', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 400,
        statusText: 'Bad Request',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Code has expired' }),
        bodyEncoding: 'utf-8',
        duration: 4,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(exchangeAuthorizationCode({ ...opts, proxyUrl: '/api/proxy' }))
      .rejects.toThrow(/invalid_grant.*Code has expired/)
  })
})

describe('exchangeClientCredentials', () => {
  const opts = {
    tokenUrl: 'https://auth.example.com/token',
    clientId: 'cc-client',
    clientSecret: 'cc-secret',
    scopes: ['read:pets', 'write:pets'],
  }

  const tokenJson = { access_token: 'cc-token', token_type: 'Bearer', expires_in: 3600 }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a client_credentials grant with id, secret, and space-joined scopes directly to the token URL (body mode)', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(tokenJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const result = await exchangeClientCredentials({ ...opts, clientAuth: 'body' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://auth.example.com/token')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/x-www-form-urlencoded')
    const body = new URLSearchParams(init?.body as string)
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_id')).toBe('cc-client')
    expect(body.get('client_secret')).toBe('cc-secret')
    expect(body.get('scope')).toBe('read:pets write:pets')
    expect(result.accessToken).toBe('cc-token')
  })

  it('omits the scope parameter when no scopes are given', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(tokenJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await exchangeClientCredentials({ ...opts, scopes: [] })

    const body = new URLSearchParams(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(body.has('scope')).toBe(false)
  })

  it('routes through the proxy when one is configured (the secret should not go cross-origin)', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokenJson),
      bodyEncoding: 'utf-8',
      duration: 7,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const result = await exchangeClientCredentials({ ...opts, proxyUrl: '/api/proxy', proxyHeaders: { 'X-Referer': 'Apiboost' } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/proxy')
    expect(new Headers(init?.headers).get('X-Referer')).toBe('Apiboost')
    const envelope = JSON.parse(init?.body as string)
    expect(envelope.url).toBe('https://auth.example.com/token')
    expect(new URLSearchParams(envelope.body).get('grant_type')).toBe('client_credentials')
    expect(result.accessToken).toBe('cc-token')
  })

  it('falls back through the proxy when the direct request fails at the network layer', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tokenJson),
        bodyEncoding: 'utf-8',
        duration: 3,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    // No proxy on the first attempt path is impossible for CC (secret present routes to
    // proxy first) — so exercise fallback via a direct-only call that then has a proxy.
    const result = await exchangeClientCredentials({ tokenUrl: opts.tokenUrl, clientId: opts.clientId, clientSecret: '', scopes: [], proxyUrl: '/api/proxy' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe('/api/proxy')
    expect(result.accessToken).toBe('cc-token')
  })

  it('throws a descriptive error when the token endpoint returns an OAuth error', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'invalid_client',
      error_description: 'Client authentication failed',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }))

    await expect(exchangeClientCredentials(opts)).rejects.toThrow(/invalid_client.*Client authentication failed/)
  })
})

describe('exchangeClientCredentials — client authentication method (RFC 6749 §2.3.1)', () => {
  const opts = {
    tokenUrl: 'https://auth.example.com/token',
    clientId: 'cc-client',
    clientSecret: 'cc-secret',
    scopes: ['read:pets'],
  }
  const tokenJson = { access_token: 'cc-token', token_type: 'Bearer', expires_in: 3600 }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function decodeBasic(header: string): string {
    expect(header).toMatch(/^Basic /)
    return atob(header.slice('Basic '.length))
  }

  it("defaults to 'header': sends a Basic Authorization header and omits credentials from the body", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(tokenJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await exchangeClientCredentials(opts)

    const [, init] = fetchMock.mock.calls[0]
    const authHeader = new Headers(init?.headers).get('Authorization') as string
    // RFC 6749 App. B: URL-encode id and secret before joining with a colon.
    expect(decodeBasic(authHeader)).toBe('cc-client:cc-secret')
    const body = new URLSearchParams(init?.body as string)
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('scope')).toBe('read:pets')
    expect(body.has('client_id')).toBe(false)
    expect(body.has('client_secret')).toBe(false)
  })

  it('url-encodes client id and secret per RFC 6749 App. B before base64-encoding', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(tokenJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await exchangeClientCredentials({
      ...opts,
      clientId: 'a b/c',
      clientSecret: 'p@ss:word',
      clientAuth: 'header',
    })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const authHeader = new Headers(init?.headers).get('Authorization') as string
    expect(decodeBasic(authHeader)).toBe(`${encodeURIComponent('a b/c')}:${encodeURIComponent('p@ss:word')}`)
  })

  it("'body' preserves the legacy client_secret_post shaping (credentials in the body, no Basic header)", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(tokenJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await exchangeClientCredentials({ ...opts, clientAuth: 'body' })

    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
    const body = new URLSearchParams(init?.body as string)
    expect(body.get('client_id')).toBe('cc-client')
    expect(body.get('client_secret')).toBe('cc-secret')
  })

  it("forwards the Basic header through the proxy when clientAuth is 'header'", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokenJson),
      bodyEncoding: 'utf-8',
      duration: 7,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await exchangeClientCredentials({ ...opts, clientAuth: 'header', proxyUrl: '/api/proxy' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/proxy')
    const envelope = JSON.parse(init?.body as string)
    // The proxied request TO the token endpoint carries the Basic header…
    expect(decodeBasic(envelope.headers.Authorization)).toBe('cc-client:cc-secret')
    // …and the credentials are absent from the proxied body.
    const proxiedBody = new URLSearchParams(envelope.body)
    expect(proxiedBody.has('client_id')).toBe(false)
    expect(proxiedBody.has('client_secret')).toBe(false)
  })

  it("keeps credentials in the proxied body when clientAuth is 'body'", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokenJson),
      bodyEncoding: 'utf-8',
      duration: 7,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await exchangeClientCredentials({ ...opts, clientAuth: 'body', proxyUrl: '/api/proxy' })

    const [, init] = fetchMock.mock.calls[0]
    const envelope = JSON.parse(init?.body as string)
    expect(envelope.headers.Authorization).toBeUndefined()
    expect(new URLSearchParams(envelope.body).get('client_secret')).toBe('cc-secret')
  })
})

describe('exchangeAuthorizationCode — confidential client authentication method', () => {
  const opts = {
    tokenUrl: 'https://auth.example.com/token',
    code: 'auth-code-123',
    redirectUri: 'https://portal.example.com/oauth2-redirect.html',
    clientId: 'my-client',
    codeVerifier: 'the-verifier',
    clientSecret: 's3cret',
    proxyUrl: '/api/proxy',
  }
  const tokenJson = { access_token: 'token-abc', token_type: 'Bearer' }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function proxyOk() {
    return new Response(JSON.stringify({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokenJson),
      bodyEncoding: 'utf-8',
      duration: 8,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  it("defaults to 'header' for a confidential client: Basic header set, client_secret absent from body, non-credential params kept", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(proxyOk())

    await exchangeAuthorizationCode(opts)

    const [, init] = fetchMock.mock.calls[0]
    const envelope = JSON.parse(init?.body as string)
    expect(atob(envelope.headers.Authorization.slice('Basic '.length))).toBe('my-client:s3cret')
    const body = new URLSearchParams(envelope.body)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('auth-code-123')
    expect(body.get('redirect_uri')).toBe('https://portal.example.com/oauth2-redirect.html')
    expect(body.get('code_verifier')).toBe('the-verifier')
    // Header mode carries only the non-credential params.
    expect(body.has('client_id')).toBe(false)
    expect(body.has('client_secret')).toBe(false)
  })

  it("keeps client_secret in the body when clientAuth is 'body'", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(proxyOk())

    await exchangeAuthorizationCode({ ...opts, clientAuth: 'body' })

    const [, init] = fetchMock.mock.calls[0]
    const envelope = JSON.parse(init?.body as string)
    expect(envelope.headers.Authorization).toBeUndefined()
    expect(new URLSearchParams(envelope.body).get('client_secret')).toBe('s3cret')
  })
})
