/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { css, cx } from '../../styles/css'
import { mq } from '@core/styles/breakpoints'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../common/Icon'
import { useConfig } from '../../context/ConfigContext'
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
}: DocLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
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
   * drawer closes it. NavTree items are buttons and close themselves through
   * MobileDrawerDismissContext instead.
   */
  const handleDrawerClick = useCallback((event: MouseEvent) => {
    const anchor = (event.target as Element).closest?.('a[href]')
    if (anchor && anchor.getAttribute('target') !== '_blank') {
      setMobileSidebarOpen(false)
    }
  }, [])

  // Close on Escape + lock body scroll
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

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
      <div className={bodyStyle}>
        {sidebarEl}
        {expandEl}
        <main className={css({ ...mainBaseStyles, order: 1 })}>
          {contentHeader && <div className={contentHeaderStyle}>{contentHeader}</div>}
          {children}
        </main>
      </div>
      {footer && <div className={footerStyle}>{footer}</div>}

      {/* Mobile sidebar toggle + drawer */}
      {hasSidebar && (
        <AnimatePresence>
          {!mobileSidebarOpen && (
            <motion.button
              key="mobile-toggle"
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className={mobileToggleStyle}
              aria-label="Open navigation"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Icon name="ellipsis" size="1.2em" />
            </motion.button>
          )}
          {mobileSidebarOpen && (
            <motion.div
              key="mobile-backdrop"
              className={backdropStyle}
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
          {mobileSidebarOpen && (
            <motion.aside
              key="mobile-drawer"
              className={mobileDrawerStyle}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              onClick={handleDrawerClick}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className={mobileCloseStyle}
                aria-label="Close navigation"
              >
                <Icon name="xmark" size="1.25rem" />
              </button>
              <MobileDrawerDismissContext.Provider value={dismissMobileDrawer}>
                {sidebarContent}
              </MobileDrawerDismissContext.Provider>
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      <BackToTopButton hasSidebar={hasSidebar} />
    </div>
  )
}

/**
 * A fixed bottom-right "back to top" affordance that appears once the page has
 * scrolled down, and smoothly returns to the top on click. Tracks window scroll
 * (the sidebar layout scrolls the page). On mobile it stacks above the nav
 * toggle so the two don't overlap.
 */
function BackToTopButton({ hasSidebar }: { hasSidebar: boolean }) {
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
          className={cx(backToTopStyle, hasSidebar && backToTopAboveNavStyle)}
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
    padding: '0.5rem 1rem',
    // Legible multi-line code with spacing between lines.
    lineHeight: 1.2,
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

const mobileToggleStyle = css({
  position: 'fixed',
  bottom: '1.5rem',
  right: '1.5rem',
  width: '3.5rem',
  height: '3.5rem',
  borderRadius: '50%',
  backgroundColor: 'var(--omnispec-color-primary, #1a1a2e)',
  color: 'var(--omnispec-color-primary-text, #FFFFFF)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.15)',
  zIndex: 999,
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
  // Below the mobile nav toggle (999) and drawer (1001) so it never covers them.
  zIndex: 998,
})

const backToTopAboveNavStyle = css({
  // On mobile the sidebar nav toggle occupies the bottom-right corner; stack the
  // back-to-top above it. On desktop there is no toggle, so it stays in the corner.
  [mq.mobile]: {
    bottom: '5.75rem',
  },
})

const backdropStyle = css({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  zIndex: 1000,
})

const mobileDrawerStyle = css({
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100dvh',
  width: '100%',
  backgroundColor: 'var(--omnispec-nav-bg, var(--omnispec-bg-primary, #fff))',
  zIndex: 1001,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: '1.5rem 1.25rem',
  boxShadow: '0.5rem 0 2rem rgba(0, 0, 0, 0.15)',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
})

const mobileCloseStyle = css({
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '50%',
  background: 'var(--omnispec-nav-bg, var(--omnispec-bg-primary, #fff))',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-fg-muted)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})

const POWERED_BY_URL = 'https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=sidebar&utm_campaign=powered_by'
const AB_LOGO_URI = 'data:image/png;base64,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'

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
