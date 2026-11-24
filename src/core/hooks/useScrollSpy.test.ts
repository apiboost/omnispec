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
import { renderHook, act, waitFor } from '@testing-library/react'
import { useScrollSpy, flattenNavItemIds } from '@core/hooks/useScrollSpy'

// A controllable IntersectionObserver mock — captures the callback so the test
// can drive intersection changes.
let ioCallback: IntersectionObserverCallback
let ioOptions: IntersectionObserverInit | undefined
const observedNodes = new Set<Element>()
class MockIntersectionObserver {
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    ioCallback = cb
    ioOptions = options
  }
  observe(el: Element) {
    observedNodes.add(el)
  }
  unobserve(el: Element) {
    observedNodes.delete(el)
  }
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
  observedNodes.clear()
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

  it('clears the active section once the reader scrolls back above the first one', () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    for (const id of ['op-a', 'op-b']) {
      const el = document.createElement('div')
      el.id = id
      document.body.appendChild(el)
    }
    const band = { top: 0, bottom: 160 } as DOMRectReadOnly
    const at = (id: string, top: number, isIntersecting: boolean) => {
      const target = document.getElementById(id)!
      target.getBoundingClientRect = () => ({ top }) as DOMRect
      return { isIntersecting, target, rootBounds: band } as unknown as IntersectionObserverEntry
    }

    const { result } = renderHook(() => useScrollSpy(['op-a', 'op-b']))

    act(() => ioCallback([at('op-a', -400, false), at('op-b', 40, true)], {} as IntersectionObserver))
    expect(result.current).toBe('op-b')

    // Between sections mid-page: the last active id is kept.
    act(() => ioCallback([at('op-b', -20, false)], {} as IntersectionObserver))
    expect(result.current).toBe('op-b')

    // Back at the top: the first section now starts below the band.
    act(() => ioCallback([at('op-a', 600, false), at('op-b', 900, false)], {} as IntersectionObserver))
    expect(result.current).toBeUndefined()
  })
})

describe('useScrollSpy element replacement', () => {
  it('re-observes a section whose element is replaced after mount', async () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    const original = document.createElement('div')
    original.id = 'op-a'
    document.body.appendChild(original)

    renderHook(() => useScrollSpy(['op-a']))
    expect(observedNodes.has(original)).toBe(true)

    // A parent re-mounts the content: same id, new node.
    const replacement = document.createElement('div')
    replacement.id = 'op-a'
    original.replaceWith(replacement)

    await waitFor(() => expect(observedNodes.has(replacement)).toBe(true))
    expect(observedNodes.has(original)).toBe(false)
  })

  it('starts the default band below the sticky mobile nav bar', async () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    const bar = document.createElement('div')
    bar.className = 'omnispec-mobile-nav'
    bar.style.top = '69px'
    Object.defineProperty(bar, 'offsetHeight', { value: 48 })
    document.body.appendChild(bar)
    const section = document.createElement('div')
    section.id = 'op-a'
    document.body.appendChild(section)
    window.innerHeight = 700

    renderHook(() => useScrollSpy(['op-a']))

    // Inset 69 + 48 = 117px; the band is the top 20% of the remaining 583px.
    await waitFor(() => expect(ioOptions?.rootMargin).toBe('-117px 0px -466px 0px'))
  })

  it('uses an explicit rootMargin as given', () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    renderHook(() => useScrollSpy(['op-a'], '0px 0px -50% 0px'))
    expect(ioOptions?.rootMargin).toBe('0px 0px -50% 0px')
  })
})
