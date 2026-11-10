/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { isPrivateIp } from '../../server/ssrf-guard'

/**
 * Maximum number of external files that can be resolved in a single spec.
 */
export const MAX_EXTERNAL_FILES = 20

/**
 * Maximum depth for nested external $ref resolution.
 */
export const MAX_EXTERNAL_DEPTH = 5

/**
 * Timeout for fetching external references (milliseconds).
 */
export const FETCH_TIMEOUT_MS = 5000

/**
 * Maximum file size for external references (2 MB).
 */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024

/**
 * Configuration options for external $ref resolution security checks.
 */
export interface ExternalRefOptions {
  /**
   * The base origin: where the spec was loaded from or, for a string/object
   * spec in a browser, the page origin. References to this origin are allowed
   * without an allow-list entry. `null` when there is no base origin (a
   * string/object spec rendered without `window`, e.g. SSR).
   */
  specOrigin: string | null

  /**
   * List of additional origins that are allowed for external references.
   * Entries are normalized with `normalizeOrigin()` before comparison; the
   * normalized origins must then match exactly (scheme + host + port).
   */
  allowedOrigins: string[]
}

/**
 * Normalizes an `externalRefOrigins` entry to its WHATWG URL origin
 * (`scheme://host[:port]`): the scheme and host are lowercased, IDN hosts are
 * converted to punycode, a default port (`:443` / `:80`) and a bare trailing
 * slash are dropped.
 *
 * Returns `null` for anything that is not a bare http(s) origin: unparseable
 * values, other schemes, and entries with a path, query, fragment,
 * credentials, or a wildcard host. No wildcard matching is supported.
 *
 * @param entry - A configured origin string.
 * @returns The normalized origin, or null when the entry is not a valid origin.
 */
export const normalizeOrigin = (entry: string): string | null => {
  let url: URL
  try {
    url = new URL(entry)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null
  }
  if (url.username || url.password) {
    return null
  }
  // A non-empty search/hash, or a `?`/`#` with nothing after it, is not a bare origin.
  if (url.pathname !== '/' || url.search || url.hash || /[?#]/.test(entry)) {
    return null
  }
  if (url.hostname.includes('*')) {
    return null
  }
  return url.origin
}

/**
 * Normalizes a list of `externalRefOrigins` entries with `normalizeOrigin()`,
 * dropping duplicates. Invalid entries are ignored (never thrown on) and
 * reported in a single warning that lists all of them.
 *
 * @param entries - The configured origins.
 * @param warn - Warning sink; defaults to `console.warn`.
 * @returns The normalized, de-duplicated origins.
 */
export const normalizeAllowedOrigins = (
  entries: readonly string[],
  // eslint-disable-next-line no-console
  warn: (message: string) => void = (message) => console.warn(message),
): string[] => {
  const origins = new Set<string>()
  const ignored: string[] = []
  for (const entry of entries) {
    const origin = typeof entry === 'string' ? normalizeOrigin(entry) : null
    if (origin) {
      origins.add(origin)
    } else {
      ignored.push(String(entry))
    }
  }
  if (ignored.length > 0) {
    warn(
      `[omnispec] Ignoring invalid externalRefOrigins entries (expected bare http(s) origins such as "https://schemas.example.com", without path, query, credentials or wildcards): ${ignored.map((e) => JSON.stringify(e)).join(', ')}`,
    )
  }
  return [...origins]
}

/**
 * Checks if an origin is allowed for external reference resolution.
 *
 * Allows:
 * - The base origin (specOrigin), when there is one. It is checked first: the
 *   spec (or page) was already loaded from there, so a portal served from
 *   `localhost` or an intranet address can still use same-origin refs.
 *
 * Then blocks:
 * - Non-http(s) URLs
 * - Literal private/reserved addresses (RFC 1918, loopback, link-local, CGNAT,
 *   IPv6 equivalents) and `localhost` / `*.localhost`, even when allow-listed.
 *   Uses the proxy's `isPrivateIp()`; no DNS lookup is done, so a public
 *   hostname that resolves to a private address is not caught here.
 *
 * Then allows:
 * - Any origin in allowedOrigins (entries are normalized; invalid ones never match)
 *
 * @param refUrl - The full (absolute) URL of the external reference.
 * @param options - Configuration with specOrigin and allowedOrigins.
 * @returns True if the origin is allowed, false otherwise.
 */
export const isOriginAllowed = (refUrl: string, options: ExternalRefOptions): boolean => {
  try {
    const url = new URL(refUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false
    }

    const refOrigin = url.origin

    // Allow references to the base origin.
    if (options.specOrigin !== null && refOrigin === options.specOrigin) {
      return true
    }

    // Block private/reserved IP addresses to prevent SSRF attacks.
    if (isPrivateIp(url.hostname)) {
      return false
    }

    // Allow references to any configured allowed origin.
    if (options.allowedOrigins.some((entry) => normalizeOrigin(entry) === refOrigin)) {
      return true
    }

    return false
  } catch {
    // Invalid URL — block it.
    return false
  }
}

/**
 * Resolves a $ref URL relative to a base URL.
 *
 * @param ref - The $ref string (can be relative or absolute).
 * @param baseUrl - The base URL to resolve relative refs against.
 * @returns The absolute URL, or the original ref if resolution fails.
 */
export const resolveRefUrl = (ref: string, baseUrl: string): string => {
  try {
    return new URL(ref, baseUrl).href
  } catch {
    // If resolution fails, return ref as-is.
    return ref
  }
}

/**
 * Fetches an external reference with security and size constraints.
 *
 * Enforces:
 * - Timeout: FETCH_TIMEOUT_MS
 * - Content-Length header check against MAX_FILE_SIZE_BYTES
 * - Response body size check against MAX_FILE_SIZE_BYTES
 *
 * @param url - The URL to fetch.
 * @returns Promise that resolves to the response text.
 * @throws If fetch fails, times out, or exceeds size limits.
 */
export const fetchExternalRef = async (url: string): Promise<string> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, application/yaml, text/yaml, text/plain',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch external ref: ${response.status} ${response.statusText}`)
    }

    // Check Content-Length header if present.
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > MAX_FILE_SIZE_BYTES) {
        throw new Error(
          `External ref exceeds size limit: ${size} bytes > ${MAX_FILE_SIZE_BYTES} bytes`,
        )
      }
    }

    const text = await response.text()

    // Check actual response body size.
    if (text.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `External ref body exceeds size limit: ${text.length} bytes > ${MAX_FILE_SIZE_BYTES} bytes`,
      )
    }

    return text
  } finally {
    clearTimeout(timeoutId)
  }
}
