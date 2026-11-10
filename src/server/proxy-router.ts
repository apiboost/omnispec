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
import { isPrivateIp, normalizeHostname } from './ssrf-guard'
import { createGuardedLookup, SsrfBlockedError } from './guarded-lookup'
import type { ProxyDnsLookup } from './guarded-lookup'
import { ResponseTooLargeError, sendUpstream } from './upstream-request'
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
  /**
   * Custom DNS resolver for target hostnames. Defaults to the OS resolver
   * (`dns.lookup`). Every address it returns is validated against the SSRF
   * blocklist, and the connection is pinned to a validated address.
   */
  dnsLookup?: ProxyDnsLookup
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
    dnsLookup,
  } = options

  const guardedLookup = createGuardedLookup(dnsLookup)

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

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https target URLs are supported' })
    }

    // SSRF protection, step 1 — block private IP literals and localhost
    // before any network activity. Step 2 (resolved addresses) runs in the
    // guarded DNS lookup at connect time.
    const hostname = normalizeHostname(targetUrl.hostname) ?? ''
    if (isPrivateIp(targetUrl.hostname)) {
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
      const upstream = await sendUpstream({
        url: targetUrl,
        method: proxyReq.method,
        headers: proxyReq.headers ?? {},
        body: outboundBody,
        signal: controller.signal,
        // Resolve once, validate every address, connect to a validated one.
        lookup: guardedLookup,
        maxResponseBytes: maxBodySize,
      })

      // Binary content types are base64-encoded so file downloads survive
      // the JSON envelope; text flows are unchanged. Redirects are never
      // followed: a 3xx and its Location header go back to the client as-is.
      const responseContentType = upstream.headers['content-type'] ?? ''
      const isBinary = isBinaryContentType(responseContentType)
      const responseBody = isBinary ? upstream.body.toString('base64') : upstream.body.toString('utf8')
      const duration = Date.now() - startTime

      const proxyRes: ProxyResponse = {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers,
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
            statusCode: upstream.status,
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
      if (err instanceof SsrfBlockedError) {
        return res.status(403).json({ error: 'Requests to private/internal addresses are not allowed' })
      }
      if (err instanceof ResponseTooLargeError) {
        return res.status(502).json({
          status: 502,
          statusText: 'Response too large',
          headers: {},
          body: err.message,
          bodyEncoding: 'utf-8',
          duration,
        } satisfies ProxyResponse)
      }
      const message = err instanceof Error ? err.message : 'Unknown error'
      const isTimeout = controller.signal.aborted

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
