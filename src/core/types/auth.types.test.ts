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
import { authSchemeLabel } from './auth.types'
import type { AuthSchemeType } from './auth.types'

describe('authSchemeLabel', () => {
  it('returns the canonical label for every scheme type', () => {
    const expected: Record<AuthSchemeType, string> = {
      apiKey: 'API Key',
      'http-basic': 'Basic Auth',
      'http-bearer': 'Bearer Token',
      oauth2: 'OAuth2',
      openIdConnect: 'OpenID Connect',
    }
    for (const [type, label] of Object.entries(expected) as [AuthSchemeType, string][]) {
      expect(authSchemeLabel(type)).toBe(label)
    }
  })
})
