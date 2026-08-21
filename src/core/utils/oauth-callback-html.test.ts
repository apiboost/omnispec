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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OAUTH2_REDIRECT_HTML, OAUTH_CALLBACK_MESSAGE_TYPE } from '@core/utils/oauth-callback-html'

describe('OAUTH2_REDIRECT_HTML', () => {
  it('posts the omnispec callback message type to the opener', () => {
    expect(OAUTH_CALLBACK_MESSAGE_TYPE).toBe('omnispec:oauth-callback')
    expect(OAUTH2_REDIRECT_HTML).toContain(OAUTH_CALLBACK_MESSAGE_TYPE)
    expect(OAUTH2_REDIRECT_HTML).toContain('window.opener.postMessage')
  })

  it('targets its own origin — never a wildcard', () => {
    expect(OAUTH2_REDIRECT_HTML).toContain('window.location.origin')
    expect(OAUTH2_REDIRECT_HTML).not.toMatch(/postMessage\([^)]*['"]\*['"]/)
  })

  it('relays code, state, and OAuth error params from the query string', () => {
    for (const param of ['code', 'state', 'error', 'error_description']) {
      expect(OAUTH2_REDIRECT_HTML).toContain(`'${param}'`)
    }
  })

  it('matches the static oauth2-redirect.html asset shipped at the package root', () => {
    // vitest runs with cwd at the package root, where the asset lives
    const asset = readFileSync(join(process.cwd(), 'oauth2-redirect.html'), 'utf-8')
    expect(asset).toBe(OAUTH2_REDIRECT_HTML)
  })
})
