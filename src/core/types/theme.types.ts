/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactNode } from 'react'

export interface ThemeTokens {
  // Surface colors
  '--omnispec-bg-primary': string
  '--omnispec-bg-secondary': string
  '--omnispec-bg-tertiary': string
  '--omnispec-bg-code': string

  // Text colors
  '--omnispec-fg-primary': string
  '--omnispec-fg-secondary': string
  '--omnispec-fg-muted': string
  '--omnispec-fg-code': string
  '--omnispec-fg-link': string

  // Brand / accent
  '--omnispec-color-primary': string
  '--omnispec-color-primary-hover': string
  '--omnispec-color-primary-text': string

  // HTTP method colors
  '--omnispec-color-get': string
  '--omnispec-color-post': string
  '--omnispec-color-put': string
  '--omnispec-color-delete': string
  '--omnispec-color-patch': string

  // Protocol colors (AsyncAPI)
  '--omnispec-color-publish': string
  '--omnispec-color-subscribe': string

  // Status colors
  '--omnispec-color-success': string
  '--omnispec-color-warning': string
  '--omnispec-color-error': string
  '--omnispec-color-info': string

  // Border / UI
  '--omnispec-border-color': string
  '--omnispec-border-radius': string
  '--omnispec-input-bg': string
  '--omnispec-input-border': string

  // Navigation
  '--omnispec-nav-bg': string
  '--omnispec-nav-text': string
  '--omnispec-nav-hover-bg': string
  '--omnispec-nav-accent': string
  '--omnispec-nav-active-bg': string
  '--omnispec-nav-active-border-width': string
  '--omnispec-nav-item-padding-v': string
  '--omnispec-nav-item-padding-h': string
  '--omnispec-nav-indent': string
  '--omnispec-nav-item-gap': string
  '--omnispec-nav-item-radius': string
  '--omnispec-nav-group-font-size': string
  '--omnispec-nav-group-font-weight': string
  '--omnispec-nav-group-letter-spacing': string
  '--omnispec-nav-group-text-transform': string
  '--omnispec-nav-badge-radius': string
  '--omnispec-nav-badge-text': string
  '--omnispec-nav-width': string
  '--omnispec-nav-divider-color': string
  '--omnispec-nav-heading-color': string

  // Scrollbar
  '--omnispec-scrollbar-width': string
  '--omnispec-scrollbar-track': string
  '--omnispec-scrollbar-thumb': string
  '--omnispec-scrollbar-thumb-hover': string

  // Typography
  '--omnispec-font-sans': string
  '--omnispec-font-mono': string
  '--omnispec-font-size-base': string
  '--omnispec-font-size-md': string
  '--omnispec-font-size-sm': string
  '--omnispec-font-size-xs': string
  '--omnispec-font-size-xxs': string
  '--omnispec-font-size-lg': string
  '--omnispec-font-size-xl': string

  // Heading tokens
  '--omnispec-h1-font-size': string
  '--omnispec-h1-font-weight': string
  '--omnispec-h1-color': string
  '--omnispec-h2-font-size': string
  '--omnispec-h2-font-weight': string
  '--omnispec-h2-color': string
  '--omnispec-h3-font-size': string
  '--omnispec-h3-font-weight': string
  '--omnispec-h3-color': string

  // Button tokens (overridable by consuming apps)
  '--omnispec-btn-font-size': string
  '--omnispec-btn-radius': string
  '--omnispec-btn-primary-bg': string
  '--omnispec-btn-primary-text': string
  '--omnispec-btn-primary-bg-hover': string
  '--omnispec-btn-primary-text-hover': string
  '--omnispec-btn-primary-shadow': string
  '--omnispec-btn-primary-shadow-hover': string
  '--omnispec-btn-secondary-bg': string
  '--omnispec-btn-secondary-text': string
  '--omnispec-btn-secondary-bg-hover': string
  '--omnispec-btn-secondary-text-hover': string
  '--omnispec-btn-secondary-shadow': string
  '--omnispec-btn-secondary-shadow-hover': string
}

export interface ThemeConfig {
  /** 'light' or 'dark' for controlled mode. 'auto' detects system preference and manages state internally. */
  base: 'light' | 'dark' | 'auto'
  overrides?: Partial<ThemeTokens>
  /** Show built-in theme toggle. Only applies when base is 'auto'. Defaults to true. */
  themeToggle?: boolean
  /** Called when the resolved theme changes (useful with 'auto' to sync external UI). */
  onThemeChange?: (theme: 'light' | 'dark') => void
}

export interface SlotOverrides {
  /** Content placed above the entire doc renderer (e.g., app header, banners) */
  header?: ReactNode
  /** Content placed below the entire doc renderer */
  footer?: ReactNode
  /** Content placed above the main content area, below the header (e.g., breadcrumbs) */
  contentHeader?: ReactNode
  /** Content injected at the top of the sidebar, above the search/nav tree (e.g., parent navigation, back links) */
  sidebarHeader?: ReactNode
  /** Content injected at the bottom of the sidebar, below the nav tree */
  sidebarFooter?: ReactNode
  /** Logo or brand element */
  logo?: ReactNode
}
