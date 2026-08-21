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

/**
 * Client-authentication method for the OAuth 2.0 token endpoint (RFC 6749 §2.3.1):
 * - `'header'` — `client_secret_basic`: credentials in the `Authorization: Basic` header.
 * - `'body'`   — `client_secret_post`: credentials in the form body.
 */
export type ClientAuthMethod = 'header' | 'body'

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
   * Preselected token-endpoint client-authentication method, sourced from the
   * `x-tokenEndpointAuthMethod` vendor extension on an OAuth2 scheme
   * (`client_secret_basic`→`'header'`, `client_secret_post`→`'body'`). Absent
   * when the extension is not present, in which case the UI defaults to
   * `'header'` (Authorization Header).
   */
  tokenEndpointAuthMethod?: ClientAuthMethod
}

export interface OAuth2Flows {
  authorizationCode?: OAuth2Flow
  implicit?: OAuth2Flow
  clientCredentials?: OAuth2Flow
  password?: OAuth2Flow
}

/**
 * A single templating variable for an OAuth flow URL, sourced from the
 * `x-flowVariables` vendor extension (ABOSPEC-221). Mirrors the shape of an
 * OpenAPI Server Variable Object: a `default`, an optional `enum` of allowed
 * values (rendered as a dropdown), and an optional `description`.
 */
export interface OAuth2FlowVariable {
  default: string
  enum?: string[]
  description?: string
}

export interface OAuth2Flow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
  /**
   * Templating variables for this flow's URLs, from the `x-flowVariables`
   * OmniSpec extension. Values substitute into `{name}` placeholders in
   * `tokenUrl` / `authorizationUrl` / `refreshUrl` (before relative-URL
   * resolution against the selected server), letting one spec Try-It OAuth
   * across multiple environments / tenants / a third-party IdP. See
   * ABOSPEC-221 (fills the OAI/OpenAPI-Specification#551 gap).
   */
  variables?: Record<string, OAuth2FlowVariable>
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
