/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { RequestHandler } from 'express'
import { OAUTH2_REDIRECT_HTML } from '../core/utils/oauth-callback-html'

/**
 * Creates an Express handler that serves the OAuth redirect page used by the
 * Try-It PKCE flow. Mount it on the path registered as the OAuth redirect URI
 * with your identity provider — it must be the SAME ORIGIN as the page that
 * renders the API documentation.
 *
 * @example
 * ```ts
 * import { createOAuthCallbackRoute } from '@apiboost/omnispec-pro/server'
 * app.get('/oauth2-redirect.html', createOAuthCallbackRoute())
 * ```
 */
export const createOAuthCallbackRoute = (): RequestHandler => {
  return (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.type('html').send(OAUTH2_REDIRECT_HTML)
  }
}
