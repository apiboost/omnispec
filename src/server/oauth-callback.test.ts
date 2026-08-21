/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { createOAuthCallbackRoute } from './oauth-callback'
import { OAUTH2_REDIRECT_HTML } from '../core/utils/oauth-callback-html'

function mockResponse() {
  const res = {
    type: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
  }
  res.type.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res as unknown as Response & typeof res
}

describe('createOAuthCallbackRoute', () => {
  it('serves the oauth2-redirect HTML page', () => {
    const handler = createOAuthCallbackRoute()
    const res = mockResponse()

    handler({} as Request, res, vi.fn())

    expect(res.type).toHaveBeenCalledWith('html')
    expect(res.send).toHaveBeenCalledWith(OAUTH2_REDIRECT_HTML)
  })

  it('forbids caching so a rotated page is never served stale', () => {
    const handler = createOAuthCallbackRoute()
    const res = mockResponse()

    handler({} as Request, res, vi.fn())

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })
})
