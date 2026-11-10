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
import type { AddressInfo } from 'node:net'
import express from 'express'
import { createProxyRouter } from './proxy-router'
import type { ProxyRouterOptions } from './proxy-router'

/**
 * The upstream test server listens on 127.0.0.1, which the real guard blocks.
 * Treat exactly that address as "public" so tests can reach it; every other
 * address (169.254.169.254, 10/8, ::1, ...) keeps its real verdict.
 */
const TEST_UPSTREAM_IP = '127.0.0.1'
vi.mock('./ssrf-guard', async (importActual) => {
  const actual = await importActual<typeof import('./ssrf-guard')>()
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
  '/redirect-same-host': (_req, res) => {
    res.writeHead(302, { location: '/final' })
    res.end()
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
