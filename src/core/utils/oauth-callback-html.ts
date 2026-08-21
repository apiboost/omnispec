/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * postMessage discriminator used between the OAuth callback page/component
 * and the Try-It window that opened the authorization popup.
 */
export const OAUTH_CALLBACK_MESSAGE_TYPE = 'omnispec:oauth-callback'

/** Payload the callback posts back to the window that started the flow. */
export interface OAuthCallbackMessage {
  type: typeof OAUTH_CALLBACK_MESSAGE_TYPE
  code: string | null
  state: string | null
  error: string | null
  errorDescription: string | null
}

/**
 * The OAuth redirect page (Swagger UI's `oauth2-redirect.html` convention).
 * Relays the authorization response query params to the opener window via an
 * origin-locked postMessage and closes itself. The callback page must be
 * served from the SAME ORIGIN as the documentation page — the message is
 * deliberately targeted at `window.location.origin`, never `*`.
 *
 * This constant is the single source of truth: the static
 * `oauth2-redirect.html` asset at the package root and the Express route in
 * `server/oauth-callback.ts` both serve exactly this markup (a unit test
 * guards against drift).
 */
export const OAUTH2_REDIRECT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OAuth2 Redirect</title>
</head>
<body>
  <script>
    (function () {
      'use strict'
      var params = new URLSearchParams(window.location.search)
      var payload = {
        type: '${OAUTH_CALLBACK_MESSAGE_TYPE}',
        code: params.get('code'),
        state: params.get('state'),
        error: params.get('error'),
        errorDescription: params.get('error_description'),
      }
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin)
        window.close()
      } else {
        document.body.textContent =
          'This page handles OAuth redirects for the API documentation. You can close it.'
      }
    })()
  </script>
</body>
</html>
`
