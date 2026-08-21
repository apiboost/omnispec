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

export interface SidebarNavItem {
  id: string
  label: string
  href?: string
  target?: '_self' | '_blank'
  icon?: ReactNode
  badge?: string | ReactNode
  badgeColor?: string
  children?: SidebarNavItem[]
  defaultExpanded?: boolean
  separator?: boolean
  className?: string
}

export interface SidebarNavGroup {
  id: string
  label: string
  items: SidebarNavItem[]
  defaultExpanded?: boolean
  icon?: ReactNode
}

export type SidebarNavPlacement = 'before' | 'after' | 'replace'

export interface SidebarNavConfig {
  items: Array<SidebarNavItem | SidebarNavGroup>
  placement?: SidebarNavPlacement
  activeId?: string
  onItemClick?: (item: SidebarNavItem) => void | false
  showDivider?: boolean
  heading?: string
}

export function isSidebarNavGroup(
  item: SidebarNavItem | SidebarNavGroup,
): item is SidebarNavGroup {
  return 'items' in item && Array.isArray((item as SidebarNavGroup).items)
}
