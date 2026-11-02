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
import { useHashScroll, requestExpand } from '@core/hooks/useHashScroll'
import { SearchBar } from '@core/components/Navigation/SearchBar'
import { buildSidebar } from '@core/components/Navigation/buildSidebar'
import { LoadingScreen } from '@core/components/common/LoadingScreen'
import { ErrorMessage } from '@core/components/common/ErrorMessage'
import { ErrorBoundary } from '@core/components/common/ErrorBoundary'
import { SpecStatusScreen } from '@core/components/Layout/SpecStatusScreen'
import { SpecToolbar } from '@core/components/common/SpecToolbar'
import { Icon } from '@core/components/common/Icon'
import { resolveDownloadLink } from '@core/utils/resolve-download-link'
import { useAsyncApiSpec } from './hooks/useAsyncApiSpec'
import { AsyncOverview } from './components/AsyncOverview'
import { ServerList } from './components/ServerList'
import { ChannelDetail } from './components/ChannelDetail'
import { ChannelReferenceDetail } from './components/ChannelReferenceDetail'
import { ComponentsSection } from './components/ComponentsSection'
import { SecuritySchemesSection } from './components/SecuritySchemesSection'
import { groupChannelsByTag, hasAnyTags, type TagGroup } from './tag-grouping'
import type { ParsedAsyncApiSpec } from './types/asyncapi.types'
import { TagGroupHeader } from './components/TagGroupHeader'

export function AsyncApiSpec({
  spec,
  theme,
  layout = 'sidebar',
  sidebarPosition = 'left',
  defaultExpandOperations = false,
  displayMode,
  downloadLink,
  sidebarNav,
  slots = {},
  schemaStyle,
  pro,
  onSpecLoaded,
  className,
}: BaseSpecProps) {
  const resolvedSchemaStyle = resolveSchemaStyle(schemaStyle, pro?.advancedSchemaStyles ?? false)
  // Match OpenApiSpec: `reference` switches to the three-panel layout; anything
  // else (including unset) stays compact single-column.
  const resolvedDisplayMode = displayMode ?? 'compact'
  const { data: parsedSpec, state } = useAsyncApiSpec(spec)
  const [searchQuery, setSearchQuery] = useState('')
  const [allExpanded, setAllExpanded] = useState(defaultExpandOperations)
  const [expandGeneration, setExpandGeneration] = useState(0)
  // Sidebar grouping: by channel (default) or by operation. AsyncAPI 3.x treats
  // operations as first-class, so an operation-first index is offered as a toggle.
  const [navGrouping, setNavGrouping] = useState<'channel' | 'operation'>('channel')

  // When a tag chip is clicked it drives the same search filter, but we also
  // track which tag is active so the filter can be shown as a dismissible
  // indicator and toggled off by re-clicking the active chip.
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)

  const handleToggleExpand = useCallback(() => {
    setAllExpanded((prev) => !prev)
    setExpandGeneration((prev) => prev + 1)
  }, [])

  // Clicking a tag chip filters to that tag; clicking the already-active tag
  // toggles the filter back off (so there's always a way to clear it).
  const handleTagFilter = useCallback((tagName: string) => {
    setActiveTagFilter((prev) => {
      const next = prev === tagName ? null : tagName
      setSearchQuery(next ?? '')
      return next
    })
  }, [])

  // Typing in the filter box is an independent search — it supersedes (and
  // clears) any active tag filter so the indicator never lies about why the
  // list is filtered.
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setActiveTagFilter(null)
  }, [])

  const clearTagFilter = useCallback(() => {
    setActiveTagFilter(null)
    setSearchQuery('')
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
    () => (grouped ? groupChannelsByTag(filteredChannels, parsedSpec?.tags, parsedSpec?.tagGroups) : []),
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
          if (!map.has(ch.name)) map.set(ch.name, `${group.id}-channel-${ch.name}`)
        }
      }
    } else {
      for (const ch of filteredChannels) map.set(ch.name, `channel-${ch.name}`)
    }
    return map
  }, [grouped, tagGroups, filteredChannels])

  // The DOM id of an operation block (rendered inside its channel's first card),
  // plus a lookup from that id back to the channel card so operation-mode nav can
  // expand the (collapsed) card before scrolling.
  const operationDomId = useCallback(
    (channelName: string, idx: number) => `${channelDomId.get(channelName) ?? `channel-${channelName}`}-op-${idx}`,
    [channelDomId],
  )
  const opToCard = useMemo(() => {
    const map = new Map<string, string>()
    for (const ch of filteredChannels) {
      const card = channelDomId.get(ch.name) ?? `channel-${ch.name}`
      ch.operations.forEach((_, idx) => map.set(`${card}-op-${idx}`, card))
    }
    return map
  }, [filteredChannels, channelDomId])

  const hasOperations = useMemo(
    () => filteredChannels.some((ch) => ch.operations.length > 0),
    [filteredChannels],
  )

  // Operations referencing a channel that isn't defined (including documents
  // with zero channels) are collected by the parser under a synthetic
  // "__unassigned__" group. Surface an always-visible notice so they never
  // disappear silently behind a collapsed card.
  const unassignedOpCount = useMemo(
    () =>
      parsedSpec?.channels
        .filter((ch) => ch.name === '__unassigned__')
        .reduce((sum, ch) => sum + ch.operations.length, 0) ?? 0,
    [parsedSpec],
  )

  const navItems: NavItem[] = useMemo(() => {
    if (!parsedSpec) return []

    const actionLabel = (action: string) => action.toUpperCase()
    const actionColor = (action: string) =>
      action === 'subscribe' || action === 'receive'
        ? 'var(--omnispec-color-subscribe)'
        : 'var(--omnispec-color-publish)'

    const channelNavItem = (ch: typeof filteredChannels[number], idPrefix: string): NavItem => {
      // Dedupe actions so a channel with two same-action operations shows one
      // badge (e.g. `RECEIVE`, not `RECEIVE/RECEIVE`).
      const uniqueActions = [...new Set(ch.operations.map((op) => actionLabel(op.action)))]
      return {
        id: `${idPrefix}channel-${ch.name}`,
        label: ch.address,
        badge: uniqueActions.join('/') || undefined,
        badgeColor: actionColor(ch.operations[0]?.action ?? ''),
      }
    }

    // Operation-first index: one entry per operation. The id is the operation's
    // real DOM anchor so scroll-spy can highlight it (finding 2).
    const operationNavItems = (): NavItem[] =>
      filteredChannels.flatMap((ch) =>
        ch.operations.map((op, idx) => ({
          id: operationDomId(ch.name, idx),
          label: op.operationId ?? op.summary ?? `${actionLabel(op.action)} ${ch.address}`,
          badge: actionLabel(op.action),
          badgeColor: actionColor(op.action),
        })),
      )

    const tagGroupNavItem = (group: typeof tagGroups[number]): NavItem => ({
      id: `taggroup-${group.id}`,
      label: group.label,
      badge: String(group.channels.length),
      children: group.channels.map((ch) => channelNavItem(ch, `${group.id}-`)),
    })

    // Channel mode: flat tags, or — when x-tagGroups is present — tag groups
    // nested under their x-tagGroup, matching OpenApiSpec (finding 7).
    const channelChildren: NavItem[] = navGrouping === 'operation'
      ? operationNavItems()
      : grouped
        ? nestByTagGroups(tagGroups, parsedSpec.tagGroups, tagGroupNavItem)
        : filteredChannels.map((ch) => channelNavItem(ch, ''))

    const items: NavItem[] = []

    if (parsedSpec.servers.length > 0) {
      items.push({ id: 'servers', label: 'Servers' })
    }

    // When a search filters every channel out, don't leave a bare empty
    // "Channels" parent — surface a non-navigating "No results" affordance
    // instead. If the spec genuinely has no channels, omit the
    // group entirely rather than show a misleading "No results".
    const searchedToEmpty = channelChildren.length === 0 && searchQuery.trim().length > 0
    const channelsChildren: NavItem[] = searchedToEmpty
      ? [{ id: 'channels-no-results', label: 'No results', className: noResultsNavStyle }]
      : channelChildren

    if (channelsChildren.length > 0) {
      items.push({
        id: 'channels',
        label: navGrouping === 'operation' ? 'Operations' : 'Channels',
        children: channelsChildren,
      })
    }

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
  }, [parsedSpec, grouped, tagGroups, filteredChannels, navGrouping, operationDomId, searchQuery])

  const { navigateTo } = useHashScroll(filteredChannels.length)

  const handleNavSelect = useCallback((id: string) => {
    // Operation-mode items point at an operation block inside a (collapsed)
    // channel card; expand the card first, then scroll to the operation.
    const cardId = opToCard.get(id)
    if (cardId) {
      requestExpand(cardId)
      navigateTo(id)
      return
    }
    navigateTo(id)
  }, [navigateTo, opToCard])

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
        onSearch={handleSearch}
        value={searchQuery}
      />
      {activeTagFilter && (
        <div className={activeFilterStyle}>
          <span className={activeFilterLabelStyle}>Filtered by tag:</span>
          <span className={activeFilterTagStyle}>{activeTagFilter}</span>
          <button
            type="button"
            className={activeFilterClearStyle}
            onClick={clearTagFilter}
            aria-label={`Clear tag filter: ${activeTagFilter}`}
          >
            Clear
            <Icon name="xmark" size="0.75rem" strokeWidth={2.5} />
          </button>
        </div>
      )}
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
    <ConfigProvider config={{ allowTryIt: false, layout, sidebarPosition, defaultExpandOperations, displayMode: resolvedDisplayMode, schemaStyle: resolvedSchemaStyle, slots, proRenderers: pro?.renderers ?? new Map(), premiumThemingEnabled: pro?.premiumThemingEnabled ?? false }}>
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
                  <h2 className={css({ margin: '0 0 1rem', fontSize: 'var(--omnispec-h2-font-size)', fontWeight: 'var(--omnispec-h2-font-weight)', color: 'var(--omnispec-h2-color)' })}>
                    Channels
                  </h2>
                  {unassignedOpCount > 0 && (
                    <p className={unassignedNoticeStyle} role="alert">
                      {`Unresolved reference: ${unassignedOpCount} ${unassignedOpCount === 1 ? 'operation references' : 'operations reference'} an undefined channel. ${unassignedOpCount === 1 ? 'It is' : 'They are'} listed under "Unassigned operations" below rather than dropped.`}
                    </p>
                  )}
                  {filteredChannels.length === 0 ? (
                    <p className={emptyStateStyle}>
                      {parsedSpec.channels.length === 0
                        ? 'No channels are defined for this API.'
                        : 'No channels match your filter.'}
                    </p>
                  ) : grouped ? (
                    tagGroups.map((group) => (
                      <section key={group.id} id={`taggroup-${group.id}`} className={tagSectionStyle}>
                        <TagGroupHeader group={group} />
                        {group.channels.map((channel) => (
                          <ChannelCard
                            key={`${group.id}-${channel.name}`}
                            id={`${group.id}-channel-${channel.name}`}
                            channel={channel}
                            displayMode={resolvedDisplayMode}
                            expandAll={allExpanded}
                            expandGeneration={expandGeneration}
                            onTagClick={handleTagFilter}
                          />
                        ))}
                      </section>
                    ))
                  ) : (
                    filteredChannels.map((channel) => (
                      <ChannelCard
                        key={channel.name}
                        id={`channel-${channel.name}`}
                        channel={channel}
                        displayMode={resolvedDisplayMode}
                        expandAll={allExpanded}
                        expandGeneration={expandGeneration}
                        onTagClick={handleTagFilter}
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

/**
 * Picks the channel renderer by display mode: the three-panel
 * `ChannelReferenceDetail` for `reference`, the compact single-column
 * `ChannelDetail` otherwise. Both accept the same props, so switching modes is a
 * pure presentation change — anchors, expand state, and tag-click wiring carry
 * over unchanged.
 */
function ChannelCard({
  channel,
  id,
  displayMode,
  expandAll,
  expandGeneration,
  onTagClick,
}: {
  channel: ParsedAsyncApiSpec['channels'][number]
  id: string
  displayMode: 'compact' | 'reference'
  expandAll: boolean
  expandGeneration: number
  onTagClick: (tagName: string) => void
}) {
  const Renderer = displayMode === 'reference' ? ChannelReferenceDetail : ChannelDetail
  return (
    <Renderer
      id={id}
      channel={channel}
      expandAll={expandAll}
      expandGeneration={expandGeneration}
      onTagClick={onTagClick}
    />
  )
}

/**
 * Nest tag-group nav items under their `x-tagGroups` parent when the spec
 * declares them (mirrors OpenApiSpec), falling back to a flat list otherwise.
 * Tag groups not referenced by any x-tagGroup (and the Untagged bucket) are
 * appended at the top level so nothing is hidden.
 */
function nestByTagGroups(
  groups: TagGroup[],
  xTagGroups: ParsedAsyncApiSpec['tagGroups'],
  toNav: (group: TagGroup) => NavItem,
): NavItem[] {
  if (!xTagGroups?.length) return groups.map(toNav)

  const byTagName = new Map<string, TagGroup>()
  for (const g of groups) if (g.tag?.name) byTagName.set(g.tag.name, g)

  const used = new Set<TagGroup>()
  const grouped: NavItem[] = xTagGroups
    .map((xg) => {
      const children = xg.tags
        .map((t) => byTagName.get(t))
        .filter((g): g is TagGroup => !!g)
      children.forEach((g) => used.add(g))
      return {
        id: `xtaggroup-${xg.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group'}`,
        label: xg.name,
        children: children.map(toNav),
      }
    })
    .filter((item) => (item.children?.length ?? 0) > 0)

  const leftover = groups.filter((g) => !used.has(g)).map(toNav)
  return [...grouped, ...leftover]
}

const emptyStateStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  fontStyle: 'italic',
})

const unassignedNoticeStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 0.875rem',
  marginBottom: '1rem',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'color-mix(in srgb, var(--omnispec-color-warning) 12%, transparent)',
  color: 'var(--omnispec-color-warning)',
  fontSize: 'var(--omnispec-font-size-sm)',
})

const noResultsNavStyle = css({
  fontStyle: 'italic',
  color: 'var(--omnispec-fg-muted)',
  cursor: 'default',
})

const groupToggleStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem 0.25rem',
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
  padding: '0.125rem',
})

const groupToggleButtonStyle = css({
  border: 'none',
  background: 'transparent',
  color: 'var(--omnispec-fg-secondary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  padding: '0.125rem 0.625rem',
  borderRadius: 'calc(var(--omnispec-border-radius) - 1px)',
  cursor: 'pointer',
})

const groupToggleActiveStyle = css({
  backgroundColor: 'var(--omnispec-bg-primary)',
  color: 'var(--omnispec-fg-primary)',
  fontWeight: 600,
  boxShadow: 'var(--omnispec-shadow-sm, 0 1px 0.125rem rgba(0,0,0,0.1))',
})

const tagSectionStyle = css({
  marginBottom: '2rem',
})

// Active tag-filter indicator, shown under the filter box so there's always a
// visible sign that (and why) the list is filtered, plus a way to clear it.
const activeFilterStyle = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.375rem',
  padding: '0 0.75rem 0.5rem',
})

const activeFilterLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-fg-muted)',
})

const activeFilterTagStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 500,
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.125rem 0.5rem',
  borderRadius: 'var(--omnispec-border-radius)',
})

const activeFilterClearStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.1875rem',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  marginLeft: 'auto',
  padding: '0.125rem 0.25rem',
  borderRadius: 'var(--omnispec-border-radius)',
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-color-primary)',
  '&:hover': {
    backgroundColor: 'var(--omnispec-bg-tertiary)',
  },
})
