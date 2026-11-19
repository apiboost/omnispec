/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState, useEffect, useMemo, useCallback, useRef, useId } from 'react'
import type { FocusEvent, MouseEvent, ReactNode } from 'react'
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@core/components/common/Icon'
import { useConfig } from '@core/context/ConfigContext'
import { MobileDrawerDismissContext } from './MobileDrawerDismissContext'

interface DocLayoutProps {
  sidebar?: ReactNode
  sidebarHeader?: ReactNode
  sidebarFooter?: ReactNode
  children: ReactNode
  layout: 'sidebar' | 'stacked'
  sidebarPosition?: 'left' | 'right'
  header?: ReactNode
  contentHeader?: ReactNode
  footer?: ReactNode
  /**
   * Trail shown in the mobile nav bar, root first — typically any host
   * entries, the spec title, then the active nav item. Empty entries and
   * repeated text entries are dropped.
   */
  breadcrumbs?: ReactNode[]
}

export function DocLayout({
  sidebar,
  sidebarHeader,
  sidebarFooter,
  children,
  layout,
  sidebarPosition = 'left',
  header,
  contentHeader,
  footer,
  breadcrumbs,
}: DocLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  // Viewport offset of the bottom of the mobile bar, measured when the panel
  // opens so the fixed panel starts directly beneath it.
  const [mobilePanelTop, setMobilePanelTop] = useState(0)
  const mobileBarRef = useRef<HTMLDivElement | null>(null)
  const mobilePanelRef = useRef<HTMLDivElement | null>(null)
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null)
  // Stable id tying the mobile nav toggle to the panel it controls
  // (`aria-controls`), so assistive tech announces the relationship.
  const mobilePanelId = useId()
  const isRight = sidebarPosition === 'right'
  // Show the sidebar column when there's anything to put in it — spec-derived
  // nav OR host-provided slots (sidebarHeader/Footer). This keeps the host's
  // navigation reachable even when there is no spec nav, e.g. when a spec fails
  // to load and only the status message renders in the content area.
  const hasSidebar = Boolean(sidebar || sidebarHeader || sidebarFooter)
  const { premiumThemingEnabled } = useConfig()
  const showPoweredBy = !premiumThemingEnabled

  const dismissMobileDrawer = useCallback(() => setMobileSidebarOpen(false), [])

  /*
   * Slot content (sidebarHeader/sidebarFooter) is consumer-provided and can't
   * call our dismiss context, so catch same-tab link navigations by
   * delegation: any click that lands on a non-_blank anchor inside the
   * panel closes it. NavTree items are buttons and close themselves through
   * MobileDrawerDismissContext instead.
   */
  const handlePanelClick = useCallback((event: MouseEvent) => {
    const anchor = (event.target as Element).closest?.('a[href]')
    if (anchor && anchor.getAttribute('target') !== '_blank') {
      setMobileSidebarOpen(false)
    }
  }, [])

  const toggleMobileNav = useCallback(() => {
    setMobilePanelTop(mobileBarRef.current?.getBoundingClientRect().bottom ?? 0)
    setMobileSidebarOpen((open) => !open)
  }, [])

  /*
   * The panel covers the page below the bar, so close it when keyboard focus
   * moves anywhere outside the bar and panel — otherwise Tab would carry on
   * into content hidden underneath it.
   */
  const handleMobileNavBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null
    if (next && !event.currentTarget.contains(next)) {
      setMobileSidebarOpen(false)
    }
  }, [])

  // While open: Escape closes (focus back on the toggle), the page behind is
  // scroll-locked, and the active nav item is brought into view.
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false)
        mobileToggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    mobilePanelRef.current
      ?.querySelector('[aria-current]')
      ?.scrollIntoView?.({ block: 'center' })
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  const crumbs = useMemo(
    () => (breadcrumbs ?? []).filter((crumb, index, all) =>
      crumb !== null && crumb !== undefined && crumb !== false && crumb !== ''
      && (typeof crumb !== 'string' || all.indexOf(crumb) === index)),
    [breadcrumbs],
  )

  const sidebarContent = useMemo(() => (
    <>
      {/* Header slot + nav share ONE scroll region: hosts (e.g. the portal)
          inject a full navigation into the sidebarHeader slot, so it must scroll
          rather than sit in a fixed, unscrollable header band. */}
      <div className={sidebarScrollZone}>
        {(sidebarHeader || sidebarFooter) && (
          <div className={sidebarHeaderZone}>
            {sidebarHeader}
            {sidebarFooter && (
              <div className={sidebarSlotStyle}>{sidebarFooter}</div>
            )}
          </div>
        )}
        {sidebar}
      </div>
      {showPoweredBy && <PoweredByBadge />}
    </>
  ), [sidebar, sidebarHeader, sidebarFooter, showPoweredBy])

  const sidebarEl = useMemo(() => hasSidebar && sidebarOpen ? (
    <aside
      className={css({
        ...sidebarBaseStyles,
        borderRight: isRight ? 'none' : '1px solid var(--omnispec-border-color)',
        borderLeft: isRight ? '1px solid var(--omnispec-border-color)' : 'none',
        order: isRight ? 2 : 0,
        position: 'sticky',
        top: 'var(--omnispec-offset-top, 0px)',
        height: 'calc(100vh - var(--omnispec-offset-top, 0px))',
        display: 'flex',
        flexDirection: 'column',
        [mq.mobile]: {
          display: 'none',
        },
      })}
    >
      <div
        className={collapseRowStyle}
        style={{ justifyContent: isRight ? 'flex-start' : 'flex-end' }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className={collapseBtnStyle}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <Icon name="panel-left-close" size="1.15rem" />
        </button>
      </div>
      {sidebarContent}
    </aside>
  ) : null, [hasSidebar, sidebarOpen, isRight, sidebarContent])

  const expandEl = useMemo(() => hasSidebar && !sidebarOpen ? (
    <button
      type="button"
      onClick={() => setSidebarOpen(true)}
      className={css({
        ...expandBtnBaseStyles,
        borderRight: isRight ? 'none' : '1px solid var(--omnispec-border-color)',
        borderLeft: isRight ? '1px solid var(--omnispec-border-color)' : 'none',
        order: isRight ? 2 : 0,
      })}
      aria-label="Expand sidebar"
      title="Expand sidebar"
    >
      <Icon name="panel-left-open" size="1.15rem" />
    </button>
  ) : null, [hasSidebar, sidebarOpen, isRight, setSidebarOpen])

  if (layout === 'stacked') {
    return (
      <div className={`omnispec-layout omnispec-layout--stacked ${stackedStyle}`}>
        {header && <div className={headerStyle}>{header}</div>}
        <div className={stackedContentStyle}>{children}</div>
        {footer && <div className={footerStyle}>{footer}</div>}
      </div>
    )
  }

  return (
    <div className={`omnispec-layout omnispec-layout--sidebar ${rootStyle}`}>
      {header && <div className={headerStyle}>{header}</div>}

      {/*
        Mobile navigation (below the desktop breakpoint, where the sidebar
        column is hidden): a sticky bar with a sidebar toggle and breadcrumbs.
        The toggle expands the sidebar content as a full-width panel filling
        the viewport below the bar, and the same toggle collapses it. A
        disclosure rather than a modal drawer — there is no backdrop.
      */}
      {hasSidebar && (
        <div
          ref={mobileBarRef}
          className={`omnispec-mobile-nav ${mobileNavStyle}`}
          onBlur={handleMobileNavBlur}
        >
          <div className={mobileBarStyle}>
            <div className={mobileToggleZoneStyle}>
              <button
                ref={mobileToggleRef}
                type="button"
                onClick={toggleMobileNav}
                className={mobileToggleStyle}
                aria-label={mobileSidebarOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={mobileSidebarOpen}
                aria-controls={mobilePanelId}
              >
                <Icon
                  name={mobileSidebarOpen ? 'panel-left-close' : 'panel-left-open'}
                  size="1.15rem"
                />
              </button>
            </div>
            {crumbs.length > 0 && <MobileBreadcrumbs crumbs={crumbs} />}
          </div>
          {mobileSidebarOpen && (
            <div
              id={mobilePanelId}
              ref={mobilePanelRef}
              role="region"
              aria-label="Navigation"
              className={mobilePanelStyle}
              style={{ top: `${mobilePanelTop}px` }}
              onClick={handlePanelClick}
            >
              <MobileDrawerDismissContext.Provider value={dismissMobileDrawer}>
                {sidebarContent}
              </MobileDrawerDismissContext.Provider>
            </div>
          )}
        </div>
      )}

      <div className={bodyStyle}>
        {sidebarEl}
        {expandEl}
        <main className={css({ ...mainBaseStyles, order: 1 })}>
          {contentHeader && <div className={contentHeaderStyle}>{contentHeader}</div>}
          {children}
        </main>
      </div>
      {footer && <div className={footerStyle}>{footer}</div>}

      <BackToTopButton />
    </div>
  )
}

/**
 * Breadcrumb trail for the mobile nav bar. Always fits on one line: when it
 * overflows, the leading crumbs truncate with an ellipsis before the current
 * location does, so the reader sees both where they are and the path to it.
 */
function MobileBreadcrumbs({ crumbs }: { crumbs: ReactNode[] }) {
  return (
    <nav aria-label="Breadcrumb" className={breadcrumbNavStyle}>
      <ol className={breadcrumbListStyle}>
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1
          return (
            <li
              key={index}
              aria-current={isCurrent ? 'location' : undefined}
              className={cx(breadcrumbItemStyle, isCurrent && breadcrumbCurrentStyle)}
            >
              {index > 0 && <span aria-hidden="true">/</span>}
              <span
                className={breadcrumbLabelStyle}
                title={typeof crumb === 'string' ? crumb : undefined}
              >
                {crumb}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * A fixed bottom-right "back to top" affordance that appears once the page has
 * scrolled down, and smoothly returns to the top on click. Tracks window scroll
 * (the sidebar layout scrolls the page).
 */
function BackToTopButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleClick = useCallback(() => {
    const reduce = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="omnispec-back-to-top"
          type="button"
          onClick={handleClick}
          className={backToTopStyle}
          aria-label="Back to top"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <Icon name="arrow-up" size="1.2em" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

const globalHtmlStyles = {
  '& code:not(pre code)': {
    backgroundColor: 'var(--omnispec-bg-code)',
    color: 'var(--omnispec-fg-code)',
    // Small vertical padding + inherited line-height so the inline box hugs the
    // text and does not overrun the lines above/below when wrapped in prose.
    padding: '0.225rem 0.35em',
    lineHeight: 1.2,
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    fontFamily: 'var(--omnispec-font-mono)',
  },
  '& pre': {
    backgroundColor: 'var(--omnispec-bg-code)',
    borderRadius: '0.25rem',
    color: 'var(--omnispec-fg-code)',
    fontFamily: 'var(--omnispec-font-mono)',
    overflow: 'auto',
    maxWidth: '100%',
    padding: '0.25rem 0.5rem',
    // Legible multi-line code with spacing between lines.
    lineHeight: 1.2,
    margin: 0,
  },
  '& pre code': {
    backgroundColor: 'transparent',
    color: 'inherit',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    lineHeight: 'inherit',
  },
  '& blockquote': {
    margin: '1rem 0',
    padding: '0.5rem 1rem',
    borderLeft: '0.1875rem solid var(--omnispec-border-color)',
    color: 'var(--omnispec-fg-secondary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
    borderRadius: '0 0.25rem 0.25rem 0',
    '& p': {
      margin: '0.25rem 0',
    },
  },
}

const rootStyle = css({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  maxWidth: '100%',
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-primary)',
  position: 'relative',
  ...globalHtmlStyles,
})

const stackedStyle = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-primary)',
  ...globalHtmlStyles,
})

const headerStyle = css({
  borderBottom: '1px solid var(--omnispec-border-color)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  marginBottom: '1.875rem',
  [mq.mobile]: {
    marginBottom: '1.25rem',
  },
})

const contentHeaderStyle = css({
  marginBottom: '1rem',
  marginTop: '1rem',
})

const bodyStyle = css({
  display: 'flex',
  flex: 1,
  minHeight: 0,
})

const sidebarBaseStyles = {
  width: 'var(--omnispec-nav-width)',
  minWidth: 'var(--omnispec-nav-width)',
  backgroundColor: 'var(--omnispec-nav-bg)',
  flexShrink: 0,
}

const collapseRowStyle = css({
  display: 'flex',
  flexShrink: 0,
  // Tight top row so the toggle sits close to the top edge without pushing the
  // nav down. Small bottom gap separates it from the first nav item.
  padding: '0.25rem 0.5rem 0.125rem',
})

const collapseBtnStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.6rem',
  height: '1.6rem',
  padding: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-muted)',
  borderRadius: '0.25rem',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})

const sidebarHeaderZone = css({
  flexShrink: 0,
})

const sidebarScrollZone = css({
  flex: 1,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  minHeight: 0,
})

const sidebarSlotStyle = css({
  paddingBottom: '0.75rem',
  marginBottom: '0.75rem',
  borderBottom: '1px solid var(--omnispec-border-color)',
})

const expandBtnBaseStyles = {
  // Thin full-height rail. Uses the same viewport-based height as the open
  // sidebar (not `height: 100%`, which doesn't resolve here and collapsed the
  // border to just the icon's height) so its border runs the full column.
  width: '2.75rem',
  flexShrink: 0,
  background: 'var(--omnispec-nav-bg)',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-muted)',
  // Icon pinned near the top and horizontally centered in the rail, roughly
  // aligned with where the collapse control sat before collapsing.
  display: 'flex' as const,
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  justifyContent: 'flex-start' as const,
  paddingTop: '0.5rem',
  position: 'sticky' as const,
  top: 'var(--omnispec-offset-top, 0px)',
  height: 'calc(100vh - var(--omnispec-offset-top, 0px))',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
}

const mainBaseStyles = {
  flex: 1,
  minWidth: 0,
  padding: '1.5rem',
  [mq.mobile]: {
    padding: '0.75rem',
  },
}

const stackedContentStyle = css({
  flex: 1,
  overflowY: 'auto' as const,
  padding: '1.5rem',
  [mq.mobile]: {
    padding: '0.75rem',
  },
})

const footerStyle = css({
  borderTop: '1px solid var(--omnispec-border-color)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
})

// Mobile-first: the bar shows by default and is hidden on desktop, where the
// sidebar column takes over. Sticks under any host chrome offset.
const mobileNavStyle = css({
  position: 'sticky',
  top: 'var(--omnispec-offset-top, 0px)',
  zIndex: 999,
  backgroundColor: 'var(--omnispec-bg-primary)',
  boxShadow: '0 1px 0 var(--omnispec-border-color)',
  [mq.desktop]: {
    display: 'none',
  },
})

const mobileBarStyle = css({
  display: 'flex',
  alignItems: 'center',
  minHeight: '3rem',
})

const mobileToggleZoneStyle = css({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  padding: '0 0.25rem',
  boxShadow: '1px 0 0 var(--omnispec-border-color)',
})

const mobileToggleStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.25rem',
  height: '2.25rem',
  padding: 0,
  // Same background as the bar in every state; open/closed is conveyed by the
  // icon (and aria-expanded), not a filled button.
  background: 'none',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-primary)',
})

const breadcrumbNavStyle = css({
  flex: 1,
  minWidth: 0,
})

const breadcrumbListStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  margin: 0,
  padding: '0 0.75rem',
  listStyle: 'none',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
})

const breadcrumbItemStyle = css({
  display: 'flex',
  flex: '0 1 auto',
  gap: '0.5rem',
  minWidth: 0,
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
})

// The current location shrinks last and keeps up to 60% of the bar.
const breadcrumbCurrentStyle = css({
  flexShrink: 0,
  maxWidth: '60%',
  color: 'var(--omnispec-fg-primary)',
  fontWeight: 600,
})

const breadcrumbLabelStyle = css({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const mobilePanelStyle = css({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--omnispec-nav-bg, var(--omnispec-bg-primary, #fff))',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: '1rem 1.25rem 0',
  [mq.desktop]: {
    display: 'none',
  },
})

const backToTopStyle = css({
  position: 'fixed',
  bottom: '1.5rem',
  right: '1.5rem',
  width: '3rem',
  height: '3rem',
  borderRadius: '50%',
  backgroundColor: 'var(--omnispec-color-primary, #1a1a2e)',
  color: 'var(--omnispec-color-primary-text, #FFFFFF)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.15)',
  // Below the mobile nav bar and panel (999) so it never covers them.
  zIndex: 998,
})

const POWERED_BY_URL = 'https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=badge&utm_campaign=powered_by'
const AB_LOGO_URI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkyIiB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiI+CjxwYXRoIGQ9Ik04NyAwLjA2QzkzIDAuMDYgOTkgMC4wNiAxMDUgMC4wNkMxMDUuMjggMC4zNiAxMDUuNTYgMC42NyAxMDUuODMgMC45OEMxMDkuMDkgMC44OSAxMTguNDcgMy44MSAxMjAuMTcgMi41N0MxMjEuNjUgNS4wMSAxMzEgNi4zOSAxMzQuMSA4LjA4QzE0Mi44MiAxMi44MSAxNTEuNTQgMTcuMjMgMTU4Ljk5IDIzLjg0QzE2Ny44NSAzMS43MiAxNzYuNjIgNDIuMDMgMTgxLjYgNTMuMzZDMTgzLjMzIDU3LjI4IDE4NS43OCA2MS4xNCAxODYuNjMgNjUuMzNDMTg3LjA1IDY3LjM4IDE4Ny44NCA3MS4wNyAxODkuNDMgNzIuMTdDMTg4LjQ0IDczLjU4IDE4OS44NSA4MS4wMyAxOTEuNDMgODIuMTdDMTkwLjYxIDgzLjE2IDE5MC4zNCA4Ny43MyAxOTEuOTQgODguMzNDMTkxLjk0IDkzLjQ0IDE5MS45NCA5OC41NiAxOTEuOTQgMTAzLjY3QzE5MS42NCAxMDMuOTQgMTkxLjMzIDEwNC4yMiAxOTEuMDIgMTA0LjVDMTkxLjEzIDEwNy45NCAxODguMTIgMTE3LjkxIDE4OS40MyAxMTkuODNDMTg2LjU3IDEyMi4yOCAxODUuODUgMTMwLjUzIDE4My45MSAxMzQuMUMxODEuMDIgMTM5LjQgMTc4LjYyIDE0NS4yMSAxNzQuOTMgMTUwLjExQzE3My4zNSAxNTIuMjEgMTY4LjQ1IDE1Ny4wMiAxNjggMTU5LjE3QzE2NS4wNyAxNjAuNDMgMTYwLjEzIDE2Ny42NiAxNTYuOTYgMTY5LjgxQzE1NS4wMSAxNzEuMTQgMTUxLjM2IDE3Mi44OCAxNTAuMTcgMTc1QzE0Ny4xMiAxNzUuNjEgMTM5LjkyIDE4MS4wOSAxMzYuMzMgMTgyLjgxQzEzNC42MyAxODMuNjIgMTMyLjg0IDE4My42MSAxMzEuODMgMTg1LjQzQzEzMC4zOSAxODQuNTggMTI3LjI3IDE4Ni40MSAxMjUuMzMgMTg2Ljk3QzEyMC4zMSAxODguNDEgMTE0LjY1IDE5MC4yNiAxMDkuNDQgMTkwLjY0QzEwNy44NiAxOTAuNzYgMTAzLjQ5IDE5MC40MyAxMDMgMTkxLjk0Qzk4LjMzIDE5MS45NCA5My42NyAxOTEuOTQgODkgMTkxLjk0Qzg4LjUgMTkwLjQyIDg2LjI0IDE5MS4wOCA4NC44MyAxOTAuODNDODIuMzYgMTkwLjQgNzMuNjkgMTg4LjQgNzIuMTcgMTg5LjQzQzcxLjI0IDE4OC4wNyA2MS4zIDE4NC43NiA2MC4xNyAxODUuNDNDNTkuMTIgMTgzLjU3IDU2Ljk2IDE4My42NyA1NS4yNSAxODIuNjFDNTIuOSAxODEuMTQgNDMuNzQgMTc1LjM5IDQxLjgzIDE3NUM0MC44NyAxNzMuMyAzMS40NSAxNjYuNzMgMjkuMjkgMTY0LjYzQzIzLjE2IDE1OC42OSAxNi44IDE1MC41OCAxMi4zMyAxNDIuNTNDOS42MSAxMzcuNjUgNy40MiAxMzIuMzUgNS40NiAxMjcuMTRDNC41OSAxMjQuODMgNC42NCAxMjEuNjUgMi41NyAxMjAuMTdDMy42NSAxMTguNyAzLjA5IDExNi44NiAxLjU3IDExNS44M0MyLjI4IDExNC43OSAxLjM0IDEwNS40MiAwLjA2IDEwNUMwLjA2IDk5IDAuMDYgOTMgMC4wNiA4N0MxLjcgODYuNDcgMS4wOCA4Mi44NyAxLjMyIDgxLjMzQzIuMTggNzUuODEgMy45NSA3MC42IDUuMzEgNjUuMUM2LjQ2IDYwLjUxIDExLjMgNDkuODggMTQuMDcgNDYuMjNDMTUuNTYgNDQuMjcgMTguNSA0MS4yOCAxOSAzOC44M0MyMC4wMiAzOC4zMSAzMC43NSAyNS44MiAzMy4zMyAyMy41QzM0Ljg1IDIyLjE0IDM4LjA0IDIwLjg0IDM4LjgzIDE5QzQxLjU2IDE4LjQ1IDQ4LjkzIDEyLjU1IDUyLjI1IDEwLjgxQzYyLjU4IDUuNCA3NC41IDEuNjQgODYuMTcgMC45OEM4Ni40NCAwLjY3IDg2LjcyIDAuMzYgODcgMC4wNlpNOTguNSA0My43N0M5Ni43MyA0MC45MiA5MS4wMiAzMy44IDkwLjEgMzEuNzRDODkuMzUgMzAuMDYgOTAuNTQgMjcuNDcgODkuOTcgMjUuNTFDODguNjQgMjAuOSA4Mi41OSAxOS42MSA3OC45MiAyMi4xQzc0LjE0IDI1LjM0IDc1LjUgMzIuODMgODAuNjcgMzQuODJDODIuMzkgMzUuNDggODQuODggMzQuMzQgODYuMyAzNS4xOUM4OC42MSAzNi41NyA5MS4yMSA0MS4xMyA5Mi4zMyA0My41Qzg5Ljk1IDQ1LjI0IDg0LjIzIDQ1LjIyIDgxLjIxIDQ2LjA5Qzc3LjY2IDQ3LjExIDc0LjI1IDUwLjIyIDcwLjc5IDUwLjkxQzY1LjQyIDUxLjk3IDYwLjA3IDUxLjUzIDU0LjY4IDUzLjE4QzI5Ljk1IDYwLjc2IDE0Ljc3IDg4LjYgMjIuMjIgMTEzLjU4QzI1LjgzIDEyNS43MiAzNC40NSAxMzYuOCA0NS43IDE0Mi44MUM0OS4zOSAxNDQuNzggNTMuOTEgMTQ1LjQxIDU3LjQ4IDE0Ny4zM0M1OS4xNCAxNDguMjIgNTguOTUgMTUwLjg0IDYwLjYxIDE1MS44NkM2Mi41OCAxNTMuMDggNjkuNzkgMTUzLjMgNzIuNjkgMTU0LjE2Qzg5Ljc1IDE1OS4yMyA5NC44MyAxNjMuODMgMTEzLjEyIDE1Ni4yN0MxMTcuMiAxNTQuNTggMTIxLjQ2IDE1My4wOSAxMjUuODMgMTUyLjI2QzEyNy45OSAxNTEuODUgMTMwLjgxIDE1Mi42MSAxMzIuNjEgMTUxLjExQzEzMy45IDE1MC4wNCAxMzMuNzkgMTQ4LjUzIDEzNC40NCAxNDcuMTdDMTQ0Ljc0IDE0My4xMyAxNTMuNjQgMTM4Ljc5IDE2MC43IDEyOS44N0MxNzYuMjkgMTEwLjIgMTczLjkzIDc5Ljg1IDE1NC45MyA2My4yNUMxNDcuNzcgNTYuOTkgMTM4Ljk5IDUyLjY0IDEyOS41MiA1MS4yMUMxMjYuNTYgNTAuNzcgMTIzLjQgNTEuMjYgMTIwLjUgNTAuNzVDMTE3LjI2IDUwLjE4IDExMy44IDQ3LjMxIDExMC42IDQ2LjIxQzEwNi42MyA0NC44NSAxMDIuNTIgNDQuNzEgOTguNSA0My43N1pNODEuMjYgMjMuMTNDODcuNTQgMjEuMDYgOTEuMTUgMzAuMTIgODUuMjUgMzIuNzdDNzguOTcgMzUuNiA3NC44NiAyNS4yMyA4MS4yNiAyMy4xM1pNOTAuOSA1My4xNkMxMDguMjggNTMuMDYgMTI3LjYgNTAuMzMgMTQzLjYgNTguMjJDMTc0LjkzIDczLjY3IDE3Ni45OCAxMTguMDQgMTQ4LjkzIDEzNy43N0MxMzUuOTggMTQ2Ljg4IDEyMS4zNyAxNDYuMTUgMTA2LjE3IDE0Ni4xOUM4Mi42NyAxNDYuMjUgNTUuOCAxNTEuMTEgMzcuMTkgMTMzLjY1QzExLjQ2IDEwOS41MSAyMi42MSA2NS4yIDU2LjA1IDU1LjE5QzY3LjA4IDUxLjg5IDc5LjUyIDUzLjIzIDkwLjkgNTMuMTZaTTk1LjkzIDYxLjVDODAuOTYgNjEuODIgNjMuNjQgNTguOTQgNTAuMzMgNjcuMTdDMjYuNTMgODEuODggMjUuOTMgMTE4LjU2IDUwLjY0IDEzMi44NUM2MS4wMyAxMzguODYgNzIuMTcgMTM4LjA4IDgzLjgzIDEzOC4wNkM5Mi4yOCAxMzguMDQgMTAwLjcyIDEzNy45NyAxMDkuMTcgMTM3Ljk2QzEyMy4wOCAxMzcuOTYgMTM0Ljk5IDEzNy43MSAxNDYuMjEgMTI4LjcxQzE3MS4zMSAxMDguNTkgMTU5LjAxIDcwLjAyIDEyOS44NSA2Mi4yN0MxMjAuMDUgNTkuNjcgMTA2LjE1IDYxLjI3IDk1LjkzIDYxLjVaTTExNC44OCA3Mi40NEMxMTkuNzMgNzEuNDkgMTI1LjA1IDc0Ljg2IDEyNi44MiA3OS4zNEMxMjguMTggODIuOCAxMjcuNTUgODcuMjEgMTI3LjU4IDkwLjgzQzEyNy42OCAxMDAgMTMxLjc0IDEyMy44OCAxMTguMTcgMTI1QzEwMS40NSAxMjYuMzkgMTA1LjU0IDEwMy43IDEwNS40MiA5My4xN0MxMDUuMzcgODguNyAxMDQuNjEgODMuNTYgMTA2LjE0IDc5LjI3QzEwNy40NiA3NS41OCAxMTEuMTkgNzMuMTYgMTE0Ljg4IDcyLjQ0Wk03My41NiA3Mi43OUM5MC43NiA3MC4xNiA4Ni41OSA5NS42NSA4Ni42OCAxMDUuODNDODYuNzEgMTA5Ljk3IDg3LjI5IDExNC40NiA4NS45IDExOC40NEM4NC41NyAxMjIuMjcgODAuNDIgMTI1LjA0IDc2LjQ3IDEyNS4xOUM2MC4zNyAxMjUuOCA2NC40OSAxMDMuMjkgNjQuMzkgOTIuODNDNjQuMzUgODguNTMgNjMuNjkgODMuNyA2NS4xIDc5LjU3QzY2LjMyIDc2LjAxIDY5Ljk0IDczLjM1IDczLjU2IDcyLjc5WiIgZmlsbD0iI2Y4ZjhmOCIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiNmOGY4ZjgiIHN0cm9rZS13aWR0aD0iMC4yNSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNOTguNSA0My43N0MxMDIuNTIgNDQuNzEgMTA2LjYzIDQ0Ljg1IDExMC42IDQ2LjIxQzExMy44IDQ3LjMxIDExNy4yNiA1MC4xOCAxMjAuNSA1MC43NUMxMjMuNCA1MS4yNiAxMjYuNTYgNTAuNzcgMTI5LjUyIDUxLjIxQzEzOC45OSA1Mi42NCAxNDcuNzcgNTYuOTkgMTU0LjkzIDYzLjI1QzE3My45MyA3OS44NSAxNzYuMjkgMTEwLjIgMTYwLjcgMTI5Ljg3QzE1My42NCAxMzguNzkgMTQ0Ljc0IDE0My4xMyAxMzQuNDQgMTQ3LjE3QzEzMy43OSAxNDguNTMgMTMzLjkgMTUwLjA0IDEzMi42MSAxNTEuMTFDMTMwLjgxIDE1Mi42MSAxMjcuOTkgMTUxLjg1IDEyNS44MyAxNTIuMjZDMTIxLjQ2IDE1My4wOSAxMTcuMiAxNTQuNTggMTEzLjEyIDE1Ni4yN0M5NC44MyAxNjMuODMgODkuNzUgMTU5LjIzIDcyLjY5IDE1NC4xNkM2OS43OSAxNTMuMyA2Mi41OCAxNTMuMDggNjAuNjEgMTUxLjg2QzU4Ljk1IDE1MC44NCA1OS4xNCAxNDguMjIgNTcuNDggMTQ3LjMzQzUzLjkxIDE0NS40MSA0OS4zOSAxNDQuNzggNDUuNyAxNDIuODFDMzQuNDUgMTM2LjggMjUuODMgMTI1LjcyIDIyLjIyIDExMy41OEMxNC43NyA4OC42IDI5Ljk1IDYwLjc2IDU0LjY4IDUzLjE4QzYwLjA3IDUxLjUzIDY1LjQyIDUxLjk3IDcwLjc5IDUwLjkxQzc0LjI1IDUwLjIyIDc3LjY2IDQ3LjExIDgxLjIxIDQ2LjA5Qzg0LjIzIDQ1LjIyIDg5Ljk1IDQ1LjI0IDkyLjMzIDQzLjVDOTEuMjEgNDEuMTMgODguNjEgMzYuNTcgODYuMyAzNS4xOUM4NC44OCAzNC4zNCA4Mi4zOSAzNS40OCA4MC42NyAzNC44MkM3NS41IDMyLjgzIDc0LjE0IDI1LjM0IDc4LjkyIDIyLjFDODIuNTkgMTkuNjEgODguNjQgMjAuOSA4OS45NyAyNS41MUM5MC41NCAyNy40NyA4OS4zNSAzMC4wNiA5MC4xIDMxLjc0QzkxLjAyIDMzLjggOTYuNzMgNDAuOTIgOTguNSA0My43N1pNODEuMjYgMjMuMTNDNzQuODYgMjUuMjMgNzguOTcgMzUuNiA4NS4yNSAzMi43N0M5MS4xNSAzMC4xMiA4Ny41NCAyMS4wNiA4MS4yNiAyMy4xM1pNOTAuOSA1My4xNkM3OS41MiA1My4yMyA2Ny4wOCA1MS44OSA1Ni4wNSA1NS4xOUMyMi42MSA2NS4yIDExLjQ2IDEwOS41MSAzNy4xOSAxMzMuNjVDNTUuOCAxNTEuMTEgODIuNjcgMTQ2LjI1IDEwNi4xNyAxNDYuMTlDMTIxLjM3IDE0Ni4xNSAxMzUuOTggMTQ2Ljg4IDE0OC45MyAxMzcuNzdDMTc2Ljk4IDExOC4wNCAxNzQuOTMgNzMuNjcgMTQzLjYgNTguMjJDMTI3LjYgNTAuMzMgMTA4LjI4IDUzLjA2IDkwLjkgNTMuMTZaTTk1LjkzIDYxLjVDMTA2LjE1IDYxLjI3IDEyMC4wNSA1OS42NyAxMjkuODUgNjIuMjdDMTU5LjAxIDcwLjAyIDE3MS4zMSAxMDguNTkgMTQ2LjIxIDEyOC43MUMxMzQuOTkgMTM3LjcxIDEyMy4wOCAxMzcuOTYgMTA5LjE3IDEzNy45NkMxMDAuNzIgMTM3Ljk3IDkyLjI4IDEzOC4wNCA4My44MyAxMzguMDZDNzIuMTcgMTM4LjA4IDYxLjAzIDEzOC44NiA1MC42NCAxMzIuODVDMjUuOTMgMTE4LjU2IDI2LjUzIDgxLjg4IDUwLjMzIDY3LjE3QzYzLjY0IDU4Ljk0IDgwLjk2IDYxLjgyIDk1LjkzIDYxLjVaTTExNC44OCA3Mi40NEMxMTEuMTkgNzMuMTYgMTA3LjQ2IDc1LjU4IDEwNi4xNCA3OS4yN0MxMDQuNjEgODMuNTYgMTA1LjM3IDg4LjcgMTA1LjQyIDkzLjE3QzEwNS41NCAxMDMuNyAxMDEuNDUgMTI2LjM5IDExOC4xNyAxMjVDMTMxLjc0IDEyMy44OCAxMjcuNjggMTAwIDEyNy41OCA5MC44M0MxMjcuNTUgODcuMjEgMTI4LjE4IDgyLjggMTI2LjgyIDc5LjM0QzEyNS4wNSA3NC44NiAxMTkuNzMgNzEuNDkgMTE0Ljg4IDcyLjQ0Wk03My41NiA3Mi43OUM2OS45NCA3My4zNSA2Ni4zMiA3Ni4wMSA2NS4xIDc5LjU3QzYzLjY5IDgzLjcgNjQuMzUgODguNTMgNjQuMzkgOTIuODNDNjQuNDkgMTAzLjI5IDYwLjM3IDEyNS44IDc2LjQ3IDEyNS4xOUM4MC40MiAxMjUuMDQgODQuNTcgMTIyLjI3IDg1LjkgMTE4LjQ0Qzg3LjI5IDExNC40NiA4Ni43MSAxMDkuOTcgODYuNjggMTA1LjgzQzg2LjU5IDk1LjY1IDkwLjc2IDcwLjE2IDczLjU2IDcyLjc5WiIgZmlsbD0iIzIyMWUxZiIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMyMjFlMWYiIHN0cm9rZS13aWR0aD0iMC4yNSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4='

function PoweredByBadge() {
  return (
    <div className={poweredByStyle}>
      <a
        href={POWERED_BY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={poweredByLinkStyle}
      >
        <img src={AB_LOGO_URI} alt="" className={poweredByLogoStyle} />
        Powered by <strong>Apiboost</strong>
      </a>
    </div>
  )
}

const poweredByStyle = css({
  flexShrink: 0,
  padding: '0.75rem',
  borderTop: '1px solid var(--omnispec-border-color)',
})

const poweredByLinkStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  textDecoration: 'none',
  '&:hover': {
    color: 'var(--omnispec-fg-secondary)',
  },
  '& strong': {
    fontWeight: 600,
    color: 'var(--omnispec-fg-secondary)',
  },
})

const poweredByLogoStyle = css({
  width: '1rem',
  height: '1rem',
  flexShrink: 0,
  objectFit: 'contain',
})
