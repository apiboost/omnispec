/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ComponentType, ReactNode } from 'react'
import type { ThemeConfig, SlotOverrides } from './theme.types'
import type { SpecType, ContentFormat } from './spec-detection.types'
import type { TryItRequest, TryItResponse } from './try-it.types'
import type { SidebarNavConfig } from './sidebar-nav.types'
import type { OAuthConfig } from './auth.types'
import type { InteractiveAuthRegistry } from './interactive-auth.types'
import type { SchemaStyle } from '../components/SchemaViewer/schema-style'

/** Render-time server override entry (see `BaseSpecProps.servers`). */
export interface ServerOverride {
  url: string
  description?: string
}

export interface ProFeatures {
  renderers?: Map<string, ComponentType<BaseSpecProps>>
  premiumThemingEnabled?: boolean
  /** Enables the interactive OAuth 2.0 Authorization Code + PKCE flow in the Try-It Authorize panel. */
  interactiveOAuthEnabled?: boolean
  /**
   * Interactive-auth components (OAuth 2.0 "Get Token" flow, OIDC discovery)
   * supplied by Pro, keyed by security-scheme type. When present, `AuthPanel`
   * renders these instead of the free manual shells — unless the consumer opts
   * out with `interactiveOAuth={false}`.
   */
  interactiveAuth?: InteractiveAuthRegistry
  /**
   * Unlocks the Pro-only `schemaStyle` presentations (`table`, `card`). Without
   * it, the Free tier renders only `lines` and `tokens`; requesting a Pro-only
   * style resolves gracefully to `lines`.
   */
  advancedSchemaStyles?: boolean
}

export interface BaseSpecProps {
  spec: string | Record<string, unknown>
  theme?: ThemeConfig
  proxyUrl?: string
  /**
   * Additional headers attached to the request the browser sends TO
   * the configured `proxyUrl`. Useful when the consumer's backend
   * gates requests with a custom header (e.g. an `X-Referer` guard
   * or a CSRF token). Does not affect headers forwarded to the
   * upstream target — those come from the Try-It form.
   */
  proxyHeaders?: Record<string, string>
  /**
   * Interactive OAuth 2.0 Authorization Code + PKCE flow for the Try-It
   * Authorize panel. Works with zero config when the host serves the OAuth
   * callback at `/oauth2-redirect.html`; set `oauth.redirectUri` when it is
   * mounted elsewhere (e.g. `/swagger/oauth2-redirect.html`).
   */
  oauth?: OAuthConfig
  /**
   * Opt out of the interactive OAuth 2.0 "Get Token" flow (Pro). Defaults to
   * `true` (interactive when Pro is installed). Set to `false` to force the
   * manual token-paste experience even with Pro present. Has no effect without
   * Pro — the free core is manual-paste regardless.
   */
  interactiveOAuth?: boolean
  allowTryIt?: boolean
  /** URL or true (uses spec URL) to show a download button. False/undefined hides it. */
  downloadLink?: string | boolean
  layout?: 'sidebar' | 'stacked'
  sidebarPosition?: 'left' | 'right'
  tryItLayout?: 'inline' | 'panel'
  /** Whether operations are expanded by default. Defaults to false (compact). */
  defaultExpandOperations?: boolean
  /** 'compact' renders operations inline. 'reference' renders a three-panel Redocly-style layout (Pro). */
  displayMode?: 'compact' | 'reference'
  /**
   * Presentation style for the schema/property tree. `lines` (default) and
   * `tokens` are available to every tier; `table` and `card` require the Pro
   * `advancedSchemaStyles` capability and otherwise fall back to `lines`.
   */
  schemaStyle?: SchemaStyle
  /** Origins allowed for external $ref resolution. Same-origin is always allowed. */
  externalRefOrigins?: string[]
  /**
   * Force a single server URL at render time, overriding any `servers` declared
   * in the spec. Use this to point Try-It and code samples at a specific gateway
   * domain (e.g. an Azure APIM instance) without editing the spec. Takes
   * precedence over the `servers` prop and the spec's own servers.
   */
  serverUrl?: string
  /**
   * Replace the spec's `servers` list at render time. Rendered in the server
   * selector and used for Try-It / code-sample base URLs. Ignored when
   * `serverUrl` is set. Each entry is a URL with an optional description.
   */
  servers?: ServerOverride[]
  /**
   * Maximum age, in seconds, for persisted Try-It inputs (parameter values,
   * request bodies, custom headers — stored in localStorage per operation).
   * Entries older than the TTL are discarded on load. Set to `0` to disable
   * Try-It input persistence entirely. Omit for no expiration (inputs persist
   * until browser storage is cleared). Auth credentials are unaffected — they
   * always live in sessionStorage for the tab's lifetime only.
   */
  tryItPersistTtl?: number
  /** 'grouped' renders all operations on one page. 'segmented' renders one operation per view.
   *  Defaults to auto: grouped for ≤50 operations, segmented for >50. */
  navigationMode?: 'grouped' | 'segmented'
  sidebarNav?: SidebarNavConfig
  slots?: SlotOverrides
  onSpecLoaded?: (info: SpecLoadedInfo) => void
  onTryItRequest?: (request: TryItRequest) => void
  onTryItResponse?: (response: TryItResponse) => void
  pro?: ProFeatures
  className?: string
  children?: ReactNode
}

export interface SpecLoadedInfo {
  title: string
  version: string
  type: SpecType
}

export interface SpecResponse {
  specId: string
  specType?: SpecType
  content: string | Record<string, unknown>
  contentFormat: ContentFormat
  metadata?: SpecMetadata
}

export interface SpecMetadata {
  name?: string
  lastUpdated?: string
  owner?: string
  environment?: string
  tags?: string[]
}

export interface LoadingState {
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
}
