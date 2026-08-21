/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'

export interface TabItem {
  id: string
  /** Tab label. Usually a string; accepts a node so callers can add badges/status indicators. */
  label: ReactNode
  content: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  defaultTab?: string
  /**
   * Remove the tab strip's top spacing. The default margins suit tabs that
   * follow content in the doc body; set this when the tabs sit at the top of
   * their container (e.g. the Authorize panel) and the spacing reads as a gap.
   */
  flush?: boolean
}

const headerStyle = css({
  display: 'flex',
  gap: '0.125rem',
  marginBottom: '-1px',
  marginTop: '1rem',
})

// Zeroes both stacked top margins (header + each tab button) for flush tabs.
const flushHeaderStyle = css({ marginTop: 0 })
const flushTabStyle = css({
  marginTop: 0,
  [mq.desktop]: { marginTop: 0 },
})

const tabStyle = css({
  padding: '0.375rem 0.625rem',
  background: 'none',
  border: '1px solid transparent',
  borderBottom: 'none',
  borderRadius: '0.375rem 0.375rem 0 0',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  fontWeight: 500,
  marginTop: '0.75rem',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
  [mq.desktop]: {
    padding: '0.4375rem 0.875rem',
    marginTop: '1.25rem',
  },
})

const activeTabStyle = css({
  color: 'var(--omnispec-fg-primary)',
  fontWeight: 600,
  backgroundColor: 'var(--omnispec-bg-primary)',
  borderColor: 'color-mix(in srgb, var(--omnispec-border-color) 50%, transparent)',
  borderBottom: '1px solid color-mix(in srgb, var(--omnispec-bg-primary) 80%, transparent)',
  '&:hover': {
    backgroundColor: 'var(--omnispec-bg-primary)',
  },
})

const inactiveTabStyle = css({
  borderBottom: '1px solid var(--omnispec-border-color)',
})

const contentStyle = css({
  padding: '0.5rem 0',
  boxShadow: '0 0 4px 0px var(--omnispec-border-color, #AEDEF9)',
  borderRadius: '0 0 0.375rem 0.375rem',
  marginTop: '-1px',
  [mq.desktop]: {
    padding: '0.75rem',
    boxShadow: 'none',
    border: '1px solid color-mix(in srgb, var(--omnispec-border-color) 50%, transparent)',
  },
})

export function Tabs({ tabs, defaultTab, flush = false }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '')

  const activeContent = tabs.find((t) => t.id === activeTab)?.content

  return (
    <div className="omnispec-tabs">
      <div className={cx(headerStyle, flush && flushHeaderStyle)} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              tabStyle,
              tab.id === activeTab ? activeTabStyle : inactiveTabStyle,
              flush && flushTabStyle,
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={contentStyle} role="tabpanel">
        {activeContent}
      </div>
    </div>
  )
}
