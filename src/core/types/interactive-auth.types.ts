/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ComponentType } from 'react'
import type { AuthScheme, AppliedAuthValue } from './auth.types'

/**
 * Props an interactive-auth component receives from `AuthPanel`. Everything else
 * the interactive flow needs (`proxyUrl`, `proxyHeaders`, `oauth`,
 * `externalRefOrigins`) is read from the shared `ConfigContext` via `useConfig()`
 * — deliberately NOT prop-drilled here.
 *
 * Interactive-auth components (the OAuth 2.0 "Get Token" flow, OIDC discovery)
 * live in `@apiboost/omnispec-pro` and are supplied to the free core by value on
 * `ProFeatures.interactiveAuth`. When none is supplied — or the consumer opts out
 * via `interactiveOAuth={false}` — `AuthPanel` renders the free manual shell.
 */
export interface InteractiveAuthProps {
  scheme: AuthScheme
  serverUrl?: string
  appliedValue?: AppliedAuthValue
  applied: boolean
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
}

export type InteractiveAuthComponent = ComponentType<InteractiveAuthProps>

/** Interactive-auth components keyed by security-scheme type, supplied by Pro. */
export interface InteractiveAuthRegistry {
  oauth2?: InteractiveAuthComponent
  openIdConnect?: InteractiveAuthComponent
}
