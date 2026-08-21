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
import { render, screen, cleanup } from '@testing-library/react'
import { OAuthCallback } from '@core/components/Auth/OAuthCallback'
import { OAUTH_CALLBACK_MESSAGE_TYPE } from '@core/utils/oauth-callback-html'

// jsdom has no `opener` property on window — define one per test.
function setOpener(opener: unknown) {
  Object.defineProperty(window, 'opener', { value: opener, configurable: true, writable: true })
}

describe('OAuthCallback', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    setOpener(null)
    window.history.replaceState({}, '', '/')
  })

  it('posts code and state from the query string to the opener, targeting its own origin', () => {
    const postMessage = vi.fn()
    setOpener({ postMessage })
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    window.history.replaceState({}, '', '/oauth2-redirect.html?code=abc123&state=st-1')

    render(<OAuthCallback />)

    expect(postMessage).toHaveBeenCalledWith(
      {
        type: OAUTH_CALLBACK_MESSAGE_TYPE,
        code: 'abc123',
        state: 'st-1',
        error: null,
        errorDescription: null,
      },
      window.location.origin,
    )
    expect(close).toHaveBeenCalled()
  })

  it('relays provider errors (error / error_description)', () => {
    const postMessage = vi.fn()
    setOpener({ postMessage })
    vi.spyOn(window, 'close').mockImplementation(() => {})
    window.history.replaceState({}, '', '/oauth2-redirect.html?error=access_denied&error_description=User+cancelled&state=st-2')

    render(<OAuthCallback />)

    expect(postMessage).toHaveBeenCalledWith(
      {
        type: OAUTH_CALLBACK_MESSAGE_TYPE,
        code: null,
        state: 'st-2',
        error: 'access_denied',
        errorDescription: 'User cancelled',
      },
      window.location.origin,
    )
  })

  it('shows guidance instead of posting when opened without an opener window', () => {
    setOpener(null)

    render(<OAuthCallback />)

    expect(screen.getByText(/handles OAuth redirects/i)).toBeInTheDocument()
  })
})
