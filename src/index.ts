/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// Components — free tier renderers
export { OpenApiSpec } from './openapi/OpenApiSpec'
export { AsyncApiSpec } from './asyncapi/AsyncApiSpec'
export { OmniSpecRenderer } from './unified/OmniSpecRenderer'
export type { OmniSpecRendererProps } from './unified/OmniSpecRenderer'

// Extension point (deprecated — use `pro` prop on OmniSpecRenderer instead)
export { RendererRegistryProvider, useRendererRegistry } from './core/context/RendererRegistry'
export type { RendererRegistryValue } from './core/context/RendererRegistry'

// Theme
export { ThemeProvider, useTheme } from './core/themes'
export { lightTheme, darkTheme } from './core/themes'

// Types
export type {
  BaseSpecProps,
  ProFeatures,
  SpecResponse,
  SpecMetadata,
  SpecLoadedInfo,
  LoadingState,
} from './core/types/common.types'
export { SpecType } from './core/types/spec-detection.types'
export type {
  SpecDetectionResult,
  ContentFormat,
} from './core/types/spec-detection.types'
export type {
  ThemeConfig,
  ThemeTokens,
  SlotOverrides,
} from './core/types/theme.types'
export type {
  AuthScheme,
  AuthSchemeType,
  OAuth2Flows,
  OAuth2Flow,
  OAuthConfig,
  AppliedAuthValue,
} from './core/types/auth.types'
export { authSchemeLabel } from './core/types/auth.types'
export type {
  TryItRequest,
  TryItResponse,
  ProxyRequest,
  ProxyResponse,
  TryItConfig,
} from './core/types/try-it.types'
export type {
  SidebarNavItem,
  SidebarNavGroup,
  SidebarNavConfig,
  SidebarNavPlacement,
} from './core/types/sidebar-nav.types'
export { isSidebarNavGroup } from './core/types/sidebar-nav.types'

// Utilities
export { detectSpecType } from './core/utils/detect-spec'
export { fetchSpec } from './core/utils/fetch-spec'
