/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { css, cx } from '@core/styles/css'
import { Icon } from './Icon'
import { useExpandAll } from '@core/context/ExpandContext'

interface CollapsibleProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  headerStyle?: CSSProperties
  /** When set (with expandGeneration), forces open/closed to mirror an "expand all" toggle. */
  expandAll?: boolean
  /** Bumped on each expand-all toggle so repeated clicks re-apply even after manual toggling. */
  expandGeneration?: number
}

const headerStyle_ = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  minWidth: 0,
  padding: '0.5rem 0',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 500,
  textAlign: 'left',
  '&:hover': {
    color: 'var(--omnispec-fg-secondary)',
  },
})

const arrowStyle = css({
  display: 'inline-flex',
  marginRight: '.5rem',
  transition: 'transform 0.2s ease',
})

const arrowExpandedStyle = css({
  transform: 'rotate(90deg)',
})

const contentCollapsedStyle = css({
  display: 'none',
})

export function Collapsible({ title, children, defaultOpen = false, headerStyle, expandAll, expandGeneration }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [nearViewport, setNearViewport] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mirror the document-wide "expand all" toggle. Explicit props win (a few call
  // sites pass them directly); otherwise fall back to the expand context so this
  // item responds even without prop-drilling. Gated on generation so the initial
  // mount (generation 0) leaves defaultOpen untouched, and each subsequent toggle
  // re-applies even if the user opened/closed this item in between.
  const ctx = useExpandAll()
  const effectiveExpandAll = expandAll ?? ctx.expandAll
  const effectiveGeneration = expandGeneration ?? ctx.expandGeneration
  useEffect(() => {
    if (effectiveGeneration > 0) {
      setIsOpen(!!effectiveExpandAll)
    }
  }, [effectiveExpandAll, effectiveGeneration])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (nearViewport) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '500px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nearViewport])

  const shouldRender = isOpen && nearViewport

  return (
    <div className="omnispec-collapsible" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cx(headerStyle_, headerStyle && css(headerStyle as Record<string, string | number | undefined>))}
        aria-expanded={isOpen}
      >
        <span className={cx(arrowStyle, isOpen && arrowExpandedStyle)}>
          <Icon name="chevron-right" size=".825rem" />
        </span>
        {title}
      </button>
      {shouldRender && (
        <div className={cx(!isOpen && contentCollapsedStyle)}>
          {children}
        </div>
      )}
    </div>
  )
}
