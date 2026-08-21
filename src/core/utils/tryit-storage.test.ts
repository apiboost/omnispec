/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { loadTryItState, saveTryItState, clearTryItState } from './tryit-storage'

const SPEC = 'Petstore@1.0.0'
const OP = 'GET /pets/{id}'

/** In-memory Storage — the test environment's localStorage global is a stub. */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k)
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
  }
}

describe('tryit-storage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    })
  })

  it('round-trips state per spec + operation', () => {
    saveTryItState(SPEC, OP, {
      paramValues: { id: '42' },
      body: '{"a":1}',
      contentType: 'application/json',
      formFields: { note: 'hi' },
    })
    const loaded = loadTryItState(SPEC, OP)
    expect(loaded).toEqual({
      paramValues: { id: '42' },
      body: '{"a":1}',
      contentType: 'application/json',
      formFields: { note: 'hi' },
    })
  })

  it('namespaces by spec and operation', () => {
    saveTryItState(SPEC, OP, { body: 'one' })
    saveTryItState(SPEC, 'POST /pets', { body: 'two' })
    saveTryItState('Other@2.0.0', OP, { body: 'three' })

    expect(loadTryItState(SPEC, OP)?.body).toBe('one')
    expect(loadTryItState(SPEC, 'POST /pets')?.body).toBe('two')
    expect(loadTryItState('Other@2.0.0', OP)?.body).toBe('three')
  })

  it('returns null for missing or invalid entries', () => {
    expect(loadTryItState(SPEC, OP)).toBeNull()
    window.localStorage.setItem(`omnispec:tryit:${SPEC}:${OP}`, 'not-json{{{')
    expect(loadTryItState(SPEC, OP)).toBeNull()
  })

  it('is a no-op without a spec key', () => {
    saveTryItState(undefined, OP, { body: 'x' })
    expect(window.localStorage.length).toBe(0)
    expect(loadTryItState(undefined, OP)).toBeNull()
  })

  it('clears a single operation entry', () => {
    saveTryItState(SPEC, OP, { body: 'one' })
    saveTryItState(SPEC, 'POST /pets', { body: 'two' })
    clearTryItState(SPEC, OP)
    expect(loadTryItState(SPEC, OP)).toBeNull()
    expect(loadTryItState(SPEC, 'POST /pets')?.body).toBe('two')
  })

  describe('TTL expiration', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns entries younger than the TTL', () => {
      saveTryItState(SPEC, OP, { body: 'fresh' })
      expect(loadTryItState(SPEC, OP, 3600)?.body).toBe('fresh')
    })

    it('discards and removes entries older than the TTL', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-15T10:00:00Z'))
      saveTryItState(SPEC, OP, { body: 'stale' })

      vi.setSystemTime(new Date('2026-07-15T12:00:01Z'))
      expect(loadTryItState(SPEC, OP, 7200)).toBeNull()
      expect(window.localStorage.length).toBe(0)
    })

    it('never expires when no TTL is given', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-15T10:00:00Z'))
      saveTryItState(SPEC, OP, { body: 'kept' })

      vi.setSystemTime(new Date('2027-07-15T10:00:00Z'))
      expect(loadTryItState(SPEC, OP)?.body).toBe('kept')
    })

    it('ttl of 0 disables persistence (nothing restored)', () => {
      saveTryItState(SPEC, OP, { body: 'ignored' })
      expect(loadTryItState(SPEC, OP, 0)).toBeNull()
    })

    it('discards legacy bare-state entries when a TTL is configured', () => {
      // Pre-envelope format: state saved without a timestamp.
      window.localStorage.setItem(`omnispec:tryit:${SPEC}:${OP}`, JSON.stringify({ body: 'legacy' }))
      expect(loadTryItState(SPEC, OP, 3600)).toBeNull()
      expect(window.localStorage.length).toBe(0)
    })

    it('still restores legacy bare-state entries when no TTL is configured', () => {
      window.localStorage.setItem(`omnispec:tryit:${SPEC}:${OP}`, JSON.stringify({ body: 'legacy' }))
      expect(loadTryItState(SPEC, OP)?.body).toBe('legacy')
    })
  })
})
