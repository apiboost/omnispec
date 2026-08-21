/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState, useEffect, useCallback } from 'react'
import { css } from '../../styles/css'
import { Icon } from '../common/Icon'
import { NavTree } from './NavTree'
import type { NavItem } from './NavTree'
import type {
  SidebarNavConfig,
  SidebarNavItem,
  SidebarNavGroup,
} from '../../types/sidebar-nav.types'
import { isSidebarNavGroup } from '../../types/sidebar-nav.types'

interface CustomNavSectionProps {
  config: SidebarNavConfig
}

function toNavItem(item: SidebarNavItem): NavItem {
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    target: item.target,
    icon: item.icon,
    badge: item.badge,
    badgeColor: item.badgeColor,
    separator: item.separator,
    defaultExpanded: item.defaultExpanded,
    className: item.className,
    children: item.children?.map(toNavItem),
  }
}

function findItemById(
  items: Array<SidebarNavItem | SidebarNavGroup>,
  id: string,
): SidebarNavItem | undefined {
  for (const entry of items) {
    if (isSidebarNavGroup(entry)) {
      const found = findItemInList(entry.items, id)
      if (found) return found
    } else {
      if (entry.id === id) return entry
      if (entry.children) {
        const found = findItemInList(entry.children, id)
        if (found) return found
      }
    }
  }
  return undefined
}

function findItemInList(
  items: SidebarNavItem[],
  id: string,
): SidebarNavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findItemInList(item.children, id)
      if (found) return found
    }
  }
  return undefined
}

function useCustomNavActiveState(config: SidebarNavConfig): string | undefined {
  const [internalActiveId, setInternalActiveId] = useState<string | undefined>()

  useEffect(() => {
    if (config.activeId !== undefined) return

    const allItems: SidebarNavItem[] = []
    for (const entry of config.items) {
      if (isSidebarNavGroup(entry)) {
        allItems.push(...entry.items)
      } else {
        allItems.push(entry)
      }
    }

    const matchFromHash = () => {
      const hash = window.location.hash.slice(1)
      const pathname = window.location.pathname
      for (const item of flattenItems(allItems)) {
        if (item.href === `#${hash}` && hash) {
          return item.id
        }
        if (item.href === pathname) {
          return item.id
        }
      }
      return undefined
    }

    setInternalActiveId(matchFromHash())

    const handleHashChange = () => setInternalActiveId(matchFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [config.activeId, config.items])

  return config.activeId ?? internalActiveId
}

function flattenItems(items: SidebarNavItem[]): SidebarNavItem[] {
  const result: SidebarNavItem[] = []
  for (const item of items) {
    result.push(item)
    if (item.children) {
      result.push(...flattenItems(item.children))
    }
  }
  return result
}

export function CustomNavSection({ config }: CustomNavSectionProps) {
  const activeId = useCustomNavActiveState(config)

  const handleSelect = useCallback(
    (id: string) => {
      if (config.onItemClick) {
        const item = findItemById(config.items, id)
        if (item) {
          const result = config.onItemClick(item)
          if (result === false) return
        }
      }
    },
    [config],
  )

  const groups: Array<{ type: 'group'; group: SidebarNavGroup } | { type: 'items'; items: SidebarNavItem[] }> = []
  let pendingItems: SidebarNavItem[] = []

  for (const entry of config.items) {
    if (isSidebarNavGroup(entry)) {
      if (pendingItems.length) {
        groups.push({ type: 'items', items: pendingItems })
        pendingItems = []
      }
      groups.push({ type: 'group', group: entry })
    } else {
      pendingItems.push(entry)
    }
  }
  if (pendingItems.length) {
    groups.push({ type: 'items', items: pendingItems })
  }

  return (
    <div className={sectionStyle}>
      {config.heading && (
        <div className={headingStyle}>{config.heading}</div>
      )}
      {groups.map((block) => {
        if (block.type === 'group') {
          return (
            <NavGroup
              key={block.group.id}
              group={block.group}
              activeId={activeId}
              onSelect={handleSelect}
            />
          )
        }
        return (
          <NavTree
            key={block.items[0].id}
            items={block.items.map(toNavItem)}
            activeId={activeId}
            onSelect={handleSelect}
          />
        )
      })}
    </div>
  )
}

interface NavGroupProps {
  group: SidebarNavGroup
  activeId?: string
  onSelect: (id: string) => void
}

function NavGroup({ group, activeId, onSelect }: NavGroupProps) {
  const [expanded, setExpanded] = useState(group.defaultExpanded ?? true)

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={groupHeadingStyle}
      >
        {group.icon && <span className={groupIconStyle}>{group.icon}</span>}
        <span>{group.label}</span>
        <span className={css({
          marginLeft: 'auto',
          color: 'var(--omnispec-fg-muted)',
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-flex',
        })}>
          <Icon name="chevron-right" size="0.65rem" />
        </span>
      </button>
      {expanded && (
        <NavTree
          items={group.items.map(toNavItem)}
          activeId={activeId}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

const sectionStyle = css({
  display: 'flex',
  flexDirection: 'column',
})

const headingStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--omnispec-fg-muted)',
  padding: '16px 12px 4px',
})

const groupHeadingStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--omnispec-nav-item-gap)',
  width: '100%',
  padding: 'var(--omnispec-nav-item-padding-v) var(--omnispec-nav-item-padding-h)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-nav-text)',
  fontSize: 'var(--omnispec-nav-group-font-size)',
  fontWeight: 'var(--omnispec-nav-group-font-weight)' as unknown as number,
  textAlign: 'left',
  textTransform: 'var(--omnispec-nav-group-text-transform)' as unknown as 'uppercase',
  letterSpacing: 'var(--omnispec-nav-group-letter-spacing)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})

const groupIconStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  color: 'var(--omnispec-fg-muted)',
})
