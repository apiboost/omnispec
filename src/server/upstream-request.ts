/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import http from 'node:http'
import https from 'node:https'
import zlib from 'node:zlib'
import type { Readable } from 'node:stream'
import type { LookupFunction } from 'node:net'

export interface UpstreamRequest {
  url: URL
  method: string
  headers: Record<string, string>
  body?: string | Buffer
  signal: AbortSignal
  /** Guarded resolver: validates and pins the connect address. */
  lookup: LookupFunction
  /** Max decoded response body size in bytes. */
  maxResponseBytes: number
}

export interface UpstreamResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: Buffer
}

/** Thrown when the upstream response body exceeds `maxResponseBytes`. */
export class ResponseTooLargeError extends Error {
  constructor(limit: number) {
    super(`Response body exceeds ${limit} byte limit`)
    this.name = 'ResponseTooLargeError'
  }
}

const decoderFor = (encoding: string | undefined): zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress | null => {
  switch ((encoding ?? '').trim().toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return zlib.createGunzip()
    case 'deflate':
      return zlib.createInflate()
    case 'br':
      return zlib.createBrotliDecompress()
    default:
      return null
  }
}

/**
 * Sends one HTTP(S) request to the upstream API using Node's `http`/`https`
 * modules — not `fetch` — so the connection can be pinned to the address the
 * SSRF guard validated (via `lookup`) and redirects are never followed.
 *
 * Each request gets its own socket (`agent: false`), so no pooled connection
 * established for one hostname is reused for another. The response body is
 * decompressed (gzip/deflate/br, as `fetch` would) and capped at
 * `maxResponseBytes` *after* decompression, so a compression bomb cannot
 * exhaust memory.
 */
export const sendUpstream = (req: UpstreamRequest): Promise<UpstreamResponse> =>
  new Promise((resolve, reject) => {
    const transport = req.url.protocol === 'https:' ? https : http
    const headers: Record<string, string> = { ...req.headers }
    const hasHeader = (name: string) => Object.keys(headers).some((k) => k.toLowerCase() === name)
    if (!hasHeader('accept-encoding')) headers['accept-encoding'] = 'gzip, deflate, br'
    if (req.body !== undefined) headers['content-length'] = String(Buffer.byteLength(req.body))

    const clientReq = transport.request(req.url, {
      method: req.method,
      headers,
      signal: req.signal,
      lookup: req.lookup,
      agent: false,
    })

    clientReq.on('error', reject)
    clientReq.on('response', (res) => {
      const decoder = decoderFor(res.headers['content-encoding'] as string | undefined)
      const stream: Readable = decoder ? res.pipe(decoder) : res
      if (decoder) res.on('error', (err) => decoder.destroy(err))

      const chunks: Buffer[] = []
      let size = 0
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > req.maxResponseBytes) {
          stream.destroy(new ResponseTooLargeError(req.maxResponseBytes))
          res.destroy()
          return
        }
        chunks.push(chunk)
      })
      stream.on('error', reject)
      stream.on('end', () => {
        const flat: Record<string, string> = {}
        for (const [key, value] of Object.entries(res.headers)) {
          if (value === undefined) continue
          flat[key] = Array.isArray(value) ? value.join(', ') : value
        }
        resolve({
          status: res.statusCode ?? 502,
          statusText: res.statusMessage ?? '',
          headers: flat,
          body: Buffer.concat(chunks),
        })
      })
    })

    clientReq.end(req.body)
  })
