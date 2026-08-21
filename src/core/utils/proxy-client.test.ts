/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendProxiedRequest } from './proxy-client'
import type { ProxyRequest } from '../types/try-it.types'

function mockProxyFetch() {
  const calls: Array<{ url: string; init: RequestInit }> = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(
      JSON.stringify({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"ok":true}',
        bodyEncoding: 'utf-8',
        duration: 5,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }))
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendProxiedRequest', () => {
  it('sends string bodies utf-8 encoded in the JSON envelope', async () => {
    const calls = mockProxyFetch()
    await sendProxiedRequest('/api/proxy', {
      url: 'https://api.example.com/things',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      pathParams: {},
      queryParams: {},
      body: '{"a":1}',
      bodyType: 'application/json',
    })

    const payload = JSON.parse(calls[0].init.body as string) as ProxyRequest
    expect(payload.body).toBe('{"a":1}')
    expect(payload.bodyEncoding).toBe('utf-8')
  })

  it('base64-encodes FormData bodies with the real multipart payload (regression: FormData was JSON-flattened)', async () => {
    const calls = mockProxyFetch()
    const formData = new FormData()
    formData.append('description', 'my avatar')
    formData.append('file', new File(['fake-binary-content'], 'avatar.png', { type: 'image/png' }))

    await sendProxiedRequest('/api/proxy', {
      url: 'https://api.example.com/upload',
      method: 'POST',
      headers: {},
      pathParams: {},
      queryParams: {},
      body: formData,
      bodyType: 'multipart/form-data',
    })

    const payload = JSON.parse(calls[0].init.body as string) as ProxyRequest
    expect(payload.bodyEncoding).toBe('base64')
    expect(payload.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/)

    // Decode and verify the real multipart wire format survived.
    const decoded = atob(payload.body!)
    expect(decoded).toContain('name="description"')
    expect(decoded).toContain('my avatar')
    expect(decoded).toContain('filename="avatar.png"')
    expect(decoded).toContain('fake-binary-content')
    // The old bug produced a flat JSON object — make sure that shape is gone.
    expect(payload.body).not.toContain('{"description"')
  })
})
