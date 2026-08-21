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
 * Attribute bridge — converts HTML attribute strings to typed React props.
 *
 * Strings are coerced into their expected runtime types (boolean, JSON-parsed
 * object) with safe error handling. Parse failures log a console error and
 * return undefined so the React component falls back to its default behavior.
 */

import type { OmniSpecRendererProps } from '../unified/OmniSpecRenderer'
import type { ThemeConfig } from '../core/types/theme.types'
import type { SidebarNavConfig } from '../core/types/sidebar-nav.types'

/**
 * Coerces a string attribute to a boolean. Treats `'false'`, `'0'`, and `'off'`
 * (case-insensitive) as `false`; everything else (including the empty string
 * for a bare attribute) is `true`. Returns `undefined` if the attribute is null.
 */
export function parseBooleanAttr(value: string | null): boolean | undefined {
  if (value === null) return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'false' || normalized === '0' || normalized === 'off') return false
  return true
}

/**
 * Parses an attribute string as JSON. Returns `undefined` on null input or on
 * parse failure (with a console.error so consumers can debug).
 */
export function parseJsonAttr<T>(value: string | null, attrName: string): T | undefined {
  if (value === null) return undefined
  try {
    return JSON.parse(value) as T
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[omnispec-renderer] Failed to parse attribute "${attrName}" as JSON. ` +
      'Use imperative property assignment for complex objects.',
      err,
    )
    return undefined
  }
}

/**
 * Reads a string attribute. Returns `undefined` for null so React treats it as
 * "prop not set" and uses its own default.
 */
export function readStringAttr(value: string | null): string | undefined {
  return value === null ? undefined : value
}

/**
 * Validates a string against an allow-list. Returns undefined if the value is
 * null or not in the list, otherwise the value itself.
 */
export function readEnumAttr<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined {
  if (value === null) return undefined
  return allowed.includes(value as T) ? (value as T) : undefined
}

/**
 * Reads `theme-base` plus the imperative `theme` property and merges them.
 * The imperative property always wins for fields it specifies; the attribute
 * acts as a shorthand for `{ base: 'auto' | 'light' | 'dark' }`.
 */
export function resolveTheme(
  themeProp: ThemeConfig | undefined,
  themeBaseAttr: string | null,
  themeToggleAttr: string | null,
): ThemeConfig | undefined {
  const base = readEnumAttr(themeBaseAttr, ['light', 'dark', 'auto'] as const)
  const themeToggle = parseBooleanAttr(themeToggleAttr)

  if (themeProp) {
    return {
      ...themeProp,
      base: themeProp.base ?? base ?? 'light',
      themeToggle: themeProp.themeToggle ?? themeToggle,
    }
  }

  if (base === undefined && themeToggle === undefined) return undefined

  return {
    base: base ?? 'light',
    themeToggle,
  }
}

export interface RawAttributes {
  /** URL or raw spec content. */
  specUrl: string | null
  /** Imperative property: parsed spec object, string, or undefined. */
  specProp: OmniSpecRendererProps['spec'] | undefined
  /** Imperative property: theme config object. */
  themeProp: ThemeConfig | undefined
  /** `theme-base` attribute: `'light' | 'dark' | 'auto'`. */
  themeBase: string | null
  /** `theme-toggle` attribute. */
  themeToggle: string | null
  /** Imperative property: sidebar nav config. */
  sidebarNavProp: SidebarNavConfig | undefined
  /** `display-mode` attribute: `'compact' | 'reference'`. */
  displayMode: string | null
  /** `navigation-mode` attribute: `'grouped' | 'segmented'`. */
  navigationMode: string | null
  /** `layout` attribute: `'sidebar' | 'stacked'`. */
  layout: string | null
  /** `sidebar-position` attribute: `'left' | 'right'`. */
  sidebarPosition: string | null
  /** `try-it-layout` attribute: `'inline' | 'panel'`. */
  tryItLayout: string | null
  /** `schema-style` attribute: `'lines' | 'table' | 'card' | 'tokens'`. */
  schemaStyle: string | null
  /** `allow-try-it` attribute. */
  allowTryIt: string | null
  /** `default-expand-operations` attribute. */
  defaultExpandOperations: string | null
  /** `proxy-url` attribute. */
  proxyUrl: string | null
  /** `download-link` attribute — boolean string or URL. */
  downloadLink: string | null
  /** `docs-url` attribute. */
  docsUrl: string | null
  /** `upgrade-url` attribute. */
  upgradeUrl: string | null
  /** `server-url` attribute — forces a single server/base URL at render time. */
  serverUrl: string | null
  /** `try-it-persist-ttl` attribute — max age (seconds) for persisted Try-It inputs; 0 disables. */
  tryItPersistTtl: string | null
}

/**
 * Builds a final `OmniSpecRendererProps` object from raw attribute values and any
 * imperative property assignments. Imperative properties take precedence.
 */
export function buildRendererProps(raw: RawAttributes): OmniSpecRendererProps | null {
  const spec = raw.specProp ?? raw.specUrl ?? undefined
  if (spec === undefined) {
    // Without a spec there's nothing to render.
    return null
  }

  const props: OmniSpecRendererProps = { spec }

  const theme = resolveTheme(raw.themeProp, raw.themeBase, raw.themeToggle)
  if (theme) props.theme = theme

  if (raw.sidebarNavProp) props.sidebarNav = raw.sidebarNavProp

  const displayMode = readEnumAttr(raw.displayMode, ['compact', 'reference'] as const)
  if (displayMode) props.displayMode = displayMode

  const navigationMode = readEnumAttr(raw.navigationMode, ['grouped', 'segmented'] as const)
  if (navigationMode) props.navigationMode = navigationMode

  const layout = readEnumAttr(raw.layout, ['sidebar', 'stacked'] as const)
  if (layout) props.layout = layout

  const sidebarPosition = readEnumAttr(raw.sidebarPosition, ['left', 'right'] as const)
  if (sidebarPosition) props.sidebarPosition = sidebarPosition

  const tryItLayout = readEnumAttr(raw.tryItLayout, ['inline', 'panel'] as const)
  if (tryItLayout) props.tryItLayout = tryItLayout

  const schemaStyle = readEnumAttr(raw.schemaStyle, ['lines', 'table', 'card', 'tokens'] as const)
  if (schemaStyle) props.schemaStyle = schemaStyle

  const allowTryIt = parseBooleanAttr(raw.allowTryIt)
  if (allowTryIt !== undefined) props.allowTryIt = allowTryIt

  const defaultExpand = parseBooleanAttr(raw.defaultExpandOperations)
  if (defaultExpand !== undefined) props.defaultExpandOperations = defaultExpand

  const proxyUrl = readStringAttr(raw.proxyUrl)
  if (proxyUrl) props.proxyUrl = proxyUrl

  if (raw.downloadLink !== null) {
    const trimmed = raw.downloadLink.trim()
    const asBool = parseBooleanAttr(raw.downloadLink)
    // Treat a non-true/false string as a literal URL.
    if (trimmed === 'true' || trimmed === '') {
      props.downloadLink = true
    } else if (asBool === false) {
      props.downloadLink = false
    } else {
      props.downloadLink = trimmed
    }
  }

  const docsUrl = readStringAttr(raw.docsUrl)
  if (docsUrl) props.docsUrl = docsUrl

  const upgradeUrl = readStringAttr(raw.upgradeUrl)
  if (upgradeUrl) props.upgradeUrl = upgradeUrl

  const serverUrl = readStringAttr(raw.serverUrl)
  if (serverUrl) props.serverUrl = serverUrl

  const ttlRaw = readStringAttr(raw.tryItPersistTtl)
  if (ttlRaw !== undefined && ttlRaw.trim() !== '') {
    const ttl = Number(ttlRaw)
    if (Number.isFinite(ttl) && ttl >= 0) props.tryItPersistTtl = ttl
  }

  return props
}
