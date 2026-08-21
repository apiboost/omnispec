/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { OAuth2Flow, OAuth2Flows } from '@core/types/auth.types'
import type { ProxyRequest, ProxyResponse } from '@core/types/try-it.types'

/**
 * The subset of the OpenID Provider Metadata (OpenID Connect Discovery 1.0
 * §3, RFC 8414) that the Try-It Authorize panel consumes. Everything else in
 * the discovery document is ignored.
 */
export interface OpenIdConfiguration {
  authorization_endpoint?: string
  token_endpoint?: string
  scopes_supported?: string[]
  [key: string]: unknown
}

/** Options for {@link discoverOpenIdConfiguration}. */
export interface DiscoverOptions {
  /**
   * Origins the discovery URL (and its discovered endpoints) may live on, in
   * addition to the discovery URL's own origin. Consistent with
   * `ref-security.ts`: an origin is `scheme://host[:port]`. When omitted, only
   * the discovery URL's own origin is trusted.
   */
  allowedOrigins?: string[]
  /** Try-It proxy endpoint used as a CORS fallback for the discovery fetch. */
  proxyUrl?: string
  /** Headers for the request the browser sends TO the proxy (not the IdP). */
  proxyHeaders?: Record<string, string>
}

/** Timeout for the discovery fetch (milliseconds). */
const DISCOVERY_TIMEOUT_MS = 5000

/** The scope OpenID Connect always requires (OpenID Connect Core §3.1.2.1). */
export const OPENID_SCOPE = 'openid'

/**
 * Whether `candidate` is on the discovery URL's origin or one of the extra
 * allowed origins. Mirrors `ref-security.isOriginAllowed`'s origin-equality
 * check (SSRF containment); private-IP blocking is enforced server-side by the
 * proxy's SSRF guard and, for direct fetches, by the browser's own network
 * stack, so this focuses on the origin allow-list.
 */
export function isDiscoveryOriginAllowed(
  candidate: string,
  discoveryOrigin: string,
  allowedOrigins: string[] = [],
): boolean {
  try {
    const origin = new URL(candidate).origin
    return origin === discoveryOrigin || allowedOrigins.includes(origin)
  } catch {
    return false
  }
}

/**
 * Maps an OpenID configuration into the internal {@link OAuth2Flows} model so
 * the Authorize panel renders it identically to a declared `oauth2` scheme.
 * Only the Authorization Code flow is produced — the interactive Try-It flow
 * reuses Authorization Code + PKCE (S256). The `openid` scope is always
 * included (prepended) so a discovered scheme is a valid OIDC request even when
 * `scopes_supported` omits it or is absent.
 */
export function mapOpenIdConfigToFlows(config: OpenIdConfiguration): OAuth2Flows {
  const supported = Array.isArray(config.scopes_supported) ? config.scopes_supported : []
  const scopeNames = supported.includes(OPENID_SCOPE) ? supported : [OPENID_SCOPE, ...supported]
  const scopes: Record<string, string> = {}
  for (const scope of scopeNames) {
    if (typeof scope === 'string') scopes[scope] = ''
  }

  const flow: OAuth2Flow = {
    authorizationUrl: config.authorization_endpoint,
    tokenUrl: config.token_endpoint,
    scopes,
  }
  return { authorizationCode: flow }
}

/**
 * Parses a discovery-document response body into an {@link OpenIdConfiguration},
 * validating that the endpoints it advertises are on an allowed origin.
 * Rejects malformed JSON, a missing `authorization_endpoint`/`token_endpoint`,
 * and any endpoint pointing off the allow-list.
 */
export function parseOpenIdConfiguration(
  body: string,
  discoveryUrl: string,
  allowedOrigins: string[] = [],
): OpenIdConfiguration {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    throw new Error('The OpenID configuration is not valid JSON.')
  }
  if (!json || typeof json !== 'object') {
    throw new Error('The OpenID configuration is not a valid object.')
  }

  const config = json as OpenIdConfiguration
  const { authorization_endpoint: authEndpoint, token_endpoint: tokenEndpoint } = config

  if (typeof authEndpoint !== 'string' || typeof tokenEndpoint !== 'string') {
    throw new Error(
      'The OpenID configuration is missing an authorization_endpoint or token_endpoint.',
    )
  }

  const discoveryOrigin = new URL(discoveryUrl).origin
  for (const endpoint of [authEndpoint, tokenEndpoint]) {
    if (!isDiscoveryOriginAllowed(endpoint, discoveryOrigin, allowedOrigins)) {
      throw new Error('The OpenID configuration points to a disallowed origin.')
    }
  }

  return config
}

/**
 * Fetches and validates the OpenID configuration from `discoveryUrl`. Attempts
 * a direct fetch first; when that fails at the network layer (typically CORS)
 * and a proxy is configured, retries through the Try-It proxy — the same
 * fallback the token exchange uses. The discovery URL must be on an allowed
 * origin (its own origin, or one of `allowedOrigins`) before any request is
 * made, containing SSRF the same way `ref-security.ts` does.
 *
 * @throws If the discovery URL is disallowed, unreachable, or the document is
 *   malformed. Callers surface this as a themed error and fall back to manual
 *   token paste.
 */
export async function discoverOpenIdConfiguration(
  discoveryUrl: string,
  options: DiscoverOptions = {},
): Promise<OpenIdConfiguration> {
  const { allowedOrigins = [], proxyUrl, proxyHeaders } = options

  let discoveryOrigin: string
  try {
    discoveryOrigin = new URL(discoveryUrl).origin
  } catch {
    throw new Error('The OpenID Connect discovery URL is not a valid URL.')
  }

  // The discovery URL is always allowed on its own origin; an extra allow-list
  // entry lets a spec point at a separate IdP host. Blocked before any fetch.
  if (!isDiscoveryOriginAllowed(discoveryUrl, discoveryOrigin, allowedOrigins)) {
    throw new Error('The OpenID Connect discovery URL is not on an allowed origin.')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS)
    try {
      const response = await fetch(discoveryUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(
          `The OpenID configuration could not be fetched (HTTP ${response.status}).`,
        )
      }
      return parseOpenIdConfiguration(await response.text(), discoveryUrl, allowedOrigins)
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    // A network-layer failure (CORS shows up as a TypeError) falls back to the
    // proxy when one is configured; anything else (bad HTTP, malformed doc,
    // disallowed origin) is a real failure and propagates.
    if (proxyUrl && error instanceof TypeError) {
      return discoverViaProxy(discoveryUrl, allowedOrigins, proxyUrl, proxyHeaders)
    }
    throw error
  }
}

async function discoverViaProxy(
  discoveryUrl: string,
  allowedOrigins: string[],
  proxyUrl: string,
  proxyHeaders?: Record<string, string>,
): Promise<OpenIdConfiguration> {
  const payload: ProxyRequest = {
    url: discoveryUrl,
    method: 'GET',
    headers: { Accept: 'application/json' },
    timeout: DISCOVERY_TIMEOUT_MS,
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...proxyHeaders },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(
      `The OpenID configuration could not be fetched via the proxy (HTTP ${response.status}).`,
    )
  }

  const proxyResponse: ProxyResponse = await response.json()
  if (proxyResponse.status >= 400) {
    throw new Error(
      `The OpenID configuration could not be fetched (HTTP ${proxyResponse.status}).`,
    )
  }
  return parseOpenIdConfiguration(proxyResponse.body, discoveryUrl, allowedOrigins)
}
