/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollSpy, flattenNavItemIds } from '@core/hooks/useScrollSpy'

// A controllable IntersectionObserver mock — captures the callback so the test
// can drive intersection changes.
let ioCallback: IntersectionObserverCallback
class MockIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function entry(id: string, isIntersecting: boolean) {
  return { isIntersecting, target: document.getElementById(id)! } as IntersectionObserverEntry
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('flattenNavItemIds', () => {
  it('collects only leaf ids, in document order (skips group parents)', () => {
    const ids = flattenNavItemIds([
      { id: 'porttype-A', children: [{ id: 'op-a1' }, { id: 'op-a2' }] },
      { id: 'types', children: [{ id: 'type-X' }] },
      { id: 'lonely' },
    ])
    expect(ids).toEqual(['op-a1', 'op-a2', 'type-X', 'lonely'])
  })
})

describe('useScrollSpy', () => {
  it('tracks the topmost section currently in the top band', () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    for (const id of ['op-a', 'op-b']) {
      const el = document.createElement('div')
      el.id = id
      document.body.appendChild(el)
    }

    const { result } = renderHook(() => useScrollSpy(['op-a', 'op-b']))
    expect(result.current).toBeUndefined()

    // op-b scrolls into the top band.
    act(() => ioCallback([entry('op-b', true)], {} as IntersectionObserver))
    expect(result.current).toBe('op-b')

    // op-a is also in the band → the topmost (earliest in the list) wins.
    act(() => ioCallback([entry('op-a', true)], {} as IntersectionObserver))
    expect(result.current).toBe('op-a')

    // op-a leaves → falls back to op-b.
    act(() => ioCallback([entry('op-a', false)], {} as IntersectionObserver))
    expect(result.current).toBe('op-b')
  })
})
