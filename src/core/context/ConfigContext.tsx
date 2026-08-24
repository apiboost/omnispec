/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { createContext, useContext } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type { SlotOverrides } from '../types/theme.types'
import type { BaseSpecProps } from '../types/common.types'
import type { OAuthConfig } from '../types/auth.types'
import type { InteractiveAuthRegistry } from '../types/interactive-auth.types'
import type { SchemaStyle } from '../components/SchemaViewer/schema-style'
import { DEFAULT_SCHEMA_STYLE } from '../components/SchemaViewer/schema-style'

export interface ConfigContextValue {
  proxyUrl?: string
  proxyHeaders?: Record<string, string>
  /** Interactive OAuth 2.0 (PKCE) Try-It flow configuration. */
  oauth?: OAuthConfig
  allowTryIt: boolean
  layout: 'sidebar' | 'stacked'
  sidebarPosition: 'left' | 'right'
  tryItLayout: 'inline' | 'panel'
  defaultExpandOperations: boolean
  displayMode: 'compact' | 'reference'
  /**
   * Already tier-gated schema presentation style. Consumers (e.g. `SchemaTree`)
   * read this directly; the gating/fallback is resolved once upstream.
   */
  schemaStyle: SchemaStyle
  slots: SlotOverrides
  proRenderers: Map<string, ComponentType<BaseSpecProps>>
  premiumThemingEnabled: boolean
  /**
   * Interactive-auth components supplied by Pro, keyed by scheme type. When
   * present (and not opted out), `AuthPanel` renders these instead of the free
   * manual shells.
   */
  interactiveAuth?: InteractiveAuthRegistry
  /** Consumer opt-out of the interactive OAuth flow. Defaults to true. */
  interactiveOAuth: boolean
  /** Stable identity of the rendered spec (title@version) — used to namespace Try-It persistence. */
  specKey?: string
  /** Max age in seconds for persisted Try-It inputs; 0 disables persistence; undefined = no expiry. */
  tryItPersistTtl?: number
}

const defaultConfig: ConfigContextValue = {
  allowTryIt: true,
  layout: 'sidebar',
  sidebarPosition: 'left',
  // Default `panel` (docked side column) — the historical effective behavior.
  // The prop was dead until inline was implemented, so `panel` keeps existing
  // consumers (e.g. the `ui/` portal) on their current Try-It placement.
  tryItLayout: 'panel',
  defaultExpandOperations: false,
  displayMode: 'compact',
  schemaStyle: DEFAULT_SCHEMA_STYLE,
  slots: {},
  proRenderers: new Map(),
  premiumThemingEnabled: false,
  interactiveOAuth: true,
}

const ConfigContext = createContext<ConfigContextValue>(defaultConfig)

export function useConfig() {
  return useContext(ConfigContext)
}

interface ConfigProviderProps {
  config: Partial<ConfigContextValue>
  children: ReactNode
}

export function ConfigProvider({ config, children }: ConfigProviderProps) {
  const value: ConfigContextValue = { ...defaultConfig, ...config }
  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  )
}
