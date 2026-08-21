/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { attachStyleMirror } from './style-injection'

describe('attachStyleMirror', () => {
  let host: HTMLElement
  let shadow: ShadowRoot
  let detach: (() => void) | null = null

  beforeEach(() => {
    document.head.querySelectorAll('style[data-emotion]').forEach((el) => el.remove())
    host = document.createElement('div')
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
  })

  afterEach(() => {
    if (detach) detach()
    detach = null
    host.remove()
    document.head.querySelectorAll('style[data-emotion]').forEach((el) => el.remove())
  })

  it('mirrors existing emotion styles into the shadow root on attach', () => {
    const style = document.createElement('style')
    style.setAttribute('data-emotion', 'css 1abc')
    style.textContent = '.css-1abc { color: red; }'
    document.head.appendChild(style)

    detach = attachStyleMirror({ shadow })

    const mirrorContainer = shadow.querySelector('[data-omnispec-style-mirror]')
    expect(mirrorContainer).not.toBeNull()
    const mirrored = mirrorContainer?.querySelector('style[data-emotion]')
    expect(mirrored).not.toBeNull()
    expect(mirrored?.textContent).toContain('color: red')
  })

  it('mirrors emotion styles added after attach', async () => {
    detach = attachStyleMirror({ shadow })

    const style = document.createElement('style')
    style.setAttribute('data-emotion', 'css 2def')
    style.textContent = '.css-2def { color: blue; }'
    document.head.appendChild(style)

    // Wait a microtask + macrotask for MutationObserver to fire.
    await new Promise((resolve) => setTimeout(resolve, 50))

    const mirrored = shadow.querySelector('[data-omnispec-style-mirror] style[data-emotion]')
    expect(mirrored).not.toBeNull()
    expect(mirrored?.textContent).toContain('color: blue')
  })

  it('cleans up the mirror container on detach', () => {
    detach = attachStyleMirror({ shadow })
    expect(shadow.querySelector('[data-omnispec-style-mirror]')).not.toBeNull()
    detach()
    detach = null
    expect(shadow.querySelector('[data-omnispec-style-mirror]')).toBeNull()
  })

  it('returns a no-op teardown when MutationObserver is unavailable', () => {
    const original = globalThis.MutationObserver
    // @ts-expect-error — intentionally removing for the test
    delete globalThis.MutationObserver
    const teardown = attachStyleMirror({ shadow })
    expect(typeof teardown).toBe('function')
    // Should not throw.
    teardown()
    globalThis.MutationObserver = original
  })
})
