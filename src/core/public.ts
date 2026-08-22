/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 *
 * Public API for @apiboost/omnispec/core — consumed by @apiboost/omnispec-pro
 * and other extension packages. This barrel export provides the shared
 * infrastructure that Pro renderers and components build on.
 */

// Context
export { ConfigProvider, useConfig } from './context/ConfigContext'
export type { ConfigContextValue } from './context/ConfigContext'
export { AuthProvider, useAuth } from './context/AuthContext'
export { RendererRegistryProvider, useRendererRegistry } from './context/RendererRegistry'
export type { RendererRegistryValue } from './context/RendererRegistry'

// Layout
export { DocLayout } from './components/Layout/DocLayout'

// Navigation
export { NavTree } from './components/Navigation/NavTree'
export type { NavItem } from './components/Navigation/NavTree'
export { SearchBar } from './components/Navigation/SearchBar'
export { buildSidebar } from './components/Navigation/buildSidebar'
export { CustomNavSection } from './components/Navigation/CustomNavSection'

// Schema
export { SchemaTree } from './components/SchemaViewer/SchemaTree'
export {
  generateExample,
  schemaToNodes,
} from './components/SchemaViewer/schema-utils'
export type { SchemaNode } from './components/SchemaViewer/schema-utils'
export {
  FieldName,
  SchemaRefLink,
  FieldDescription,
  SchemaSectionTitle,
  SchemaBadge,
} from './components/SchemaViewer/SchemaPrimitives'
export type { SchemaBadgeVariant } from './components/SchemaViewer/SchemaPrimitives'
export {
  DEFAULT_SCHEMA_STYLE,
  FREE_SCHEMA_STYLES,
  resolveSchemaStyle,
} from './components/SchemaViewer/schema-style'
export type { SchemaStyle } from './components/SchemaViewer/schema-style'
export { SpecStatusScreen } from './components/Layout/SpecStatusScreen'
export {
  PresentationContainer,
  // Legacy shells (Pro renderers) — migrating onto the slot kit below.
  PresentationRow,
  PresentationChildren,
  // Slot kit — variant-driven styled components for each schema item.
  SchemaPropRow,
  SchemaPropChildren,
  PropName,
  PropType,
  PropFormat,
  PropReq,
  PropRequiredStar,
  PropDesc,
  PropDefault,
  EnumList,
  EnumLabel,
  EnumItem,
} from './components/SchemaViewer/SchemaPresentation'

// Code
export { CodeBlock } from './components/CodeBlock'

// Markdown
export { MarkdownRenderer } from './components/MarkdownRenderer/MarkdownRenderer'

// Reference (Pro)
export { ReferenceLayout } from './components/Reference/ReferenceLayout'
export { ReferenceOperationDetail } from './components/Reference/ReferenceOperationDetail'
export { SamplesPanel } from './components/Reference/SamplesPanel'

// Common UI
export { Badge } from './components/common/Badge'
export { Button } from './components/common/Button'
export type { ButtonVariant } from './components/common/Button'
export { Collapsible } from './components/common/Collapsible'
export { CopyButton } from './components/common/CopyButton'
export { ExpandableCard } from './components/common/ExpandableCard'
export { Icon } from './components/common/Icon'
export { LinkableHeading } from './components/common/LinkableHeading'
export { LoadingScreen } from './components/common/LoadingScreen'
export { ErrorMessage } from './components/common/ErrorMessage'
export { MethodBar } from './components/common/MethodBar'
export { Modal } from './components/common/Modal'
export { ResponsiveColumns } from './components/common/ResponsiveColumns'
export { SpecToolbar } from './components/common/SpecToolbar'
export { Tabs } from './components/common/Tabs'
export type { TabItem } from './components/common/Tabs'
export { Tooltip } from './components/common/Tooltip'
export { UpgradePrompt } from './components/common/UpgradePrompt'

// Theme
export { ThemeProvider, useTheme } from './themes/ThemeProvider'
export { lightTheme, darkTheme } from './themes/tokens'

// Hooks
export { useSpecFetcher } from './hooks/useSpecFetcher'
export { useSpecDetector } from './hooks/useSpecDetector'
export { useHashScroll, requestExpand } from './hooks/useHashScroll'
export { useScrollSpy, flattenNavItemIds } from './hooks/useScrollSpy'

// Styles
export { css, cx, keyframes } from './styles/css'
export { mq, breakpoints } from './styles/breakpoints'

// Utils
export { detectSpecType } from './utils/detect-spec'
export { fetchSpec } from './utils/fetch-spec'
export { resolveDownloadLink } from './utils/resolve-download-link'
export { sendProxiedRequest } from './utils/proxy-client'
export { sendDirectRequest } from './utils/direct-client'

// TryIt components (used by Pro SOAP renderer)
export { CodeSamples } from './components/TryIt/CodeSamples'
export { ResponseViewer } from './components/TryIt/ResponseViewer'
export type { CodeLanguageId } from './components/TryIt/code-generators'

// Types
export type { BaseSpecProps, SpecResponse, SpecMetadata, SpecLoadedInfo, LoadingState } from './types/common.types'
export { SpecType } from './types/spec-detection.types'
export type { SpecDetectionResult, ContentFormat } from './types/spec-detection.types'
export type { ThemeConfig, ThemeTokens, SlotOverrides } from './types/theme.types'
export type { AuthScheme, AuthSchemeType, OAuth2Flows, OAuth2Flow, OAuthConfig, AppliedAuthValue } from './types/auth.types'
export type { InteractiveAuthProps, InteractiveAuthComponent, InteractiveAuthRegistry } from './types/interactive-auth.types'
export { OAuth2AuthManual } from './components/Auth/OAuth2AuthManual'
export { OpenIdConnectManual } from './components/Auth/OpenIdConnectManual'
export type { TryItRequest, TryItResponse, ProxyRequest, ProxyResponse, TryItConfig } from './types/try-it.types'
export type { SidebarNavItem, SidebarNavGroup, SidebarNavConfig, SidebarNavPlacement } from './types/sidebar-nav.types'
export { isSidebarNavGroup } from './types/sidebar-nav.types'
