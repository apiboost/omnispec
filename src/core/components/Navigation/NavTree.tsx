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
import { css, cx } from '../../styles/css'
import { Icon } from '../common/Icon'
import { useMobileDrawerDismiss } from '@core/components/Layout/MobileDrawerDismissContext'

export interface NavItem {
  id: string
  label: string
  badge?: string | ReactNode
  badgeColor?: string
  children?: NavItem[]
  href?: string
  target?: '_self' | '_blank'
  icon?: ReactNode
  separator?: boolean
  defaultExpanded?: boolean
  className?: string
}

interface NavTreeProps {
  items: NavItem[]
  activeId?: string
  onSelect: (id: string) => void
  parentToggleOnly?: boolean
}

export function NavTree({ items, activeId, onSelect, parentToggleOnly }: NavTreeProps) {
  return (
    <nav className={`omnispec-nav-tree ${rootStyle}`}>
      {items.map((item) => (
        <NavTreeItem
          key={item.id}
          item={item}
          activeId={activeId}
          onSelect={onSelect}
          depth={0}
          parentToggleOnly={parentToggleOnly}
        />
      ))}
    </nav>
  )
}

interface NavTreeItemProps {
  item: NavItem
  activeId?: string
  onSelect: (id: string) => void
  depth: number
  parentToggleOnly?: boolean
}

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

function NavTreeItem({ item, activeId, onSelect, depth, parentToggleOnly }: NavTreeItemProps) {
  const hasChildren = item.children && item.children.length > 0
  const [expanded, setExpanded] = useState(item.defaultExpanded ?? true)
  const isActive = item.id === activeId
  const dismissMobileDrawer = useMobileDrawerDismiss()

  if (item.separator) {
    return (
      <div className={cx(separatorStyle, item.className)}>
        {item.label}
      </div>
    )
  }

  const isExternal = item.href ? isExternalHref(item.href) : false
  const resolvedTarget = item.target ?? (isExternal ? '_blank' : '_self')

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded)
      if (parentToggleOnly) {
        return
      }
    }
    /*
     * Inside DocLayout's full-screen mobile drawer, a navigation must also
     * close the drawer — otherwise it keeps covering the content the user
     * just navigated to. Group items are exempt: their tap expands children
     * for a follow-up pick, so the drawer stays open.
     */
    const dismissAfterNavigate = () => {
      if (!hasChildren) {
        dismissMobileDrawer?.()
      }
    }
    if (item.href) {
      if (isExternal || resolvedTarget === '_blank') {
        window.open(item.href, '_blank', 'noopener,noreferrer')
      } else if (item.href.startsWith('#')) {
        onSelect(item.href.slice(1))
        dismissAfterNavigate()
      } else {
        dismissAfterNavigate()
        window.location.href = item.href
      }
    } else {
      onSelect(item.id)
      dismissAfterNavigate()
    }
  }

  const badgeContent = typeof item.badge === 'string' ? (
    <span
      className={css({
        ...badgeBaseStyles,
        backgroundColor: item.badgeColor ?? 'var(--omnispec-fg-muted)',
      })}
    >
      {item.badge}
    </span>
  ) : item.badge ? (
    <span className={badgeSlotStyle}>{item.badge}</span>
  ) : null

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={cx(
          css({
            ...itemBaseStyles,
            paddingLeft: `calc(var(--omnispec-nav-item-padding-h) + ${depth} * var(--omnispec-nav-indent))`,
            backgroundColor: isActive ? 'var(--omnispec-nav-active-bg)' : 'transparent',
            borderLeft: isActive
              ? 'var(--omnispec-nav-active-border-width) solid var(--omnispec-nav-accent)'
              : 'var(--omnispec-nav-active-border-width) solid transparent',
            fontWeight: depth === 0 ? 600 : 400,
            fontSize: depth === 0 ? 'var(--omnispec-font-size-base)' : 'var(--omnispec-font-size-sm)',
            borderRadius: 'var(--omnispec-nav-item-radius)',
            '&:hover': {
              backgroundColor: 'var(--omnispec-nav-hover-bg)',
            },
          }),
          item.className,
        )}
      >
        {hasChildren && (
          <span className={css({
            ...arrowBaseStyles,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          })}>
            <Icon name="chevron-right" size="1rem" />
          </span>
        )}
        {item.icon && <span className={iconSlotStyle}>{item.icon}</span>}
        <span className={labelStyle}>{item.label}</span>
        {isExternal && (
          <span className={externalIconStyle}>
            <Icon name="external-link" size="0.6em" />
          </span>
        )}
        {badgeContent}
      </button>
      {expanded && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <NavTreeItem
              key={child.id}
              item={child}
              activeId={activeId}
              onSelect={onSelect}
              depth={depth + 1}
              parentToggleOnly={parentToggleOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const rootStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  padding: '4px 0',
})

const itemBaseStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--omnispec-nav-item-gap)',
  width: '100%',
  padding: 'var(--omnispec-nav-item-padding-v) var(--omnispec-nav-item-padding-h)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-nav-text)',
  textAlign: 'left' as const,
  borderRadius: 'var(--omnispec-nav-item-radius)',
}

const arrowBaseStyles = {
  display: 'inline-block',
  transition: 'transform 0.15s',
  color: 'var(--omnispec-nav-text)',
  opacity: 0.5,
  flexShrink: 0,
}

const labelStyle = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
})

const badgeBaseStyles = {
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 700,
  fontFamily: 'var(--omnispec-font-mono)',
  textTransform: 'uppercase' as const,
  padding: '0.125rem 0.375rem',
  borderRadius: 'var(--omnispec-nav-badge-radius)',
  color: 'var(--omnispec-nav-badge-text)',
  flexShrink: 0,
  letterSpacing: '0.02em',
}

const badgeSlotStyle = css({
  flexShrink: 0,
})

const iconSlotStyle = css({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  color: 'var(--omnispec-nav-text)',
  opacity: 0.5,
})

const externalIconStyle = css({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  color: 'var(--omnispec-nav-text)',
  opacity: 0.4,
})

const separatorStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--omnispec-nav-heading-color)',
  padding: '16px 12px 4px',
  cursor: 'default',
})
