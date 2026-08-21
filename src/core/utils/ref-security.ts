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
   * The origin of the specification being rendered.
   * References to this origin are automatically allowed.
   */
  specOrigin: string

  /**
   * List of additional origins that are allowed for external references.
   * Origins must match exactly (scheme + host + port).
   */
  allowedOrigins: string[]
}

/**
 * Checks if an origin is allowed for external reference resolution.
 *
 * Blocks:
 * - Private/reserved IP addresses (RFC 1918, loopback, link-local, IPv6 equivalents)
 * - Origins not matching specOrigin or allowedOrigins
 *
 * Allows:
 * - The spec's own origin (specOrigin)
 * - Any origin in allowedOrigins
 *
 * @param refUrl - The full URL of the external reference.
 * @param options - Configuration with specOrigin and allowedOrigins.
 * @returns True if the origin is allowed, false otherwise.
 */
export const isOriginAllowed = (refUrl: string, options: ExternalRefOptions): boolean => {
  try {
    const url = new URL(refUrl)
    const hostname = url.hostname

    // Block private/reserved IP addresses to prevent SSRF attacks.
    if (isPrivateIp(hostname)) {
      return false
    }

    const refOrigin = `${url.protocol}//${url.host}`

    // Allow references to the spec's own origin.
    if (refOrigin === options.specOrigin) {
      return true
    }

    // Allow references to any configured allowed origin.
    if (options.allowedOrigins.includes(refOrigin)) {
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
