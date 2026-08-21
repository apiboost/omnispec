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
import {
  isBinaryContentType,
  bytesToBase64,
  base64ToBlob,
  filenameForResponse,
} from './binary-response'

describe('isBinaryContentType', () => {
  it.each([
    'application/pdf',
    'application/octet-stream',
    'application/zip',
    'image/png',
    'image/jpeg; charset=binary',
    'audio/mpeg',
    'video/mp4',
    'font/woff2',
  ])('treats %s as binary', (ct) => {
    expect(isBinaryContentType(ct)).toBe(true)
  })

  it.each([
    'application/json',
    'application/json; charset=utf-8',
    'application/problem+json',
    'application/xml',
    'application/hal+json',
    'application/vnd.api+json',
    'text/plain',
    'text/html',
    'text/csv',
    '',
  ])('treats %s as text', (ct) => {
    expect(isBinaryContentType(ct)).toBe(false)
  })
})

describe('base64 round trip', () => {
  it('encodes bytes and decodes into a Blob of the same size', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255])
    const b64 = bytesToBase64(bytes)
    const blob = base64ToBlob(b64, 'application/octet-stream')
    expect(blob.size).toBe(bytes.length)
    expect(blob.type).toBe('application/octet-stream')
  })
})

describe('filenameForResponse', () => {
  it('uses Content-Disposition filename when present', () => {
    expect(
      filenameForResponse(
        { 'Content-Disposition': 'attachment; filename="report.pdf"' },
        'application/pdf',
      ),
    ).toBe('report.pdf')
  })

  it('handles RFC 5987 encoded filenames', () => {
    expect(
      filenameForResponse(
        { 'content-disposition': "attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf" },
        'application/pdf',
      ),
    ).toBe('résumé.pdf')
  })

  it('derives an extension from the content type otherwise', () => {
    expect(filenameForResponse({}, 'application/pdf')).toBe('response.pdf')
    expect(filenameForResponse({}, 'image/png')).toBe('response.png')
    expect(filenameForResponse({}, 'application/octet-stream')).toBe('response.bin')
  })
})
