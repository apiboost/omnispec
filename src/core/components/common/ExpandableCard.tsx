/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { Icon } from './Icon'
import { useConfig } from '@core/context/ConfigContext'
import { useExpandAll } from '@core/context/ExpandContext'
import { onExpandRequest } from '@core/hooks/useHashScroll'

export interface ExpandableCardBadge {
  name: string
  color?: string
  position?: 'before' | 'after'
}

export interface ExpandableCardProps {
  id?: string
  title: string
  rightLabel?: string
  deprecated?: boolean
  badges?: ExpandableCardBadge[]
  expandAll?: boolean
  expandGeneration?: number
  children: ReactNode
}

export const ExpandableCard = memo(function ExpandableCard({
  id,
  title,
  rightLabel,
  deprecated,
  badges,
  expandAll,
  expandGeneration,
  children,
}: ExpandableCardProps) {
  const { defaultExpandOperations } = useConfig()
  const [expanded, setExpanded] = useState(defaultExpandOperations)
  const [nearViewport, setNearViewport] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Explicit props win; otherwise fall back to the document-wide expand context.
  const ctx = useExpandAll()
  const effectiveExpandAll = expandAll ?? ctx.expandAll
  const effectiveGeneration = expandGeneration ?? ctx.expandGeneration
  useEffect(() => {
    if (effectiveGeneration > 0) {
      setExpanded(!!effectiveExpandAll)
    }
  }, [effectiveExpandAll, effectiveGeneration])

  useEffect(() => {
    if (!id) return
    return onExpandRequest(id, () => setExpanded(true))
  }, [id])

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
      { rootMargin: '1000px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nearViewport])

  const shouldRender = expanded && nearViewport

  const handleClick = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div
      ref={containerRef}
      id={id}
      className={cx(
        'omnispec-expandable-card',
        containerStyle,
        deprecated ? deprecatedStyle : undefined,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cx(headerStyle, expanded ? headerExpandedStyle : undefined)}
        aria-expanded={expanded}
      >
        <span className={cx(chevronStyle, expanded && chevronExpandedStyle)}>
          <Icon name="chevron-right" size="0.75rem" />
        </span>
        {badges?.filter((b) => b.position === 'before').map((b) => (
          <span key={b.name} className={xBadgeStyle} style={{ backgroundColor: b.color ?? 'var(--omnispec-bg-tertiary)', color: b.color ? '#fff' : 'var(--omnispec-fg-secondary)' }}>{b.name}</span>
        ))}
        <span className={titleStyle}>{title}</span>
        {badges?.filter((b) => b.position !== 'before').map((b) => (
          <span key={b.name} className={xBadgeStyle} style={{ backgroundColor: b.color ?? 'var(--omnispec-bg-tertiary)', color: b.color ? '#fff' : 'var(--omnispec-fg-secondary)' }}>{b.name}</span>
        ))}
        {deprecated && (
          <span className={deprecatedBadgeStyle}>Deprecated</span>
        )}
        {rightLabel && (
          <span className={rightLabelStyle}>{rightLabel}</span>
        )}
      </button>

      {shouldRender && (
        <div className={bodyStyle}>
          {children}
        </div>
      )}
    </div>
  )
})

const containerStyle = css({
  marginBottom: '0.75rem',
  maxWidth: '100%',
  borderRadius: '0.5rem',
  [mq.desktop]: {
    border: '1px solid var(--omnispec-border-color)',
    borderRadius: '0.5rem',
  },
})

const deprecatedStyle = css({
  opacity: 0.6,
})

const headerStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  width: '100%',
  padding: '0.75rem 0',
  background: 'var(--omnispec-bg-primary)',
  border: 'none',
  borderBottom: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  textAlign: 'left',
  [mq.desktop]: {
    padding: '1rem',
  },
})

const headerExpandedStyle = css({})

const chevronStyle = css({
  color: 'var(--omnispec-fg-muted)',
  flexShrink: 0,
  transition: 'transform 0.2s ease',
})

const chevronExpandedStyle = css({
  transform: 'rotate(90deg)',
})

const titleStyle = css({
  fontWeight: 600,
  flex: 1,
  minWidth: 0,
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-md)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const xBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  padding: '0.125rem 0.5rem',
  borderRadius: '1rem',
  whiteSpace: 'nowrap',
  flexShrink: 0,
})

const deprecatedBadgeStyle = css({
  fontSize: '10px',
  color: 'var(--omnispec-color-warning)',
  fontWeight: 600,
  textTransform: 'uppercase',
  border: '1px solid var(--omnispec-color-warning)',
  padding: '1px 5px',
  borderRadius: '3px',
  flexShrink: 0,
})

const rightLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  flexShrink: 0,
  marginLeft: 'auto',
})

const bodyStyle = css({})
