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
import { cx } from '@core/styles/css'
import type { ThemeConfig, SlotOverrides } from '@core/types/theme.types'
import type { SidebarNavConfig } from '@core/types/sidebar-nav.types'
import { ThemeProvider } from '@core/themes/ThemeProvider'
import { ConfigProvider } from '@core/context/ConfigContext'
import { DocLayout } from '@core/components/Layout/DocLayout'
import { buildSidebar } from '@core/components/Navigation/buildSidebar'

interface SpecStatusScreenProps {
  /** Status UI shown in the main content area (e.g. an ErrorMessage or LoadingScreen). */
  children: ReactNode
  theme?: ThemeConfig
  layout?: 'sidebar' | 'stacked'
  sidebarPosition?: 'left' | 'right'
  /** Host-provided slots — notably `sidebarHeader`, which carries the host's navigation. */
  slots?: SlotOverrides
  sidebarNav?: SidebarNavConfig
  premiumThemingEnabled?: boolean
  className?: string
}

/**
 * Renders a non-fatal spec status (a failed/parse/detect error, or loading) in
 * the DocLayout content area while keeping the surrounding chrome — the host's
 * navigation slots (`sidebarHeader`/`sidebarFooter`), header, breadcrumbs, and
 * footer — intact, so the user can still navigate away.
 *
 * This is deliberately spec-agnostic: it renders the layout shell WITHOUT a
 * parsed spec (no operations nav, no server selector, no Try-It). Fatal errors
 * (render crashes caught by an ErrorBoundary, or genuine misconfiguration) keep
 * using the bare full-screen ErrorMessage instead of this shell.
 */
export function SpecStatusScreen({
  children,
  theme,
  layout = 'sidebar',
  sidebarPosition = 'left',
  slots = {},
  sidebarNav,
  premiumThemingEnabled = false,
  className,
}: SpecStatusScreenProps) {
  // Custom nav sections only — there is no spec-derived nav in a status state.
  const sidebar = buildSidebar(sidebarNav, undefined)

  return (
    <ThemeProvider theme={theme}>
      <ConfigProvider config={{ layout, sidebarPosition, slots, premiumThemingEnabled }}>
        <div className={cx('omnispec-spec-status', className)}>
          <DocLayout
            layout={layout}
            sidebarPosition={sidebarPosition}
            sidebar={sidebar}
            sidebarHeader={slots.sidebarHeader}
            sidebarFooter={slots.sidebarFooter}
            header={slots.header}
            contentHeader={slots.contentHeader}
            footer={slots.footer}
          >
            {children}
          </DocLayout>
        </div>
      </ConfigProvider>
    </ThemeProvider>
  )
}
