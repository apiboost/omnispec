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

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Browser-reachable code must never import Node built-ins or server-only
 * modules: the web component bundle (webpack) cannot resolve `node:*`, and
 * consumers bundling the core for the browser would break the same way.
 * Only `src/server/` (and tests) may do so.
 */
const SRC = path.resolve(__dirname)
const SERVER = path.join(SRC, 'server')
const SOURCE = /\.(ts|tsx|js|jsx|mts|cts)$/
const TEST = /\.(test|spec|stories)\.[^.]+$/

const NODE_BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'events', 'fs',
  'http', 'http2', 'https', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
  'querystring', 'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url',
  'util', 'v8', 'vm', 'worker_threads', 'zlib',
])

const listFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (full === SERVER || entry.name === '__fixtures__' || entry.name === 'node_modules') return []
      return listFiles(full)
    }
    return SOURCE.test(entry.name) && !TEST.test(entry.name) ? [full] : []
  })

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g

const forbidden = (spec: string, file: string): string | null => {
  if (spec.startsWith('node:')) return 'Node built-in'
  const bare = spec.split('/')[0]
  if (NODE_BUILTINS.has(spec) || (NODE_BUILTINS.has(bare) && !spec.startsWith('.'))) return 'Node built-in'
  if (spec.startsWith('.')) {
    const resolved = path.resolve(path.dirname(file), spec)
    if (resolved === SERVER || resolved.startsWith(SERVER + path.sep)) return 'server-only module'
  }
  if (/(^|\/)server(\/|$)/.test(spec)) return 'server-only module'
  return null
}

describe('browser import boundary', () => {
  it('no file outside src/server imports a Node built-in or a server/ module', () => {
    const violations: string[] = []
    for (const file of listFiles(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(SPECIFIER)) {
        const reason = forbidden(match[1], file)
        if (reason) violations.push(`${path.relative(SRC, file)}: ${match[1]} (${reason})`)
      }
    }
    expect(violations).toEqual([])
  })

  it('detects a violation (self-check)', () => {
    const file = path.join(SRC, 'core/utils/example.ts')
    expect(forbidden('node:net', file)).not.toBeNull()
    expect(forbidden('net', file)).not.toBeNull()
    expect(forbidden('../../server/ssrf-guard', file)).not.toBeNull()
    expect(forbidden('@apiboost/omnispec/server', file)).not.toBeNull()
    expect(forbidden('./ip-classify', file)).toBeNull()
    expect(forbidden('react', file)).toBeNull()
  })
})
