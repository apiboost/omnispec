/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { TryItRequest, TryItResponse } from '../types/try-it.types'
import { isBinaryContentType, bytesToBase64 } from './binary-response'

export async function sendDirectRequest(
  request: TryItRequest,
): Promise<TryItResponse> {
  const url = upgradeMixedContent(buildTargetUrl(request))

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
  }

  if (request.body) {
    init.body = typeof request.body === 'string' ? request.body : request.body
  }

  const startTime = performance.now()

  const response = await fetch(url, init)

  const duration = performance.now() - startTime
  const contentType = response.headers.get('content-type') ?? 'text/plain'

  // Binary responses are read as bytes and base64-encoded so the UI can offer
  // a download instead of mangling them through .text().
  let body: string
  let bodyEncoding: 'utf-8' | 'base64' = 'utf-8'
  if (isBinaryContentType(contentType)) {
    body = bytesToBase64(new Uint8Array(await response.arrayBuffer()))
    bodyEncoding = 'base64'
  } else {
    body = await response.text()
  }

  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
    bodyEncoding,
    contentType,
    duration,
  }
}

/**
 * Upgrade an `http://` target to `https://` when the page itself is served over
 * https. Browsers block plain-http requests from an https page as mixed content
 * (the fetch never leaves the browser), and many specs still declare a stale
 * `http://` server URL. Only upgrades on secure pages — on an http page a real
 * http-only API (e.g. a local dev server) must still be reachable.
 */
export function upgradeMixedContent(url: string): string {
  if (
    typeof window !== 'undefined' &&
    window.location?.protocol === 'https:' &&
    url.startsWith('http://')
  ) {
    return `https://${url.slice('http://'.length)}`
  }
  return url
}

function buildTargetUrl(request: TryItRequest): string {
  let url = request.url

  for (const [key, value] of Object.entries(request.pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value))
  }

  const queryEntries = Object.entries(request.queryParams)
  if (queryEntries.length > 0) {
    const params = new URLSearchParams()
    for (const [key, value] of queryEntries) {
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v)
        }
      } else {
        params.set(key, value)
      }
    }
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}${params.toString()}`
  }

  return url
}
