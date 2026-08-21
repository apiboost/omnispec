/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect, useState } from 'react'
import { OAUTH_CALLBACK_MESSAGE_TYPE } from '@core/utils/oauth-callback-html'
import type { OAuthCallbackMessage } from '@core/utils/oauth-callback-html'

/**
 * React form of the OAuth redirect page for hosts that route with an SPA
 * router instead of serving the static `oauth2-redirect.html` asset or the
 * Express route. Render it on the path registered as the OAuth redirect URI —
 * it must be served from the SAME ORIGIN as the documentation page. It relays
 * the authorization response to the opener via an origin-locked postMessage
 * and closes the popup.
 */
export function OAuthCallback() {
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const opener: Window | null = window.opener
    if (!opener) {
      setStandalone(true)
      return
    }
    const params = new URLSearchParams(window.location.search)
    const payload: OAuthCallbackMessage = {
      type: OAUTH_CALLBACK_MESSAGE_TYPE,
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error'),
      errorDescription: params.get('error_description'),
    }
    opener.postMessage(payload, window.location.origin)
    window.close()
  }, [])

  if (!standalone) return null

  return (
    <p>This page handles OAuth redirects for the API documentation. You can close it.</p>
  )
}
