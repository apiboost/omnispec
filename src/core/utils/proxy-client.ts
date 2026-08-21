/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ProxyRequest, ProxyResponse, TryItRequest, TryItResponse } from '../types/try-it.types'

export async function sendProxiedRequest(
  proxyUrl: string,
  request: TryItRequest,
  /**
   * Headers attached to the request the BROWSER sends TO the proxy
   * endpoint — not to the upstream target. Use for custom auth /
   * referer guards on the consumer's own backend. `Content-Type` is
   * always set; anything here takes precedence.
   */
  proxyHeaders?: Record<string, string>,
): Promise<TryItResponse> {
  const targetUrl = buildTargetUrl(request)

  const proxyPayload: ProxyRequest = {
    url: targetUrl,
    method: request.method,
    headers: request.headers,
    timeout: 30000,
  }

  if (request.body) {
    if (typeof request.body === 'string') {
      proxyPayload.body = request.body
      proxyPayload.bodyEncoding = 'utf-8'
    } else {
      // FormData: encode the real multipart payload (with boundary) and ship
      // it base64 inside the JSON envelope. The proxy decodes it back to bytes
      // and forwards it unchanged, so file uploads survive the round trip.
      const { body, contentType } = await encodeMultipartBody(request.body)
      proxyPayload.body = body
      proxyPayload.bodyEncoding = 'base64'
      proxyPayload.headers = { ...proxyPayload.headers, 'Content-Type': contentType }
    }
  }

  const startTime = performance.now()

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...proxyHeaders },
    body: JSON.stringify(proxyPayload),
  })

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`)
  }

  const proxyResponse: ProxyResponse = await response.json()
  const duration = performance.now() - startTime

  return {
    status: proxyResponse.status,
    statusText: proxyResponse.statusText,
    headers: proxyResponse.headers,
    body: proxyResponse.body,
    bodyEncoding: proxyResponse.bodyEncoding ?? 'utf-8',
    contentType: proxyResponse.headers['content-type'] ?? 'text/plain',
    duration: proxyResponse.duration ?? duration,
  }
}

/**
 * Serializes a FormData instance to its real `multipart/form-data` wire format
 * (including the boundary) and returns it base64-encoded, plus the exact
 * Content-Type header (with boundary) to forward. Manual serialization keeps
 * behavior identical across browsers, jsdom, and Node.
 */
/** Reads a Blob/File into bytes, falling back to FileReader where Blob.arrayBuffer is unavailable. */
async function blobToBytes(value: Blob): Promise<Uint8Array> {
  if (typeof value.arrayBuffer === 'function') {
    return new Uint8Array(await value.arrayBuffer())
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(value)
  })
}

async function encodeMultipartBody(formData: FormData): Promise<{ body: string; contentType: string }> {
  const boundary = `----omnispec${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const push = (s: string) => chunks.push(encoder.encode(s))

  const entries: Array<[string, FormDataEntryValue]> = []
  formData.forEach((value, key) => entries.push([key, value]))

  for (const [key, value] of entries) {
    push(`--${boundary}\r\n`)
    if (typeof value === 'string') {
      push(`Content-Disposition: form-data; name="${key}"\r\n\r\n`)
      push(`${value}\r\n`)
    } else {
      const filename = value.name || 'file'
      const fileType = value.type || 'application/octet-stream'
      push(`Content-Disposition: form-data; name="${key}"; filename="${filename}"\r\n`)
      push(`Content-Type: ${fileType}\r\n\r\n`)
      chunks.push(await blobToBytes(value))
      push('\r\n')
    }
  }
  push(`--${boundary}--\r\n`)

  const total = chunks.reduce((n, c) => n + c.length, 0)
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    bytes.set(c, offset)
    offset += c.length
  }

  // Convert to base64 in chunks to avoid call-stack limits on large files.
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return { body: btoa(binary), contentType: `multipart/form-data; boundary=${boundary}` }
}

function buildTargetUrl(request: TryItRequest): string {
  let url = request.url

  // Replace path parameters
  for (const [key, value] of Object.entries(request.pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value))
  }

  // Add query parameters
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
