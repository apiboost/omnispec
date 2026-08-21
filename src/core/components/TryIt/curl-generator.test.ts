/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { generateCurl } from './curl-generator'

describe('generateCurl', () => {
  it('generates basic GET request', () => {
    const result = generateCurl({
      url: '/users',
      method: 'GET',
      headers: {},
      queryParams: {},
      pathParams: {},
    }, 'https://api.example.com')

    expect(result).toContain('curl')
    expect(result).toContain("'https://api.example.com/users'")
    expect(result).not.toContain('-X')
  })

  it('generates POST with body and headers', () => {
    const result = generateCurl({
      url: '/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token123' },
      queryParams: {},
      pathParams: {},
      body: '{"name":"John"}',
    }, 'https://api.example.com')

    expect(result).toContain('-X POST')
    expect(result).toContain("-H 'Content-Type: application/json'")
    expect(result).toContain("-H 'Authorization: Bearer token123'")
    expect(result).toContain('-d')
    expect(result).toContain('{"name":"John"}')
  })

  it('handles path parameters', () => {
    const result = generateCurl({
      url: '/users/{id}',
      method: 'GET',
      headers: {},
      queryParams: {},
      pathParams: { id: '42' },
    }, 'https://api.example.com')

    expect(result).toContain('/users/42')
    expect(result).not.toContain('{id}')
  })

  it('handles query parameters', () => {
    const result = generateCurl({
      url: '/users',
      method: 'GET',
      headers: {},
      queryParams: { page: '1', limit: '10' },
      pathParams: {},
    }, 'https://api.example.com')

    expect(result).toContain('page=1')
    expect(result).toContain('limit=10')
  })

  it('generates -F parts for multipart FormData bodies', () => {
    const formData = new FormData()
    formData.append('description', "a user's avatar")
    formData.append('file', new File(['binary'], 'avatar.png', { type: 'image/png' }))

    const result = generateCurl({
      url: '/upload',
      method: 'POST',
      headers: {},
      queryParams: {},
      pathParams: {},
      body: formData,
      bodyType: 'multipart/form-data',
    }, 'https://api.example.com')

    expect(result).toContain('-X POST')
    expect(result).toContain("-F 'description=a user'\\''s avatar'")
    expect(result).toContain("-F 'file=@avatar.png'")
    expect(result).not.toContain('-d ')
  })
})
