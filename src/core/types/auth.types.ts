/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export type AuthSchemeType = 'apiKey' | 'http-basic' | 'http-bearer' | 'oauth2' | 'openIdConnect'

/**
 * Canonical, human-facing labels for each auth-scheme type. The Authorize tab
 * uses these instead of the raw spec value so casing stays consistent
 * (`oauth2`/`oAuth2` in a spec both render as "OAuth2"). See ABOSPEC-215.
 */
const AUTH_SCHEME_LABELS: Record<AuthSchemeType, string> = {
  apiKey: 'API Key',
  'http-basic': 'Basic Auth',
  'http-bearer': 'Bearer Token',
  oauth2: 'OAuth2',
  openIdConnect: 'OpenID Connect',
}

/**
 * The canonical display label for an auth-scheme type. Use this for the
 * human-facing tab/label rather than the per-scheme `id` (which stays for
 * disambiguating multiple schemes of the same type).
 */
export function authSchemeLabel(type: AuthSchemeType): string {
  return AUTH_SCHEME_LABELS[type]
}

export interface AuthScheme {
  id: string
  type: AuthSchemeType
  displayName: string
  description?: string
  in?: 'header' | 'query' | 'cookie'
  name?: string
  scheme?: 'basic' | 'bearer'
  flows?: OAuth2Flows
  /**
   * OpenID Connect discovery document URL (the `openIdConnectUrl` of an
   * `openIdConnect` security scheme). At Try-It time the OpenID configuration is
   * fetched from here and its `authorization_endpoint` / `token_endpoint` /
   * `scopes_supported` are mapped into {@link flows} so the Authorize panel
   * renders identically to a declared `oauth2` scheme. See ABOSPEC-215.
   */
  openIdConnectUrl?: string
  /**
   * Raw scheme-level vendor extensions (any `x-*` key from the security scheme),
   * carried verbatim. The free core does not interpret these; Pro reads them
   * (e.g. `x-tokenEndpointAuthMethod`) for the interactive OAuth flow.
   */
  extensions?: Record<string, unknown>
}

export interface OAuth2Flows {
  authorizationCode?: OAuth2Flow
  implicit?: OAuth2Flow
  clientCredentials?: OAuth2Flow
  password?: OAuth2Flow
}

export interface OAuth2Flow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
  /**
   * Raw flow-level vendor extensions (any `x-*` key on the flow), carried
   * verbatim. The free core does not interpret these; Pro reads them (e.g.
   * `x-flowVariables`) for the interactive OAuth flow. Kept at the flow level
   * because `x-flowVariables` is per-flow.
   */
  extensions?: Record<string, unknown>
}

/** Configuration for the interactive OAuth 2.0 Try-It flow. */
export interface OAuthConfig {
  /**
   * Redirect URI registered with the identity provider. Relative paths
   * resolve against the current origin. Defaults to
   * `{origin}/oauth2-redirect.html`. The callback page must be served from
   * the same origin as the documentation page.
   */
  redirectUri?: string
  /** Send PKCE parameters with the authorization-code flow. Defaults to true. */
  usePkce?: boolean
}

export interface AppliedAuthValue {
  schemeId: string
  headerName: string
  headerValue: string
  /**
   * The raw values the user typed (e.g. `{ token }`, `{ username, password }`),
   * kept so the Authorize form can be prefilled when credentials are restored
   * from persistence. Never shown unmasked until the user reveals it.
   */
  input?: Record<string, string>
}
