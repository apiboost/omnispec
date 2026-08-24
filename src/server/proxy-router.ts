/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import type { ProxyRequest, ProxyResponse } from '../core/types/try-it.types'
import { isPrivateIp } from './ssrf-guard'
import { isBinaryContentType } from '../core/utils/binary-response'

export interface ProxyRouterOptions {
  /** Max requests per minute per IP. Default: 60. */
  rateLimitPerMinute?: number
  /** Max timeout for proxied requests in ms. Default: 30000. */
  maxTimeout?: number
  /** Max request/response body size in bytes. Default: 1048576 (1MB). */
  maxBodySize?: number
  /** Allowed target domains. Empty array = allow all external. */
  allowedDomains?: string[]
  /** Audit callback fired after each proxy request completes. */
  onRequest?: (audit: ProxyAuditEntry) => void
}

export interface ProxyAuditEntry {
  targetUrl: string
  method: string
  statusCode: number
  duration: number
  timestamp: string
  ip: string
}

const DEFAULT_RATE_LIMIT = 60
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_BODY = 1_048_576

/**
 * Creates an Express router that proxies Try-It requests to external APIs.
 *
 * @param options - Configuration for rate limiting, timeouts, SSRF protection.
 * @returns Express Router to mount at your proxy path (e.g. `/api/proxy`).
 *
 * @example
 * ```ts
 * import { createProxyRouter } from '@apiboost/omnispec/server'
 * app.use('/api/proxy', createProxyRouter({ rateLimitPerMinute: 60 }))
 * ```
 */
export const createProxyRouter = (options: ProxyRouterOptions = {}): Router => {
  const {
    rateLimitPerMinute = DEFAULT_RATE_LIMIT,
    maxTimeout = DEFAULT_TIMEOUT,
    maxBodySize = DEFAULT_MAX_BODY,
    allowedDomains = [],
    onRequest,
  } = options

  const router = Router()

  // Rate limiting — try to use express-rate-limit if available, otherwise
  // fall back to a simple in-memory counter.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rateLimit = require('express-rate-limit').default ?? require('express-rate-limit')
    router.use(
      rateLimit({
        windowMs: 60_000,
        max: rateLimitPerMinute,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many proxy requests. Please try again later.' },
      }),
    )
  } catch {
    // express-rate-limit not installed — use basic in-memory limiter.
    const hits = new Map<string, { count: number; resetAt: number }>()
    router.use((req: Request, res: Response, next) => {
      const key = req.ip ?? 'unknown'
      const now = Date.now()
      const entry = hits.get(key)

      if (!entry || now > entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + 60_000 })
        return next()
      }

      if (entry.count >= rateLimitPerMinute) {
        return res.status(429).json({ error: 'Too many proxy requests. Please try again later.' })
      }

      entry.count++
      return next()
    })
  }

  router.post('/', async (req: Request, res: Response) => {
    const proxyReq = req.body as ProxyRequest

    // Validate required fields.
    if (!proxyReq?.url || !proxyReq?.method) {
      return res.status(400).json({ error: 'Missing required fields: url, method' })
    }

    // Validate URL format.
    let targetUrl: URL
    try {
      targetUrl = new URL(proxyReq.url)
    } catch {
      return res.status(400).json({ error: 'Invalid target URL' })
    }

    // SSRF protection — block private IPs.
    const hostname = targetUrl.hostname
    if (isPrivateIp(hostname)) {
      return res.status(403).json({ error: 'Requests to private/internal addresses are not allowed' })
    }

    // Domain allowlist (if configured).
    if (allowedDomains.length > 0) {
      const allowed = allowedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      )
      if (!allowed) {
        return res.status(403).json({ error: `Domain ${hostname} is not in the allowed list` })
      }
    }

    // Enforce body size limit.
    if (proxyReq.body && proxyReq.body.length > maxBodySize) {
      return res.status(413).json({ error: `Request body exceeds ${maxBodySize} byte limit` })
    }

    const timeout = Math.min(proxyReq.timeout ?? maxTimeout, maxTimeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    const startTime = Date.now()

    // Decode base64-encoded bodies (used for multipart/form-data uploads —
    // the client serializes the real multipart payload and base64-encodes it
    // to fit the JSON envelope) back to raw bytes before forwarding.
    let outboundBody: string | Buffer | undefined = proxyReq.body ?? undefined
    if (outboundBody !== undefined && proxyReq.bodyEncoding === 'base64') {
      try {
        outboundBody = Buffer.from(outboundBody as string, 'base64')
      } catch {
        return res.status(400).json({ error: 'Invalid base64 request body' })
      }
    }

    try {
      const fetchResponse = await fetch(proxyReq.url, {
        method: proxyReq.method,
        headers: proxyReq.headers ?? {},
        // Buffer is a Uint8Array at runtime; Node's fetch accepts it. The DOM
        // BodyInit typing doesn't know that, hence the cast.
        body: outboundBody as BodyInit | undefined,
        signal: controller.signal,
      })

      // Binary content types are read as bytes and base64-encoded so file
      // downloads survive the JSON envelope; text flows are unchanged.
      const responseContentType = fetchResponse.headers.get('content-type') ?? ''
      const isBinary = isBinaryContentType(responseContentType)
      const responseBody = isBinary
        ? Buffer.from(await fetchResponse.arrayBuffer()).toString('base64')
        : await fetchResponse.text()
      const duration = Date.now() - startTime

      // Enforce response body size limit.
      if (responseBody.length > maxBodySize) {
        return res.status(502).json({
          status: 502,
          statusText: 'Response too large',
          headers: {},
          body: `Response body exceeds ${maxBodySize} byte limit`,
          bodyEncoding: 'utf-8' as const,
          duration,
        })
      }

      const responseHeaders: Record<string, string> = {}
      fetchResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const proxyRes: ProxyResponse = {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: responseHeaders,
        body: responseBody,
        bodyEncoding: isBinary ? 'base64' : 'utf-8',
        duration,
      }

      // Fire audit callback (non-blocking).
      if (onRequest) {
        try {
          onRequest({
            targetUrl: proxyReq.url,
            method: proxyReq.method,
            statusCode: fetchResponse.status,
            duration,
            timestamp: new Date().toISOString(),
            ip: req.ip ?? 'unknown',
          })
        } catch {
          // Audit must never block the response.
        }
      }

      return res.json(proxyRes)
    } catch (err) {
      const duration = Date.now() - startTime
      const message = err instanceof Error ? err.message : 'Unknown error'
      const isTimeout = message.includes('abort')

      return res.status(isTimeout ? 504 : 502).json({
        status: isTimeout ? 504 : 502,
        statusText: isTimeout ? 'Gateway Timeout' : 'Bad Gateway',
        headers: {},
        body: message,
        bodyEncoding: 'utf-8',
        duration,
      } satisfies ProxyResponse)
    } finally {
      clearTimeout(timeoutId)
    }
  })

  return router
}
