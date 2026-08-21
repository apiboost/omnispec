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

interface ReferenceLayoutProps {
  schema: ReactNode
  samples: ReactNode
  tryIt: ReactNode
  operationId: string
}

type RightTab = 'samples' | 'try-it'
type MobileTab = 'schema' | 'samples' | 'try-it'

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'schema', label: 'Schema' },
  { id: 'samples', label: 'Samples' },
  { id: 'try-it', label: 'Try It' },
]

const RIGHT_TABS: { id: RightTab; label: string }[] = [
  { id: 'samples', label: 'Samples' },
  { id: 'try-it', label: 'Try It' },
]

export function ReferenceLayout({ schema, samples, tryIt, operationId }: ReferenceLayoutProps) {
  const [rightTab, setRightTab] = useState<RightTab>('samples')
  const [mobileTab, setMobileTab] = useState<MobileTab>('schema')

  return (
    <>
      {/* Mobile layout */}
      <div key={`mobile-${operationId}`} className={mobileWrapperStyle}>
        <div className={mobileTabBarStyle} role="tablist">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab.id}
              aria-controls={`mobile-panel-${operationId}-${tab.id}`}
              onClick={() => setMobileTab(tab.id)}
              className={cx(mobileTabStyle, mobileTab === tab.id ? mobileTabActiveStyle : undefined)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div
          id={`mobile-panel-${operationId}-${mobileTab}`}
          className={mobileContentStyle}
          role="tabpanel"
        >
          {mobileTab === 'schema' && schema}
          {mobileTab === 'samples' && samples}
          {mobileTab === 'try-it' && tryIt}
        </div>
      </div>

      {/* Desktop layout */}
      <div key={`desktop-${operationId}`} className={desktopWrapperStyle}>
        {/* Left column */}
        <div className={leftColumnStyle}>
          {schema}
        </div>

        {/* Right column */}
        <div className={rightColumnStyle}>
          <div className={rightTabBarStyle} role="tablist">
            {RIGHT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={rightTab === tab.id}
                aria-controls={`right-panel-${operationId}-${tab.id}`}
                onClick={() => setRightTab(tab.id)}
                className={cx(rightTabStyle, rightTab === tab.id ? rightTabActiveStyle : undefined)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            id={`right-panel-${operationId}-${rightTab}`}
            className={rightContentStyle}
            role="tabpanel"
          >
            {rightTab === 'samples' && samples}
            {rightTab === 'try-it' && tryIt}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Mobile styles (display: block by default, hidden on desktop) ── */

const mobileWrapperStyle = css({
  display: 'block',
  [mq.desktop]: {
    display: 'none',
  },
})

const mobileTabBarStyle = css({
  display: 'flex',
  borderBottom: '1px solid var(--omnispec-border-color)',
})

const mobileTabStyle = css({
  flex: 1,
  textAlign: 'center',
  padding: '0.625rem 0.5rem',
  background: 'none',
  border: 'none',
  borderBottom: '0.125rem solid transparent',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--omnispec-fg-secondary)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})

const mobileTabActiveStyle = css({
  borderBottom: '0.125rem solid var(--omnispec-color-primary)',
  color: 'var(--omnispec-color-primary)',
})

const mobileContentStyle = css({
  padding: '1rem 0',
})

/* ── Desktop styles (display: none by default, flex on desktop) ── */

const desktopWrapperStyle = css({
  display: 'none',
  [mq.desktop]: {
    display: 'flex',
    alignItems: 'flex-start',
  },
})

const leftColumnStyle = css({
  flex: 1,
  minWidth: 0,
  padding: '1rem 1.5rem',
})

const rightColumnStyle = css({
  width: '26rem',
  flexShrink: 0,
  borderLeft: '1px solid var(--omnispec-border-color)',
  position: 'sticky',
  top: 'calc(var(--omnispec-offset-top, 0px) + 1rem)',
  alignSelf: 'flex-start',
  maxHeight: 'calc(100vh - var(--omnispec-offset-top, 0px) - 2rem)',
  overflowY: 'auto',
})

const rightTabBarStyle = css({
  display: 'flex',
  borderBottom: '1px solid var(--omnispec-border-color)',
})

const rightTabStyle = css({
  flex: 1,
  textAlign: 'center',
  padding: '0.625rem 0.5rem',
  background: 'none',
  border: 'none',
  borderBottom: '0.125rem solid transparent',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--omnispec-fg-secondary)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})

const rightTabActiveStyle = css({
  borderBottom: '0.125rem solid var(--omnispec-color-primary)',
  color: 'var(--omnispec-color-primary)',
})

const rightContentStyle = css({
  padding: '1rem',
})
