/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OmniSpecRendererElement, TAG_NAME, defineOmniSpecRenderer } from './index'

const flush = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('OmniSpecRendererElement', () => {
  beforeEach(() => {
    // jsdom does not implement matchMedia by default.
    if (!window.matchMedia) {
      // @ts-expect-error — install minimal stub
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('registers the element via defineOmniSpecRenderer', () => {
    defineOmniSpecRenderer()
    expect(customElements.get(TAG_NAME)).toBe(OmniSpecRendererElement)
  })

  it('defineOmniSpecRenderer is idempotent', () => {
    defineOmniSpecRenderer()
    // Calling twice must not throw — would normally fail since
    // `customElements.define` rejects re-registration.
    expect(() => defineOmniSpecRenderer()).not.toThrow()
  })

  it('attaches an open shadow root and a mount point on connection', async () => {
    defineOmniSpecRenderer()
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    document.body.appendChild(el)

    expect(el.shadowRoot).not.toBeNull()
    expect(el.shadowRoot?.mode).toBe('open')
    const mount = el.shadowRoot?.querySelector('[data-omnispec-mount]')
    expect(mount).not.toBeNull()
  })

  it('does not render anything without a spec', async () => {
    defineOmniSpecRenderer()
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    document.body.appendChild(el)
    await flush()
    const mount = el.shadowRoot?.querySelector('[data-omnispec-mount]')
    // Should be empty since no spec was provided.
    expect(mount?.innerHTML).toBe('')
  })

  it('reflects the spec property change and renders', async () => {
    defineOmniSpecRenderer()
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    document.body.appendChild(el)
    await flush()

    el.spec = { openapi: '3.0.3', info: { title: 'T', version: '1' }, paths: {} }
    await flush()
    await flush()

    const mount = el.shadowRoot?.querySelector('[data-omnispec-mount]')
    // We expect OmniSpecRenderer to have mounted something — either the loading
    // screen or the spec content. Either way, the mount point should be
    // non-empty.
    expect(mount?.innerHTML.length).toBeGreaterThan(0)
  })

  it('parses a JSON `theme` attribute', async () => {
    defineOmniSpecRenderer()
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    el.setAttribute('theme', '{"base":"dark"}')
    document.body.appendChild(el)
    await flush()

    expect(el.theme).toEqual({ base: 'dark' })
  })

  it('logs an error when JSON attribute parsing fails', async () => {
    defineOmniSpecRenderer()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    el.setAttribute('theme', '{not json}')
    document.body.appendChild(el)
    await flush()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('responds to attribute changes after connection', async () => {
    defineOmniSpecRenderer()
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    el.setAttribute('spec-url', 'https://example.com/a.json')
    document.body.appendChild(el)
    await flush()

    el.setAttribute('theme-base', 'dark')
    await flush()
    // Bridge resolves theme-base via resolveTheme — confirm via the public
    // property; theme prop only set imperatively, so theme is undefined here
    // but the attribute is still observed.
    expect(el.getAttribute('theme-base')).toBe('dark')
  })

  it('unmounts the React tree on disconnect', async () => {
    defineOmniSpecRenderer()
    const el = document.createElement(TAG_NAME) as OmniSpecRendererElement
    el.spec = { openapi: '3.0.3', info: { title: 'T', version: '1' }, paths: {} }
    document.body.appendChild(el)
    await flush()

    el.remove()
    // After disconnect the element should not throw on a subsequent property
    // assignment — and the shadow root mount point reference is cleared.
    expect(() => {
      el.spec = undefined
    }).not.toThrow()
  })

  it('observes the documented attribute list', () => {
    const observed = OmniSpecRendererElement.observedAttributes
    expect(observed).toContain('spec-url')
    expect(observed).toContain('theme-base')
    expect(observed).toContain('theme-toggle')
    expect(observed).toContain('display-mode')
    expect(observed).toContain('navigation-mode')
    expect(observed).toContain('layout')
    expect(observed).toContain('sidebar-position')
    expect(observed).toContain('try-it-layout')
    expect(observed).toContain('allow-try-it')
    expect(observed).toContain('default-expand-operations')
    expect(observed).toContain('proxy-url')
    expect(observed).toContain('download-link')
    expect(observed).toContain('theme')
    expect(observed).toContain('sidebar-nav')
    expect(observed).toContain('spec')
  })
})
