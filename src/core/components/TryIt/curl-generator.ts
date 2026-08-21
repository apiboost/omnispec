/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { TryItRequest } from '../../types/try-it.types'

export function generateCurl(request: TryItRequest, serverUrl: string): string {
  const parts: string[] = ['curl']

  // Method
  if (request.method.toUpperCase() !== 'GET') {
    parts.push(`-X ${request.method.toUpperCase()}`)
  }

  // Build URL
  let url = serverUrl + request.url
  for (const [key, value] of Object.entries(request.pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value))
  }

  // Query params
  const queryEntries = Object.entries(request.queryParams)
  if (queryEntries.length > 0) {
    const params = new URLSearchParams()
    for (const [key, value] of queryEntries) {
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v)
      } else {
        params.set(key, value)
      }
    }
    url += `?${params.toString()}`
  }

  parts.push(`'${url}'`)

  // Headers
  for (const [key, value] of Object.entries(request.headers)) {
    parts.push(`-H '${key}: ${value}'`)
  }

  // Multipart body — one -F per form part (curl sets the boundary itself).
  if (request.body && typeof request.body !== 'string') {
    request.body.forEach((value, key) => {
      if (typeof value === 'string') {
        parts.push(`-F '${key}=${value.replace(/'/g, "'\\''")}'`)
      } else {
        // File part — reference the local file with @.
        parts.push(`-F '${key}=@${value.name || 'file'}'`)
      }
    })
    return parts.join(' \\\n  ')
  }

  // Body
  if (request.body && typeof request.body === 'string') {
    if (request.bodyType === 'application/x-www-form-urlencoded') {
      try {
        const parsed = JSON.parse(request.body)
        for (const [key, value] of Object.entries(parsed)) {
          parts.push(`--data-urlencode '${key}=${String(value)}'`)
        }
      } catch {
        const escaped = request.body.replace(/'/g, "'\\''")
        parts.push(`-d '${escaped}'`)
      }
    } else {
      const escaped = request.body.replace(/'/g, "'\\''")
      parts.push(`-d '${escaped}'`)
    }
  }

  return parts.join(' \\\n  ')
}
