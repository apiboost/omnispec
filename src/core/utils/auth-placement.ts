/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { AppliedAuthLocation, AppliedAuthValue, AuthScheme } from '../types/auth.types'

/** Applied credentials split by where they travel on the wire. */
export interface AuthPlacement {
  /** Credentials sent as request headers (`in: header`, HTTP Basic/Bearer, OAuth2, ...). */
  headers: Record<string, string>
  /** `in: query` apiKeys — appended to the request URL query string. */
  queryParams: Record<string, string>
  /** `in: cookie` apiKeys, keyed by cookie name. */
  cookies: Record<string, string>
  /**
   * `cookies` serialized as a single `Cookie` header value (`a=1; b=2`), or
   * undefined when no cookie credential is applied.
   */
  cookieHeader?: string
}

function locationFor(value: AppliedAuthValue, schemes: AuthScheme[]): AppliedAuthLocation {
  if (value.in) return value.in
  // Credentials persisted before `in` was recorded: recover the location from
  // the apiKey scheme they were applied under. Other scheme types are always
  // headers (Authorization), whatever `in` a malformed spec may carry.
  const scheme = schemes.find((s) => s.id === value.schemeId)
  if (scheme?.type === 'apiKey' && scheme.in) return scheme.in
  return 'header'
}

/**
 * Splits applied credentials into header / query / cookie placement, honoring
 * each apiKey scheme's OpenAPI `in`. Shared by the Try-It request builder, so
 * the request actually sent and the generated code samples agree.
 */
export function resolveAuthPlacement(
  applied: Iterable<AppliedAuthValue>,
  schemes: AuthScheme[],
): AuthPlacement {
  const placement: AuthPlacement = { headers: {}, queryParams: {}, cookies: {} }
  for (const value of applied) {
    const target = locationFor(value, schemes)
    if (target === 'query') placement.queryParams[value.headerName] = value.headerValue
    else if (target === 'cookie') placement.cookies[value.headerName] = value.headerValue
    else placement.headers[value.headerName] = value.headerValue
  }
  const cookiePairs = Object.entries(placement.cookies).map(([name, val]) => `${name}=${val}`)
  if (cookiePairs.length > 0) placement.cookieHeader = cookiePairs.join('; ')
  return placement
}
