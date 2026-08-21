/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ProxyRequest, ProxyResponse } from '@core/types/try-it.types'

/**
 * Client-authentication method for the token endpoint (RFC 6749 §2.3.1):
 * - `'header'` — `client_secret_basic`: credentials in the `Authorization: Basic` header.
 * - `'body'`   — `client_secret_post`: credentials in the form body.
 */
export type ClientAuthMethod = 'header' | 'body'

/**
 * Builds the `client_secret_basic` value: `Basic base64(urlencode(id):urlencode(secret))`.
 * Each of id and secret is URL-encoded before joining with `:` and base64-encoding,
 * per RFC 6749 Appendix B.
 */
export function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`
  return `Basic ${btoa(credentials)}`
}

/** Parsed OAuth 2.0 token endpoint response (RFC 6749 §5.1). */
export interface OAuthTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn?: number
  refreshToken?: string
  scope?: string
}

export interface ExchangeAuthorizationCodeOptions {
  tokenUrl: string
  code: string
  redirectUri: string
  clientId: string
  /** Omitted when PKCE is disabled via `oauth.usePkce: false`. */
  codeVerifier?: string
  /** Confidential-client secret. When set with a proxyUrl, the exchange goes straight through the proxy. */
  clientSecret?: string
  /**
   * How to present the confidential-client credentials at the token endpoint
   * (RFC 6749 §2.3.1). Only relevant when a `clientSecret` is supplied.
   * Defaults to `'header'` (`client_secret_basic`).
   */
  clientAuth?: ClientAuthMethod
  /** Try-It proxy endpoint used as a CORS fallback for the token request. */
  proxyUrl?: string
  /** Headers for the request the browser sends TO the proxy (not the token endpoint). */
  proxyHeaders?: Record<string, string>
}

/** RFC 3986 unreserved characters — the code-verifier alphabet from RFC 7636 §4.1. */
const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

function randomString(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) {
    out += UNRESERVED[byte % UNRESERVED.length]
  }
  return out
}

export function generateCodeVerifier(): string {
  return randomString(64)
}

export function generateState(): string {
  return randomString(32)
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** S256 challenge per RFC 7636 §4.2: BASE64URL(SHA-256(verifier)). Requires a secure context. */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(new Uint8Array(digest))
}

/** Whether the WebCrypto digest API needed for PKCE is available (secure contexts only). */
export function isPkceSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.digest === 'function'
}

/**
 * Resolves the OAuth redirect URI. Relative paths resolve against the current
 * origin; when nothing is configured, defaults to the Swagger-UI-convention
 * `{origin}/oauth2-redirect.html`.
 */
export function resolveRedirectUri(configured?: string): string {
  if (!configured) {
    return `${window.location.origin}/oauth2-redirect.html`
  }
  return new URL(configured, window.location.origin).toString()
}

/**
 * Resolves an OAuth flow URL (`tokenUrl` / `authorizationUrl` / `refreshUrl`)
 * for the request. Absolute URLs (a central or third-party IdP) are returned
 * unchanged; a relative URL resolves against `base` — the currently selected
 * server — so the token endpoint follows the server dropdown across
 * environments. With no `base`, and no `servers` in the spec, it falls back to
 * the page origin (OpenAPI's default server is `/`). See ABOSPEC-220.
 */
export function resolveFlowUrl(url: string, base?: string): string {
  if (!url) return url
  try {
    const resolvedBase = base || (typeof window !== 'undefined' ? window.location.origin : undefined)
    return new URL(url, resolvedBase).toString()
  } catch {
    // Unresolvable (e.g. relative URL with no base) — leave as authored.
    return url
  }
}

/**
 * Substitutes `{name}` placeholders in an OAuth flow URL
 * (`tokenUrl` / `authorizationUrl` / `refreshUrl`) with the supplied variable
 * values, the same templating OpenAPI Server Objects use for their `url`. A
 * placeholder with no matching value is left in place. Run this **before**
 * {@link resolveFlowUrl} so a single spec can Try-It OAuth against multiple
 * environments / tenants / a third-party IdP (the OmniSpec `x-flowVariables`
 * extension — see ABOSPEC-221, filling the OAI/OpenAPI-Specification#551 gap).
 */
export function substituteFlowVariables(url: string, values: Record<string, string>): string {
  if (!url) return url
  return url.replace(/\{([^}]+)\}/g, (match, name: string) => {
    const value = values[name]
    return value !== undefined ? value : match
  })
}

export interface BuildAuthorizationUrlOptions {
  authorizationUrl: string
  clientId: string
  redirectUri: string
  state: string
  /** Omitted when PKCE is disabled via `oauth.usePkce: false`. */
  codeChallenge?: string
  scopes?: string[]
}

export function buildAuthorizationUrl(options: BuildAuthorizationUrlOptions): string {
  const url = new URL(options.authorizationUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', options.clientId)
  url.searchParams.set('redirect_uri', options.redirectUri)
  url.searchParams.set('state', options.state)
  if (options.codeChallenge) {
    url.searchParams.set('code_challenge', options.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
  }
  if (options.scopes && options.scopes.length > 0) {
    url.searchParams.set('scope', options.scopes.join(' '))
  }
  return url.toString()
}

/**
 * Exchanges an authorization code for tokens (RFC 6749 §4.1.3 with the
 * RFC 7636 code_verifier). Posts directly to the token endpoint; when that
 * fails at the network layer (typically CORS) and a proxy is configured,
 * retries through the Try-It proxy. A confidential-client secret skips the
 * direct attempt and goes straight through the proxy.
 */
export async function exchangeAuthorizationCode(
  options: ExchangeAuthorizationCodeOptions,
): Promise<OAuthTokenResponse> {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
  })
  if (options.codeVerifier) {
    form.set('code_verifier', options.codeVerifier)
  }
  // `client_secret_basic` (the default) moves the credentials into the
  // Authorization header and keeps them out of the body; `client_secret_post`
  // keeps id + secret in the body.
  const useBasic = Boolean(options.clientSecret) && (options.clientAuth ?? 'header') === 'header'
  const authHeader = useBasic
    ? buildBasicAuthHeader(options.clientId, options.clientSecret as string)
    : undefined
  if (!useBasic) {
    form.set('client_id', options.clientId)
    if (options.clientSecret) {
      form.set('client_secret', options.clientSecret)
    }
  }

  if (options.clientSecret && options.proxyUrl) {
    return exchangeViaProxy(options, form, authHeader)
  }

  try {
    const response = await fetch(options.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: form.toString(),
    })
    return parseTokenResponse(response.status, await response.text())
  } catch (error) {
    if (options.proxyUrl && error instanceof TypeError) {
      return exchangeViaProxy(options, form, authHeader)
    }
    throw error
  }
}

export interface ExchangeClientCredentialsOptions {
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes?: string[]
  /**
   * How to present the client credentials at the token endpoint
   * (RFC 6749 §2.3.1). Defaults to `'header'` (`client_secret_basic`).
   */
  clientAuth?: ClientAuthMethod
  /** Try-It proxy endpoint. Preferred for this grant, since the secret shouldn't go cross-origin. */
  proxyUrl?: string
  proxyHeaders?: Record<string, string>
}

/**
 * Exchanges client credentials for a token (RFC 6749 §4.4). The confidential
 * client authenticates via either `client_secret_basic` (default — id + secret
 * in the `Authorization: Basic` header) or `client_secret_post` (id + secret in
 * the form body), selected by `clientAuth`. Because the secret shouldn't leave
 * the browser cross-origin, the exchange goes through the Try-It proxy whenever
 * one is configured, and otherwise posts directly (a developer-tool convenience
 * for test clients), falling back to the proxy on a network-layer failure.
 */
export async function exchangeClientCredentials(
  options: ExchangeClientCredentialsOptions,
): Promise<OAuthTokenResponse> {
  const form = new URLSearchParams({ grant_type: 'client_credentials' })
  const useBasic = Boolean(options.clientSecret) && (options.clientAuth ?? 'header') === 'header'
  const authHeader = useBasic
    ? buildBasicAuthHeader(options.clientId, options.clientSecret)
    : undefined
  if (!useBasic) {
    form.set('client_id', options.clientId)
    if (options.clientSecret) {
      form.set('client_secret', options.clientSecret)
    }
  }
  if (options.scopes && options.scopes.length > 0) {
    form.set('scope', options.scopes.join(' '))
  }

  if (options.clientSecret && options.proxyUrl) {
    return exchangeViaProxy(options, form, authHeader)
  }

  try {
    const response = await fetch(options.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: form.toString(),
    })
    return parseTokenResponse(response.status, await response.text())
  } catch (error) {
    if (options.proxyUrl && error instanceof TypeError) {
      return exchangeViaProxy(options, form, authHeader)
    }
    throw error
  }
}

/** Minimal shape the proxy exchange needs — shared by both grant types. */
interface ProxyExchangeTarget {
  tokenUrl: string
  proxyUrl?: string
  proxyHeaders?: Record<string, string>
}

async function exchangeViaProxy(
  options: ProxyExchangeTarget,
  form: URLSearchParams,
  authHeader?: string,
): Promise<OAuthTokenResponse> {
  const payload: ProxyRequest = {
    url: options.tokenUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: form.toString(),
    bodyEncoding: 'utf-8',
    timeout: 30000,
  }

  const response = await fetch(options.proxyUrl as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.proxyHeaders },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Token request via proxy failed: ${response.status} ${response.statusText}`)
  }

  const proxyResponse: ProxyResponse = await response.json()
  return parseTokenResponse(proxyResponse.status, proxyResponse.body)
}

function parseTokenResponse(status: number, bodyText: string): OAuthTokenResponse {
  let json: Record<string, unknown>
  try {
    json = JSON.parse(bodyText)
  } catch {
    throw new Error(`Token endpoint returned an unexpected response (HTTP ${status})`)
  }

  if (status >= 400 || typeof json.error === 'string') {
    const error = typeof json.error === 'string' ? json.error : `HTTP ${status}`
    const description = typeof json.error_description === 'string' ? `: ${json.error_description}` : ''
    throw new Error(`Token request failed — ${error}${description}`)
  }

  if (typeof json.access_token !== 'string') {
    throw new Error('Token endpoint response did not include an access_token')
  }

  return {
    accessToken: json.access_token,
    tokenType: typeof json.token_type === 'string' ? json.token_type : 'Bearer',
    expiresIn: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : undefined,
    scope: typeof json.scope === 'string' ? json.scope : undefined,
  }
}
