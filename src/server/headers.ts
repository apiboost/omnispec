/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { validateHeaderName, validateHeaderValue } from 'node:http'

/**
 * Hop-by-hop headers (RFC 9110 §7.6.1, plus the legacy `Keep-Alive` and
 * `Proxy-Connection`) describe a single connection and must not be relayed
 * by a proxy. `Proxy-Authorization`/`Proxy-Authenticate` are for the proxy
 * itself, never the origin.
 */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

/** Set by the proxy from the target URL / actual body, never by the caller. */
const PROXY_OWNED = new Set(['host', 'content-length'])

/** Header names listed in a `Connection` header value are hop-by-hop too. */
const connectionListed = (headers: Record<string, string>): Set<string> => {
  const value = Object.entries(headers).find(([k]) => k.toLowerCase() === 'connection')?.[1]
  return new Set(
    (value ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** Thrown when a caller-supplied header could split or corrupt the request. */
export class InvalidHeaderError extends Error {
  constructor(name: string) {
    super(`Invalid request header: ${JSON.stringify(name)}`)
    this.name = 'InvalidHeaderError'
  }
}

/**
 * Prepares the Try-It envelope's headers for the upstream request.
 *
 * - Only the envelope's `headers` are forwarded; headers the browser sent to
 *   the proxy route itself (the portal's own cookies, session tokens) never
 *   reach the target.
 * - `Cookie` **is** forwarded: it carries `in: cookie` API keys, which only a
 *   proxy can deliver (browsers forbid scripts from setting it).
 * - Hop-by-hop headers, anything listed in `Connection`, `Host` and
 *   `Content-Length` are dropped; the proxy sets the last two itself.
 * - Names/values that aren't valid HTTP tokens or contain CR/LF throw
 *   {@link InvalidHeaderError}.
 */
export const sanitizeRequestHeaders = (headers: unknown): Record<string, string> => {
  if (headers === undefined || headers === null) return {}
  if (typeof headers !== 'object' || Array.isArray(headers)) throw new InvalidHeaderError('headers')
  const input = headers as Record<string, unknown>
  const stringOnly: Record<string, string> = {}
  for (const [name, value] of Object.entries(input)) {
    if (typeof value !== 'string') throw new InvalidHeaderError(name)
    stringOnly[name] = value
  }
  const listed = connectionListed(stringOnly)
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(stringOnly)) {
    const lower = name.toLowerCase()
    if (HOP_BY_HOP.has(lower) || PROXY_OWNED.has(lower) || listed.has(lower)) continue
    try {
      validateHeaderName(name)
      validateHeaderValue(name, value)
    } catch {
      throw new InvalidHeaderError(name)
    }
    out[name] = value
  }
  return out
}

/** Removes hop-by-hop headers from the upstream response before relaying it. */
export const sanitizeResponseHeaders = (headers: Record<string, string>): Record<string, string> => {
  const listed = connectionListed(headers)
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => {
      const lower = name.toLowerCase()
      return !HOP_BY_HOP.has(lower) && !listed.has(lower)
    }),
  )
}
