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
  /** Pro capability: interactive OAuth 2.0 (PKCE) Get Token flow in the Authorize panel. */
  interactiveOAuthEnabled: boolean
  /** Stable identity of the rendered spec (title@version) — used to namespace Try-It persistence. */
  specKey?: string
  /** Max age in seconds for persisted Try-It inputs; 0 disables persistence; undefined = no expiry. */
  tryItPersistTtl?: number
}

const defaultConfig: ConfigContextValue = {
  allowTryIt: true,
  layout: 'sidebar',
  sidebarPosition: 'left',
  tryItLayout: 'inline',
  defaultExpandOperations: false,
  displayMode: 'compact',
  schemaStyle: DEFAULT_SCHEMA_STYLE,
  slots: {},
  proRenderers: new Map(),
  premiumThemingEnabled: false,
  interactiveOAuthEnabled: false,
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
