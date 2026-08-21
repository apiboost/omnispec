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
import { css } from '@core/styles/css'
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

  const navItems: NavItem[] = useMemo(() => {
    if (!parsedSpec) return []

    const channelItems: NavItem[] = parsedSpec.channels.map((ch) => {
      const actionLabels = ch.operations.map((op) =>
        op.action.toUpperCase(),
      ).join('/')

      return {
        id: `channel-${ch.name}`,
        label: ch.address,
        badge: actionLabels || undefined,
        badgeColor: ch.operations[0]?.action === 'subscribe' || ch.operations[0]?.action === 'receive'
          ? 'var(--omnispec-color-subscribe)'
          : 'var(--omnispec-color-publish)',
      }
    })

    const items: NavItem[] = []

    if (parsedSpec.servers.length > 0) {
      items.push({ id: 'servers', label: 'Servers' })
    }

    items.push({
      id: 'channels',
      label: 'Channels',
      children: channelItems,
    })

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

    return items
  }, [parsedSpec])

  const filteredChannels = useMemo(() => {
    if (!parsedSpec || !searchQuery.trim()) return parsedSpec?.channels ?? []

    const q = searchQuery.toLowerCase()
    return parsedSpec.channels.filter((ch) =>
      ch.address.toLowerCase().includes(q) ||
      ch.description?.toLowerCase().includes(q) ||
      ch.operations.some((op) =>
        op.operationId?.toLowerCase().includes(q) ||
        op.summary?.toLowerCase().includes(q),
      ),
    )
  }, [parsedSpec, searchQuery])

  const handleNavSelect = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
                  {filteredChannels.map((channel) => (
                    <ChannelDetail
                      key={channel.name}
                      id={`channel-${channel.name}`}
                      channel={channel}
                      expandAll={allExpanded}
                      expandGeneration={expandGeneration}
                    />
                  ))}
                </div>

                <ComponentsSection components={parsedSpec.components} />
              </DocLayout>
            </ErrorBoundary>
          </div>
        </ThemeProvider>
      </ExpandProvider>
    </ConfigProvider>
  )
}
