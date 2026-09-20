/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useMemo, useState } from 'react'
import { css, cx } from '@core/styles/css'
import type { BaseSpecProps } from '@core/types/common.types'
import { SpecType } from '@core/types/spec-detection.types'
import { ThemeProvider } from '@core/themes/ThemeProvider'
import { ConfigProvider } from '@core/context/ConfigContext'
import { ExpandProvider } from '@core/context/ExpandContext'
import { resolveSchemaStyle } from '@core/components/SchemaViewer/schema-style'
import { DocLayout } from '@core/components/Layout/DocLayout'
import { NavTree } from '@core/components/Navigation/NavTree'
import type { NavItem } from '@core/components/Navigation/NavTree'
import { useScrollSpy, flattenNavItemIds } from '@core/hooks/useScrollSpy'
import { useHashScroll } from '@core/hooks/useHashScroll'
import { SearchBar } from '@core/components/Navigation/SearchBar'
import { buildSidebar } from '@core/components/Navigation/buildSidebar'
import { LoadingScreen } from '@core/components/common/LoadingScreen'
import { ErrorMessage } from '@core/components/common/ErrorMessage'
import { ErrorBoundary } from '@core/components/common/ErrorBoundary'
import { SpecStatusScreen } from '@core/components/Layout/SpecStatusScreen'
import { SpecToolbar } from '@core/components/common/SpecToolbar'
import { resolveDownloadLink } from '@core/utils/resolve-download-link'
import { useAsyncApiSpec } from './hooks/useAsyncApiSpec'
import { AsyncOverview } from './components/AsyncOverview'
import { ServerList } from './components/ServerList'
import { ChannelDetail } from './components/ChannelDetail'
import { ComponentsSection } from './components/ComponentsSection'
import { SecuritySchemesSection } from './components/SecuritySchemesSection'
import { groupChannelsByTag, hasAnyTags } from './tag-grouping'
import { TagGroupHeader } from './components/TagGroupHeader'

export function AsyncApiSpec({
  spec,
  theme,
  layout = 'sidebar',
  sidebarPosition = 'left',
  defaultExpandOperations = false,
  downloadLink,
  sidebarNav,
  slots = {},
  schemaStyle,
  pro,
  onSpecLoaded,
  className,
}: BaseSpecProps) {
  const resolvedSchemaStyle = resolveSchemaStyle(schemaStyle, pro?.advancedSchemaStyles ?? false)
  const { data: parsedSpec, state } = useAsyncApiSpec(spec)
  const [searchQuery, setSearchQuery] = useState('')
  const [allExpanded, setAllExpanded] = useState(defaultExpandOperations)
  const [expandGeneration, setExpandGeneration] = useState(0)
  // Sidebar grouping: by channel (default) or by operation. AsyncAPI 3.x treats
  // operations as first-class, so an operation-first index is offered as a toggle.
  const [navGrouping, setNavGrouping] = useState<'channel' | 'operation'>('channel')

  const handleToggleExpand = useCallback(() => {
    setAllExpanded((prev) => !prev)
    setExpandGeneration((prev) => prev + 1)
  }, [])

  useMemo(() => {
    if (parsedSpec && onSpecLoaded) {
      const major = parseInt(parsedSpec.specVersion.split('.')[0], 10)
      onSpecLoaded({
        title: parsedSpec.title,
        version: parsedSpec.version,
        type: major >= 3 ? SpecType.ASYNCAPI_3 : SpecType.ASYNCAPI_2,
      })
    }
  }, [parsedSpec, onSpecLoaded])

  const filteredChannels = useMemo(() => {
    if (!parsedSpec || !searchQuery.trim()) return parsedSpec?.channels ?? []

    const q = searchQuery.toLowerCase()
    return parsedSpec.channels.filter((ch) =>
      ch.address.toLowerCase().includes(q) ||
      ch.description?.toLowerCase().includes(q) ||
      ch.operations.some((op) =>
        op.operationId?.toLowerCase().includes(q) ||
        op.summary?.toLowerCase().includes(q) ||
        (op.tags ?? []).some((t) => t.name.toLowerCase().includes(q)),
      ),
    )
  }, [parsedSpec, searchQuery])

  // Group channels by tag when any channel is tagged; otherwise keep a flat list.
  const grouped = useMemo(() => hasAnyTags(filteredChannels), [filteredChannels])
  const tagGroups = useMemo(
    () => (grouped ? groupChannelsByTag(filteredChannels, parsedSpec?.tags) : []),
    [grouped, filteredChannels, parsedSpec],
  )

  // The DOM id of each channel's first rendered card. In tag-grouped content a
  // channel can appear under several tag groups; operation-mode nav targets the
  // first occurrence so a single stable anchor always exists.
  const channelDomId = useMemo(() => {
    const map = new Map<string, string>()
    if (grouped) {
      for (const group of tagGroups) {
        for (const ch of group.channels) {
          if (!map.has(ch.name)) map.set(ch.name, `${group.label}-channel-${ch.name}`)
        }
      }
    } else {
      for (const ch of filteredChannels) map.set(ch.name, `channel-${ch.name}`)
    }
    return map
  }, [grouped, tagGroups, filteredChannels])

  const hasOperations = useMemo(
    () => filteredChannels.some((ch) => ch.operations.length > 0),
    [filteredChannels],
  )

  const navItems: NavItem[] = useMemo(() => {
    if (!parsedSpec) return []

    const actionLabel = (action: string) => action.toUpperCase()
    const actionColor = (action: string) =>
      action === 'subscribe' || action === 'receive'
        ? 'var(--omnispec-color-subscribe)'
        : 'var(--omnispec-color-publish)'

    const channelNavItem = (ch: typeof filteredChannels[number], idPrefix: string): NavItem => ({
      id: `${idPrefix}channel-${ch.name}`,
      label: ch.address,
      badge: ch.operations.map((op) => actionLabel(op.action)).join('/') || undefined,
      badgeColor: actionColor(ch.operations[0]?.action ?? ''),
    })

    // Operation-first index: one entry per operation, navigating to its channel card.
    const operationNavItems = (): NavItem[] =>
      filteredChannels.flatMap((ch) =>
        ch.operations.map((op, idx) => ({
          id: `op::${ch.name}::${idx}`,
          label: op.operationId ?? op.summary ?? `${actionLabel(op.action)} ${ch.address}`,
          badge: actionLabel(op.action),
          badgeColor: actionColor(op.action),
        })),
      )

    // Derived from filteredChannels so the sidebar tracks the filter input.
    const channelChildren: NavItem[] = navGrouping === 'operation'
      ? operationNavItems()
      : grouped
        ? tagGroups.map((group) => ({
          id: `taggroup-${group.label}`,
          label: group.label,
          badge: String(group.channels.length),
          children: group.channels.map((ch) => channelNavItem(ch, `${group.label}-`)),
        }))
        : filteredChannels.map((ch) => channelNavItem(ch, ''))

    const items: NavItem[] = []

    if (parsedSpec.servers.length > 0) {
      items.push({ id: 'servers', label: 'Servers' })
    }

    items.push({
      id: 'channels',
      label: navGrouping === 'operation' ? 'Operations' : 'Channels',
      children: channelChildren,
    })

    if (Object.keys(parsedSpec.components.messages ?? {}).length > 0) {
      items.push({
        id: 'messages',
        label: 'Messages',
        children: Object.keys(parsedSpec.components.messages).map((name) => ({
          id: `message-${name}`,
          label: name,
        })),
      })
    }

    if (Object.keys(parsedSpec.components.schemas).length > 0) {
      items.push({
        id: 'schemas',
        label: 'Schemas',
        children: Object.keys(parsedSpec.components.schemas).map((name) => ({
          id: `schema-${name}`,
          label: name,
        })),
      })
    }

    if (Object.keys(parsedSpec.components.securitySchemes).length > 0) {
      items.push({ id: 'security', label: 'Security Schemes' })
    }

    return items
  }, [parsedSpec, grouped, tagGroups, filteredChannels, navGrouping])

  const { navigateTo } = useHashScroll(filteredChannels.length)

  const handleNavSelect = useCallback((id: string) => {
    // Operation-mode items encode the owning channel; resolve to its card anchor
    // so the (collapsed) card expands and scrolls into view.
    if (id.startsWith('op::')) {
      const name = id.slice(4, id.lastIndexOf('::'))
      const target = channelDomId.get(name)
      if (target) navigateTo(target)
      return
    }
    navigateTo(id)
  }, [navigateTo, channelDomId])

  // Highlight the sidebar entry for the channel/section currently in view.
  const navSectionIds = useMemo(() => flattenNavItemIds(navItems), [navItems])
  const activeSection = useScrollSpy(navSectionIds)

  if (state.status === 'loading') {
    return (
      <ThemeProvider theme={theme}>
        <div className={`omnispec-asyncapi ${className ?? ''}`}>
          <LoadingScreen />
        </div>
      </ThemeProvider>
    )
  }

  if (state.status === 'error') {
    return (
      <SpecStatusScreen
        theme={theme}
        layout={layout}
        sidebarPosition={sidebarPosition}
        slots={slots}
        sidebarNav={sidebarNav}
        premiumThemingEnabled={pro?.premiumThemingEnabled ?? false}
        className={`omnispec-asyncapi ${className ?? ''}`}
      >
        <ErrorMessage title="Failed to load specification" message={state.error} />
      </SpecStatusScreen>
    )
  }

  if (!parsedSpec) return null

  const specNav = (
    <>
      <SearchBar
        placeholder="Filter channels..."
        onSearch={setSearchQuery}
      />
      {hasOperations && (
        <div className={groupToggleStyle} role="group" aria-label="Sidebar grouping">
          <span className={groupToggleLabelStyle}>Group by</span>
          <div className={groupToggleButtonsStyle}>
            <button
              type="button"
              className={cx(groupToggleButtonStyle, navGrouping === 'channel' && groupToggleActiveStyle)}
              aria-pressed={navGrouping === 'channel'}
              aria-label="Group by channel"
              onClick={() => setNavGrouping('channel')}
            >
              Channel
            </button>
            <button
              type="button"
              className={cx(groupToggleButtonStyle, navGrouping === 'operation' && groupToggleActiveStyle)}
              aria-pressed={navGrouping === 'operation'}
              aria-label="Group by operation"
              onClick={() => setNavGrouping('operation')}
            >
              Operation
            </button>
          </div>
        </div>
      )}
      <NavTree
        items={navItems}
        activeId={activeSection}
        onSelect={handleNavSelect}
      />
    </>
  )

  const sidebar = buildSidebar(sidebarNav, specNav)
  const resolvedDownloadLink = resolveDownloadLink(downloadLink, spec)

  return (
    <ConfigProvider config={{ allowTryIt: false, layout, sidebarPosition, defaultExpandOperations, schemaStyle: resolvedSchemaStyle, slots, proRenderers: pro?.renderers ?? new Map(), premiumThemingEnabled: pro?.premiumThemingEnabled ?? false }}>
      <ExpandProvider expandAll={allExpanded} expandGeneration={expandGeneration}>
        <ThemeProvider theme={theme}>
          <div className={`omnispec-asyncapi ${className ?? ''}`}>
            <ErrorBoundary title="Failed to render this API reference">
              <DocLayout
                layout={layout}
                sidebarPosition={sidebarPosition}
                sidebar={sidebar}
                sidebarHeader={slots.sidebarHeader}
                sidebarFooter={slots.sidebarFooter}
                header={slots.header}
                footer={slots.footer}
              >
                <SpecToolbar
                  overview={<AsyncOverview spec={parsedSpec} />}
                  expandLabel="channels"
                  allExpanded={allExpanded}
                  onToggleExpand={handleToggleExpand}
                  downloadLink={resolvedDownloadLink}
                />

                <div id="servers">
                  <ServerList servers={parsedSpec.servers} />
                </div>

                <div id="channels">
                  <h2 className={css({ margin: '0 0 16px', fontSize: 'var(--omnispec-h2-font-size)', fontWeight: 'var(--omnispec-h2-font-weight)', color: 'var(--omnispec-h2-color)' })}>
                    Channels
                  </h2>
                  {filteredChannels.length === 0 ? (
                    <p className={emptyStateStyle}>
                      {parsedSpec.channels.length === 0
                        ? 'No channels are defined for this API.'
                        : 'No channels match your filter.'}
                    </p>
                  ) : grouped ? (
                    tagGroups.map((group) => (
                      <section key={group.label} id={`taggroup-${group.label}`} className={tagSectionStyle}>
                        <TagGroupHeader group={group} />
                        {group.channels.map((channel) => (
                          <ChannelDetail
                            key={`${group.label}-${channel.name}`}
                            id={`${group.label}-channel-${channel.name}`}
                            channel={channel}
                            expandAll={allExpanded}
                            expandGeneration={expandGeneration}
                          />
                        ))}
                      </section>
                    ))
                  ) : (
                    filteredChannels.map((channel) => (
                      <ChannelDetail
                        key={channel.name}
                        id={`channel-${channel.name}`}
                        channel={channel}
                        expandAll={allExpanded}
                        expandGeneration={expandGeneration}
                      />
                    ))
                  )}
                </div>

                <ComponentsSection components={parsedSpec.components} />

                <SecuritySchemesSection securitySchemes={parsedSpec.components.securitySchemes} />
              </DocLayout>
            </ErrorBoundary>
          </div>
        </ThemeProvider>
      </ExpandProvider>
    </ConfigProvider>
  )
}

const emptyStateStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  fontStyle: 'italic',
})

const groupToggleStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px 4px',
  flexWrap: 'wrap',
})

const groupToggleLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-fg-muted)',
})

const groupToggleButtonsStyle = css({
  display: 'inline-flex',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '2px',
})

const groupToggleButtonStyle = css({
  border: 'none',
  background: 'transparent',
  color: 'var(--omnispec-fg-secondary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  padding: '2px 10px',
  borderRadius: 'calc(var(--omnispec-border-radius) - 1px)',
  cursor: 'pointer',
})

const groupToggleActiveStyle = css({
  backgroundColor: 'var(--omnispec-bg-primary)',
  color: 'var(--omnispec-fg-primary)',
  fontWeight: 600,
  boxShadow: 'var(--omnispec-shadow-sm, 0 1px 2px rgba(0,0,0,0.1))',
})

const tagSectionStyle = css({
  marginBottom: '2rem',
})
