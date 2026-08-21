/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/** Text-ish content types that must NOT be treated as binary. */
const TEXT_TYPES = [
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'application/javascript',
  'application/ecmascript',
  'application/x-www-form-urlencoded',
  'application/yaml',
  'application/x-yaml',
  'application/graphql',
  'application/ld+json',
  'application/problem+json',
  'application/hal+json',
]

/**
 * Returns true when a response content type should be treated as binary
 * (downloaded rather than displayed as text).
 */
export function isBinaryContentType(contentType: string): boolean {
  const ct = contentType.split(';')[0].trim().toLowerCase()
  if (!ct) return false
  if (ct.startsWith('text/')) return false
  if (TEXT_TYPES.includes(ct)) return false
  // Structured syntax suffixes (+json / +xml) are text.
  if (ct.endsWith('+json') || ct.endsWith('+xml')) return false
  return (
    ct.startsWith('image/') ||
    ct.startsWith('audio/') ||
    ct.startsWith('video/') ||
    ct.startsWith('font/') ||
    ct.startsWith('application/')
  )
}

/** Chunked bytes → base64 (avoids call-stack limits on large payloads). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** base64 → Blob with the given content type. */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}

const EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/gzip': 'gz',
  'application/octet-stream': 'bin',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
}

/**
 * Derives a download filename: Content-Disposition `filename` when present,
 * otherwise `response.{ext}` from the content type.
 */
export function filenameForResponse(headers: Record<string, string>, contentType: string): string {
  const disposition = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === 'content-disposition',
  )?.[1]
  if (disposition) {
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1].trim())
      } catch {
        return match[1].trim()
      }
    }
  }
  const ct = contentType.split(';')[0].trim().toLowerCase()
  const ext = EXTENSION_MAP[ct] ?? ct.split('/')[1]?.replace(/[^a-z0-9]/g, '') ?? 'bin'
  return `response.${ext || 'bin'}`
}
