/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import http from 'node:http'
import zlib from 'node:zlib'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { createProxyRouter } from './proxy-router'
import type { ProxyRouterOptions } from './proxy-router'
import type * as SsrfGuard from './ssrf-guard'

/**
 * The upstream test server listens on 127.0.0.1, which the real guard blocks.
 * Treat exactly that address as "public" so tests can reach it; every other
 * address (169.254.169.254, 10/8, ::1, ...) keeps its real verdict.
 */
const TEST_UPSTREAM_IP = '127.0.0.1'
vi.mock('./ssrf-guard', async (importActual) => {
  const actual = await importActual<typeof SsrfGuard>()
  return {
    ...actual,
    isPrivateIp: (h: string) => (h === TEST_UPSTREAM_IP ? false : actual.isPrivateIp(h)),
    isBlockedAddress: (ip: string) => (ip === TEST_UPSTREAM_IP ? false : actual.isBlockedAddress(ip)),
  }
})

interface Hit {
  method: string
  url: string
  headers: http.IncomingHttpHeaders
  body: string
}

let upstream: http.Server
let upstreamPort: number
let hits: Hit[] = []

/** Routes on the upstream server, keyed by path. */
const routes: Record<string, (req: http.IncomingMessage, res: http.ServerResponse, body: string) => void> = {
  '/ok': (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"ok":true}')
  },
  '/echo': (req, res, body) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ headers: req.headers, length: Buffer.byteLength(body) }))
  },
  '/redirect-metadata': (_req, res) => {
    res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/' })
    res.end()
  },
  // Generic redirect: /redirect?to=<url>&code=<3xx>
  '/redirect': (req, res) => {
    const q = new URL(req.url ?? '/', 'http://x').searchParams
    res.writeHead(Number(q.get('code') ?? 302), { location: q.get('to') ?? '/final' })
    res.end()
  },
  '/redirect-same-host': (_req, res) => {
    res.writeHead(302, { location: '/final' })
    res.end()
  },
  '/gzip': (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip' })
    res.end(zlib.gzipSync('{"compressed":true}'))
  },
  '/big': (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('x'.repeat(4096))
  },
  '/final': (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('final')
  },
}

beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      hits.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body })
      const handler = routes[(req.url ?? '').split('?')[0]]
      if (handler) handler(req, res, body)
      else {
        res.writeHead(404)
        res.end()
      }
    })
  })
  await new Promise<void>((resolve) => upstream.listen(0, TEST_UPSTREAM_IP, resolve))
  upstreamPort = (upstream.address() as AddressInfo).port
})

afterAll(async () => {
  await new Promise<void>((resolve) => upstream.close(() => resolve()))
})

beforeEach(() => {
  hits = []
})

/** Mounts the router in a throwaway Express app and returns a request helper. */
const startProxy = async (options: ProxyRouterOptions = {}, configure?: (app: express.Express) => void) => {
  const app = express()
  configure?.(app)
  app.use('/api/proxy', createProxyRouter({ rateLimitPerMinute: 1000, ...options }))
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = (server.address() as AddressInfo).port
  const send = async (envelope: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/proxy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof envelope === 'string' ? envelope : JSON.stringify(envelope),
    })
    const text = await res.text()
    let json: Record<string, unknown> = {}
    try {
      json = JSON.parse(text)
    } catch {
      // Non-JSON error body.
    }
    return { status: res.status, json }
  }
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()))
  return { send, close }
}

const upstreamUrl = (path: string) => `http://${TEST_UPSTREAM_IP}:${upstreamPort}${path}`

describe('createProxyRouter — redirects', () => {
  it('does not follow a redirect to the cloud metadata service; returns the 3xx to the client', async () => {
    const proxy = await startProxy({}, (app) => app.use(express.json()))
    try {
      const { status, json } = await proxy.send({
        url: upstreamUrl('/redirect-metadata'),
        method: 'GET',
        headers: { 'X-API-Key': 'secret' },
        timeout: 1000,
      })
      expect(status).toBe(200)
      expect(json.status).toBe(302)
      expect((json.headers as Record<string, string>).location).toBe(
        'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
      )
    } finally {
      await proxy.close()
    }
  })

  it('does not follow even a same-host redirect by default', async () => {
    const proxy = await startProxy({}, (app) => app.use(express.json()))
    try {
      const { json } = await proxy.send({ url: upstreamUrl('/redirect-same-host'), method: 'GET', headers: {} })
      expect(json.status).toBe(302)
      expect(hits.map((h) => h.url)).toEqual(['/redirect-same-host'])
    } finally {
      await proxy.close()
    }
  })
})

/** A mocked resolver that answers per-hostname and records every call. */
const mockResolver = (table: Record<string, string[] | (() => string[])>) => {
  const calls: string[] = []
  const lookup = vi.fn(async (hostname: string) => {
    calls.push(hostname)
    const entry = table[hostname]
    const addrs = typeof entry === 'function' ? entry() : entry
    if (!addrs) throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' })
    return addrs.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }))
  })
  return { lookup, calls }
}

describe('createProxyRouter — DNS resolution and pinning', () => {
  it('blocks a public hostname that resolves to the metadata address', async () => {
    const { lookup } = mockResolver({ 'evil.example': ['169.254.169.254'] })
    const proxy = await startProxy({ dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      const { status, json } = await proxy.send({ url: 'http://evil.example/latest/meta-data/', method: 'GET', headers: {} })
      expect(status).toBe(403)
      expect(String(json.error)).toMatch(/private|internal/i)
    } finally {
      await proxy.close()
    }
  })

  it.each([
    [['10.0.0.5']],
    [['127.0.0.2']],
    [['::1']],
    [['::ffff:7f00:1']],
    [['fd00:ec2::254']],
    [['100.64.1.1']],
  ])('blocks a hostname resolving to %j', async (addrs) => {
    const { lookup } = mockResolver({ 'internal.example': addrs })
    const proxy = await startProxy({ dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      const { status } = await proxy.send({ url: 'http://internal.example/', method: 'GET', headers: {} })
      expect(status).toBe(403)
    } finally {
      await proxy.close()
    }
  })

  it('validates every resolved address, not just the first', async () => {
    const { lookup } = mockResolver({ 'mixed.example': [TEST_UPSTREAM_IP, '10.0.0.1'] })
    const proxy = await startProxy({ dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      const { status } = await proxy.send({ url: `http://mixed.example:${upstreamPort}/ok`, method: 'GET', headers: {} })
      expect(status).toBe(403)
      expect(hits).toHaveLength(0)
    } finally {
      await proxy.close()
    }
  })

  it('pins the connection to the validated address (DNS rebinding)', async () => {
    // First answer is acceptable; any later re-resolution flips to metadata.
    let n = 0
    const { lookup, calls } = mockResolver({
      'rebind.example': () => (n++ === 0 ? [TEST_UPSTREAM_IP] : ['169.254.169.254']),
    })
    const proxy = await startProxy({ dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      const { status, json } = await proxy.send({
        url: `http://rebind.example:${upstreamPort}/ok`,
        method: 'GET',
        headers: {},
        timeout: 2000,
      })
      expect(status).toBe(200)
      expect(json.status).toBe(200)
      expect(json.body).toBe('{"ok":true}')
      // Resolved once, checked once, connected to exactly that address.
      expect(calls).toEqual(['rebind.example'])
      expect(hits).toHaveLength(1)
    } finally {
      await proxy.close()
    }
  })

  it('keeps the original Host header when connecting to the pinned address', async () => {
    const { lookup } = mockResolver({ 'api.example': [TEST_UPSTREAM_IP] })
    const proxy = await startProxy({ dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      await proxy.send({ url: `http://api.example:${upstreamPort}/echo`, method: 'GET', headers: {} })
      expect(hits[0].headers.host).toBe(`api.example:${upstreamPort}`)
    } finally {
      await proxy.close()
    }
  })

  it('rejects non-http(s) target schemes', async () => {
    const proxy = await startProxy({}, (app) => app.use(express.json()))
    try {
      const { status } = await proxy.send({ url: 'file:///etc/passwd', method: 'GET', headers: {} })
      expect(status).toBe(400)
    } finally {
      await proxy.close()
    }
  })
})

describe('createProxyRouter — upstream responses', () => {
  it('decompresses gzip responses like fetch did', async () => {
    const proxy = await startProxy({}, (app) => app.use(express.json()))
    try {
      const { json } = await proxy.send({ url: upstreamUrl('/gzip'), method: 'GET', headers: {} })
      expect(json.body).toBe('{"compressed":true}')
    } finally {
      await proxy.close()
    }
  })

  it('rejects an upstream response larger than maxBodySize with 502', async () => {
    const proxy = await startProxy({ maxBodySize: 1024 }, (app) => app.use(express.json()))
    try {
      const { status, json } = await proxy.send({ url: upstreamUrl('/big'), method: 'GET', headers: {} })
      expect(status).toBe(502)
      expect(json.statusText).toBe('Response too large')
    } finally {
      await proxy.close()
    }
  })
})

describe('createProxyRouter — opt-in redirect following (maxRedirects)', () => {
  const redirectTo = (to: string, code = 302) =>
    upstreamUrl(`/redirect?to=${encodeURIComponent(to)}&code=${code}`)

  it('follows a same-origin redirect and keeps the request headers', async () => {
    const proxy = await startProxy({ maxRedirects: 3 }, (app) => app.use(express.json()))
    try {
      const { json } = await proxy.send({
        url: redirectTo('/echo'),
        method: 'GET',
        headers: { 'X-API-Key': 'k', Authorization: 'Bearer t' },
      })
      expect(json.status).toBe(200)
      expect(hits.map((h) => h.url.split('?')[0])).toEqual(['/redirect', '/echo'])
      expect(hits[1].headers['x-api-key']).toBe('k')
      expect(hits[1].headers.authorization).toBe('Bearer t')
    } finally {
      await proxy.close()
    }
  })

  it('re-runs the SSRF guard on every hop (redirect to metadata is blocked)', async () => {
    const proxy = await startProxy({ maxRedirects: 3 }, (app) => app.use(express.json()))
    try {
      const { status } = await proxy.send({
        url: redirectTo('http://169.254.169.254/latest/meta-data/'),
        method: 'GET',
        headers: { 'X-API-Key': 'k' },
        timeout: 1000,
      })
      expect(status).toBe(403)
    } finally {
      await proxy.close()
    }
  })

  it('re-runs the guarded DNS lookup on every hop', async () => {
    const { lookup } = mockResolver({ 'rebound.example': ['10.1.1.1'] })
    const proxy = await startProxy({ maxRedirects: 3, dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      const { status } = await proxy.send({ url: redirectTo('http://rebound.example/'), method: 'GET', headers: {} })
      expect(status).toBe(403)
    } finally {
      await proxy.close()
    }
  })

  it('re-checks allowedDomains on every hop', async () => {
    const { lookup } = mockResolver({
      'api.allowed.example': [TEST_UPSTREAM_IP],
      'elsewhere.example': [TEST_UPSTREAM_IP],
    })
    const proxy = await startProxy(
      { maxRedirects: 3, dnsLookup: lookup, allowedDomains: ['allowed.example'] },
      (app) => app.use(express.json()),
    )
    try {
      const to = `http://elsewhere.example:${upstreamPort}/echo`
      const { status } = await proxy.send({
        url: `http://api.allowed.example:${upstreamPort}/redirect?to=${encodeURIComponent(to)}`,
        method: 'GET',
        headers: {},
      })
      expect(status).toBe(403)
      expect(hits.map((h) => h.url.split('?')[0])).toEqual(['/redirect'])
    } finally {
      await proxy.close()
    }
  })

  it('drops credentials and custom headers on a cross-origin hop', async () => {
    const { lookup } = mockResolver({ 'other.example': [TEST_UPSTREAM_IP] })
    const proxy = await startProxy({ maxRedirects: 3, dnsLookup: lookup }, (app) => app.use(express.json()))
    try {
      const { json } = await proxy.send({
        url: redirectTo(`http://other.example:${upstreamPort}/echo`),
        method: 'GET',
        headers: { 'X-API-Key': 'k', Authorization: 'Bearer t', Cookie: 'sid=1', Accept: 'application/json' },
      })
      expect(json.status).toBe(200)
      const second = hits[1].headers
      expect(second['x-api-key']).toBeUndefined()
      expect(second.authorization).toBeUndefined()
      expect(second.cookie).toBeUndefined()
      expect(second.accept).toBe('application/json')
    } finally {
      await proxy.close()
    }
  })

  it('switches POST to GET without a body on 303, keeps method and body on 307', async () => {
    const proxy = await startProxy({ maxRedirects: 3 }, (app) => app.use(express.json()))
    try {
      await proxy.send({ url: redirectTo('/echo', 303), method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hi' })
      expect(hits[1].method).toBe('GET')
      expect(hits[1].body).toBe('')
      hits = []
      await proxy.send({ url: redirectTo('/echo', 307), method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hi' })
      expect(hits[1].method).toBe('POST')
      expect(hits[1].body).toBe('hi')
    } finally {
      await proxy.close()
    }
  })

  it('returns the last 3xx once maxRedirects is exhausted', async () => {
    const proxy = await startProxy({ maxRedirects: 1 }, (app) => app.use(express.json()))
    try {
      const { json } = await proxy.send({ url: redirectTo(redirectTo('/final')), method: 'GET', headers: {} })
      expect(json.status).toBe(302)
      expect(hits).toHaveLength(2)
    } finally {
      await proxy.close()
    }
  })
})
