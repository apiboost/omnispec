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
import { css } from '../../styles/css'
import type { SidebarNavConfig } from '../../types/sidebar-nav.types'
import { CustomNavSection } from './CustomNavSection'

export function buildSidebar(
  sidebarNav: SidebarNavConfig | undefined,
  specNav: ReactNode,
): ReactNode {
  if (!sidebarNav) return specNav

  const customNav = <CustomNavSection config={sidebarNav} />
  const placement = sidebarNav.placement ?? 'before'

  if (placement === 'replace') {
    return customNav
  }

  const showDivider = sidebarNav.showDivider !== false
  const divider = showDivider ? <hr className={dividerStyle} /> : null

  if (placement === 'after') {
    return (
      <>
        {specNav}
        {divider}
        {customNav}
      </>
    )
  }

  return (
    <>
      {customNav}
      {divider}
      {specNav}
    </>
  )
}

const dividerStyle = css({
  border: 'none',
  borderTop: '1px solid var(--omnispec-nav-divider-color)',
  margin: '0.5rem var(--omnispec-nav-item-padding-h)',
})
