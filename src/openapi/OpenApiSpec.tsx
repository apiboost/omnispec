/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { css, cx } from '@core/styles/css'
import type { BaseSpecProps } from '@core/types/common.types'
import { SpecType } from '@core/types/spec-detection.types'
import { ThemeProvider } from '@core/themes/ThemeProvider'
import { ConfigProvider } from '@core/context/ConfigContext'
import { ExpandProvider } from '@core/context/ExpandContext'
import { resolveSchemaStyle } from '@core/components/SchemaViewer/schema-style'
import { AuthProvider } from '@core/context/AuthContext'
import { DocLayout } from '@core/components/Layout/DocLayout'
import { NavTree } from '@core/components/Navigation/NavTree'
import type { NavItem } from '@core/components/Navigation/NavTree'
import { Icon } from '@core/components/common/Icon'
import { SearchBar } from '@core/components/Navigation/SearchBar'
import { buildSidebar } from '@core/components/Navigation/buildSidebar'
import { AuthPanelModal } from '@core/components/Auth/AuthPanelModal'
import { LoadingScreen } from '@core/components/common/LoadingScreen'
import { ErrorMessage } from '@core/components/common/ErrorMessage'
import { SpecToolbar } from '@core/components/common/SpecToolbar'
import { useOpenApiSpec } from './hooks/useOpenApiSpec'
import { ApiOverview, ApiVersionBadge } from './components/ApiOverview'
import { ServerSelector } from './components/ServerSelector'
import { TagGroup } from './components/TagGroup'
import { ComponentsSection } from './components/ComponentsSection'
import { resolveDownloadLink } from '@core/utils/resolve-download-link'
import { useHashScroll } from '@core/hooks/useHashScroll'
import { useScrollSpy, flattenNavItemIds } from '@core/hooks/useScrollSpy'
import { useSegmentedRouter } from '@core/hooks/useSegmentedRouter'
import { SegmentedContent } from './components/SegmentedContent'
import { operationMatchesSearch } from './search'
import type { OpenApiServer, OpenApiTag } from './types/openapi.types'
import { ErrorBoundary } from '@core/components/common/ErrorBoundary'
import { SpecStatusScreen } from '@core/components/Layout/SpecStatusScreen'

// Sentinel id for the synthetic "Overview" sidebar entry shown in segmented
// mode, giving users a way back to the top-level route (title/servers/schemas).
const OVERVIEW_NAV_ID = '__apidoc_overview__'

// One-time guard so the reference-mode `tryItLayout` warning fires at most once
// per session instead of on every render/instance.
let warnedTryItLayoutIgnored = false

export function OpenApiSpec({
  spec,
  theme,
  proxyUrl,
  proxyHeaders,
  oauth,
  interactiveOAuth = true,
  allowTryIt = true,
  downloadLink,
  layout = 'sidebar',
  sidebarPosition = 'left',
  // Default `panel` (docked side column). Non-breaking: the prop was dead until
  // inline was implemented, so `panel` matches every consumer's current Try-It.
  tryItLayout = 'panel',
  defaultExpandOperations = false,
  displayMode,
  schemaStyle,
  externalRefOrigins,
  serverUrl: serverUrlOverride,
  servers: serversOverride,
  tryItPersistTtl,
  navigationMode,
  pro,
  sidebarNav,
  slots = {},
  onSpecLoaded,
  onTryItRequest: _onTryItRequest,
  onTryItResponse: _onTryItResponse,
  className,
}: BaseSpecProps) {
  const refOptions = useMemo(() => ({
    specUrl: typeof spec === 'string' ? spec : undefined,
    externalRefOrigins,
  }), [spec, externalRefOrigins])

  const { data: parsedSpec, state } = useOpenApiSpec(spec, refOptions)
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [allExpanded, setAllExpanded] = useState(defaultExpandOperations)
  const [expandGeneration, setExpandGeneration] = useState(0)

  const handleToggleExpand = useCallback(() => {
    setAllExpanded((prev) => !prev)
    setExpandGeneration((prev) => prev + 1)
  }, [])

  useMemo(() => {
    if (parsedSpec && onSpecLoaded) {
      onSpecLoaded({
        title: parsedSpec.title,
        version: parsedSpec.version,
        type: parsedSpec.specVersion.startsWith('2') ? SpecType.OPENAPI_2 : SpecType.OPENAPI_3,
      })
    }
  }, [parsedSpec, onSpecLoaded])

  const specOrigin = useMemo(() => {
    if (typeof spec !== 'string') return ''
    try {
      const parsed = new URL(spec, window.location.origin)
      return parsed.origin
    } catch {
      return ''
    }
  }, [spec])

  const resolveServerUrl = useCallback((url: string) => {
    if (url.startsWith('/') && specOrigin) {
      return specOrigin + url
    }
    return url
  }, [specOrigin])

  // Effective server list: `servers` prop override replaces the spec's servers.
  // `serverUrl` (single-URL override) takes precedence over everything.
  const effectiveServers = useMemo<OpenApiServer[]>(() => {
    if (serverUrlOverride) return [{ url: serverUrlOverride }]
    if (serversOverride?.length) {
      return serversOverride.map((s) => ({ url: s.url, description: s.description }))
    }
    return parsedSpec?.servers ?? []
  }, [serverUrlOverride, serversOverride, parsedSpec])

  const serverUrl = useMemo(() => {
    // A forced single-URL override wins over any selection.
    if (serverUrlOverride) return resolveServerUrl(serverUrlOverride)
    if (selectedServer) return resolveServerUrl(selectedServer)
    const first = effectiveServers[0]
    if (!first) return specOrigin || (typeof window !== 'undefined' ? window.location.origin : '')
    let url = first.url
    if (first.variables) {
      for (const [key, variable] of Object.entries(first.variables)) {
        if (variable.default) {
          url = url.replace(`{${key}}`, variable.default)
        }
      }
    }
    return resolveServerUrl(url)
  }, [serverUrlOverride, selectedServer, effectiveServers, specOrigin, resolveServerUrl])

  const navItems: NavItem[] = useMemo(() => {
    if (!parsedSpec) return []

    const tagItemMap = new Map<string, NavItem>()
    for (const tag of parsedSpec.tags) {
      tagItemMap.set(tag.name, {
        id: `tag-${tag.name}`,
        label: tag.displayName ?? tag.name,
        children: tag.operations.map((op) => ({
          id: op.operationId ?? `${op.method}-${op.path}`,
          label: op.summary ?? `${op.method.toUpperCase()} ${op.path}`,
          badge: op.method.toUpperCase(),
          badgeColor: `var(--omnispec-color-${op.method})`,
        })),
      })
    }

    let items: NavItem[]
    if (parsedSpec.tagGroups?.length) {
      items = parsedSpec.tagGroups.map((group) => ({
        id: `group-${group.name}`,
        label: group.name,
        children: group.tags
          .map((tagName) => tagItemMap.get(tagName))
          .filter(Boolean) as NavItem[],
      }))
    } else {
      items = Array.from(tagItemMap.values())
    }

    if (parsedSpec.webhooks?.length) {
      items.push({
        id: 'tag-Webhooks',
        label: 'Webhooks',
        children: parsedSpec.webhooks.map((op) => ({
          id: op.operationId ?? `${op.method}-${op.path}`,
          label: op.summary ?? `${op.method.toUpperCase()} ${op.path}`,
          badge: op.method.toUpperCase(),
          badgeColor: `var(--omnispec-color-${op.method})`,
        })),
      })
    }

    if (parsedSpec.components && Object.keys(parsedSpec.components.schemas).length > 0) {
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

  const filteredTags = useMemo(() => {
    if (!parsedSpec || !searchQuery.trim()) return parsedSpec?.tags ?? []

    const q = searchQuery.toLowerCase()
    return parsedSpec.tags
      .map((tag) => ({
        ...tag,
        operations: tag.operations.filter((op) => operationMatchesSearch(op, q)),
      }))
      .filter((tag) => tag.operations.length > 0)
  }, [parsedSpec, searchQuery])

  // OpenAPI 3.1 webhooks rendered as a synthetic "Webhooks" tag group, filtered
  // by the same sidebar search predicate as regular operations.
  const webhooksTag = useMemo<OpenApiTag | null>(() => {
    if (!parsedSpec?.webhooks?.length) return null
    const q = searchQuery.trim().toLowerCase()
    const operations = q
      ? parsedSpec.webhooks.filter((op) => operationMatchesSearch(op, q))
      : parsedSpec.webhooks
    if (operations.length === 0) return null
    return {
      name: 'Webhooks',
      description: 'Webhooks the API sends to registered subscribers.',
      operations,
    }
  }, [parsedSpec, searchQuery])

  const operationCount = useMemo(
    () => parsedSpec?.tags.reduce((sum, tag) => sum + tag.operations.length, 0) ?? 0,
    [parsedSpec],
  )

  const SEGMENTED_THRESHOLD = 50

  const resolvedMode = useMemo(() => {
    if (navigationMode) return navigationMode
    return operationCount > SEGMENTED_THRESHOLD ? 'segmented' : 'grouped'
  }, [navigationMode, operationCount])

  const isSegmented = resolvedMode === 'segmented'

  const resolvedDisplayMode = displayMode ?? 'compact'
  const resolvedSchemaStyle = resolveSchemaStyle(schemaStyle, pro?.advancedSchemaStyles ?? false)

  // `tryItLayout` only affects compact mode; reference mode owns its own Try-It
  // placement. Warn once (dev only) if a consumer set `inline` in reference
  // mode so the no-op is discoverable without spamming the console in prod.
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      resolvedDisplayMode === 'reference' &&
      tryItLayout === 'inline' &&
      !warnedTryItLayoutIgnored
    ) {
      warnedTryItLayoutIgnored = true
      // eslint-disable-next-line no-console
      console.warn(
        "[omnispec] `tryItLayout: 'inline'` is ignored in reference display mode — " +
          'reference mode renders Try-It as its own right-column tab.',
      )
    }
  }, [resolvedDisplayMode, tryItLayout])

  const { route, navigateToOperation, navigateToOverview } = useSegmentedRouter()

  const { navigateTo } = useHashScroll(operationCount)

  const handleNavSelect = navigateTo

  // In segmented mode the sidebar navigates by hash. Route the synthetic
  // Overview entry back to the top-level view; everything else is an operation.
  const handleSegmentedSelect = useCallback(
    (id: string) => {
      if (id === OVERVIEW_NAV_ID) {
        navigateToOverview()
      } else {
        navigateToOperation(id)
      }
    },
    [navigateToOverview, navigateToOperation],
  )

  // Prepend an "Overview" entry so segmented users can return to the top-level
  // route (spec title, servers, schemas) from any operation.
  const segmentedNavItems = useMemo<NavItem[]>(() => {
    if (!isSegmented) return navItems
    return [
      { id: OVERVIEW_NAV_ID, label: 'Overview', icon: <Icon name="home" size="1rem" /> },
      ...navItems,
    ]
  }, [isSegmented, navItems])

  // Grouped (single-page) mode highlights the sidebar entry for the operation
  // currently in view; segmented mode already tracks the active route.
  const navSectionIds = useMemo(() => flattenNavItemIds(navItems), [navItems])
  const activeSection = useScrollSpy(navSectionIds)

  if (state.status === 'loading') {
    return (
      <ThemeProvider theme={theme}>
        <div className={cx('omnispec-openapi', className)}>
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
        className={cx('omnispec-openapi', className)}
      >
        <ErrorMessage title="Failed to load specification" message={state.error} />
      </SpecStatusScreen>
    )
  }

  if (!parsedSpec) return null

  const specNav = (
    <>
      <div className={headingStyle}>Operations</div>
      <SearchBar
        placeholder="Filter endpoints..."
        onSearch={setSearchQuery}
      />
      <NavTree
        items={segmentedNavItems}
        activeId={isSegmented ? (route.operationId ?? OVERVIEW_NAV_ID) : activeSection}
        onSelect={isSegmented ? handleSegmentedSelect : handleNavSelect}
        parentToggleOnly={isSegmented}
      />
    </>
  )

  const sidebar = buildSidebar(sidebarNav, specNav)

  const resolvedDownloadLink = resolveDownloadLink(downloadLink, spec)

  return (
    <ConfigProvider config={{ proxyUrl, proxyHeaders, oauth, allowTryIt, layout, sidebarPosition, tryItLayout, defaultExpandOperations, displayMode: resolvedDisplayMode, schemaStyle: resolvedSchemaStyle, slots, proRenderers: pro?.renderers ?? new Map(), premiumThemingEnabled: pro?.premiumThemingEnabled ?? false, interactiveAuth: pro?.interactiveAuth, interactiveOAuth, specKey: `${parsedSpec.title}@${parsedSpec.version}`, tryItPersistTtl }}>
      <ExpandProvider expandAll={allExpanded} expandGeneration={expandGeneration}>
        <ThemeProvider theme={theme}>
          <AuthProvider schemes={parsedSpec.securitySchemes}>
            <div className={`omnispec-openapi ${className ?? ''}`}>
              <AuthPanelModal serverUrl={serverUrl} />
              <ErrorBoundary title="Failed to render this API reference">
                <DocLayout
                  layout={layout}
                  sidebarPosition={sidebarPosition}
                  sidebar={sidebar}
                  sidebarHeader={slots.sidebarHeader ?? (parsedSpec.logo ? (
                    <a href={parsedSpec.logo.href ?? '#'} className={logoLinkStyle}>
                      <img
                        src={parsedSpec.logo.url}
                        alt={parsedSpec.logo.altText ?? 'Logo'}
                        className={logoImgStyle}
                        style={parsedSpec.logo.backgroundColor ? { backgroundColor: parsedSpec.logo.backgroundColor } : undefined}
                      />
                    </a>
                  ) : undefined)}
                  sidebarFooter={slots.sidebarFooter}
                  header={slots.header}
                  contentHeader={slots.contentHeader}
                  footer={slots.footer}
                >
                  {isSegmented ? (
                    <SegmentedContent
                      route={route}
                      parsedSpec={parsedSpec}
                      serverUrl={serverUrl}
                      onBack={navigateToOverview}
                      overviewContent={
                        <>
                          <SpecToolbar
                            overview={<ApiOverview spec={parsedSpec} />}
                            versionBadge={<ApiVersionBadge version={parsedSpec.version} />}
                            expandLabel="schemas"
                            allExpanded={allExpanded}
                            onToggleExpand={handleToggleExpand}
                            downloadLink={resolvedDownloadLink}
                          />
                          <ServerSelector
                            servers={effectiveServers}
                            selectedUrl={serverUrl}
                            onSelect={setSelectedServer}
                          />
                          <ComponentsSection
                            components={parsedSpec.components}
                            expandAll={allExpanded}
                            expandGeneration={expandGeneration}
                          />
                        </>
                      }
                    />
                  ) : (
                    <>
                      <SpecToolbar
                        overview={<ApiOverview spec={parsedSpec} />}
                        versionBadge={<ApiVersionBadge version={parsedSpec.version} />}
                        expandLabel="operations"
                        allExpanded={allExpanded}
                        onToggleExpand={handleToggleExpand}
                        downloadLink={resolvedDownloadLink}
                      />
                      <ServerSelector
                        servers={effectiveServers}
                        selectedUrl={serverUrl}
                        onSelect={setSelectedServer}
                      />
                      {filteredTags.map((tag) => (
                        <TagGroup
                          key={tag.name}
                          tag={tag}
                          serverUrl={serverUrl}
                          expandAll={allExpanded}
                          expandGeneration={expandGeneration}
                        />
                      ))}
                      {webhooksTag && (
                        <TagGroup
                          key="__webhooks__"
                          tag={webhooksTag}
                          serverUrl={serverUrl}
                          expandAll={allExpanded}
                          expandGeneration={expandGeneration}
                        />
                      )}
                      <ComponentsSection
                        components={parsedSpec.components}
                        expandAll={allExpanded}
                        expandGeneration={expandGeneration}
                      />
                    </>
                  )}
                </DocLayout>
              </ErrorBoundary>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </ExpandProvider>
    </ConfigProvider>
  )
}

const headingStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--omnispec-nav-heading-color)',
  padding: '1rem 0.75rem 0.25rem',
})

const logoLinkStyle = css({
  display: 'block',
  padding: '0.75rem',
  textDecoration: 'none',
})

const logoImgStyle = css({
  maxWidth: '100%',
  maxHeight: '4rem',
  objectFit: 'contain',
})
