/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect, useState } from 'react'

interface NavIdItem {
  id: string
  children?: NavIdItem[]
}

/**
 * Collects the **leaf** ids of a nav tree (items with no children) in document
 * order. Leaves map to the concrete section anchors (operations, types,
 * messages, schemas) — group/parent ids are containers and would over-match, so
 * they're skipped. Structural typing keeps this decoupled from `NavItem`.
 */
export function flattenNavItemIds(items: NavIdItem[]): string[] {
  const ids: string[] = []
  const walk = (list: NavIdItem[]) => {
    for (const item of list) {
      if (item.children && item.children.length > 0) walk(item.children)
      else ids.push(item.id)
    }
  }
  walk(items)
  return ids
}

/**
 * Default reading band: the top 20% of the viewport area left visible below
 * any sticky chrome pinned to the top. On mobile that chrome is the layout's
 * sticky nav bar (`.omnispec-mobile-nav`, itself stuck at the host's
 * `--omnispec-offset-top`); it is hidden on desktop. Without the inset a
 * section that has scrolled up under the bar still intersects the band, and
 * being earlier in document order it wins — the active section (and the
 * mobile breadcrumb) lags behind what the reader sees.
 */
function measureDefaultRootMargin(): string {
  const bar = document.querySelector<HTMLElement>('.omnispec-mobile-nav')
  const inset = bar && bar.offsetHeight > 0
    ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight
    : 0
  const bottom = Math.max(0, window.innerHeight - inset) * 0.8
  return `-${Math.round(inset)}px 0px -${Math.round(bottom)}px 0px`
}

/**
 * Scroll-spy: returns the id of the section currently near the top of the
 * viewport, for driving a sidebar's active-item highlight as the reader scrolls.
 *
 * Observes the elements whose ids are given (missing ones are ignored) with an
 * `IntersectionObserver` whose root band is a thin strip near the top of the
 * viewport. By default that is the top ~20% of the area below the sticky
 * mobile nav bar, re-measured on scroll and resize (the bar's offset follows
 * the host header as it hides and shows); pass `rootMargin` to fix the band
 * instead. The active id is the **topmost** (earliest in `ids`) element in that
 * band; when the scroll position is between sections the last active id is kept,
 * and above the first section it is cleared (`undefined`).
 *
 * Section elements can be replaced after the first paint (e.g. a parent
 * re-mounting the content), which would leave the observer watching detached
 * nodes and the highlight frozen. A `MutationObserver` therefore re-resolves
 * the ids whenever the DOM changes and swaps in the live elements.
 */
export function useScrollSpy(ids: string[], rootMargin?: string): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [measuredMargin, setMeasuredMargin] = useState('0px 0px -80% 0px')
  const margin = rootMargin ?? measuredMargin
  // Stable dependency: re-observe only when the set of ids actually changes.
  const key = ids.join('|')

  // Keep the default band below the sticky chrome. A changed margin re-creates
  // the observer (below), so only commit when the measurement changes.
  useEffect(() => {
    if (rootMargin !== undefined || typeof window === 'undefined') return
    let frame = 0
    const measure = () => {
      frame = 0
      setMeasuredMargin(measureDefaultRootMargin())
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootMargin])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') return

    const visible = new Set<string>()
    const observed = new Map<string, Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const next = ids.find((id) => visible.has(id))
        if (next) {
          setActiveId(next)
          return
        }
        // Nothing in the band. Mid-page that is a gap between sections, so the
        // last active id stands; but once the first section starts below the
        // band the reader is back above every section (the spec intro), and a
        // stale id would leave the breadcrumb and highlight on a section that
        // is no longer on screen.
        const bandBottom = entries.find((e) => e.rootBounds)?.rootBounds?.bottom
        const first = ids.map((id) => observed.get(id)).find(Boolean)
        if (first && bandBottom !== undefined && first.getBoundingClientRect().top >= bandBottom) {
          setActiveId(undefined)
        }
      },
      { rootMargin: margin, threshold: 0 },
    )

    // Observe the current element for each id, replacing any stale one.
    const sync = () => {
      for (const id of ids) {
        const el = document.getElementById(id)
        const previous = observed.get(id)
        if (el === previous) continue
        if (previous) {
          observer.unobserve(previous)
          visible.delete(id)
          observed.delete(id)
        }
        if (el) {
          observer.observe(el)
          observed.set(id, el)
        }
      }
    }
    sync()

    // Re-sync at most once per frame, however many mutations land in it.
    let frame = 0
    const mutations = typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(() => {
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          sync()
        })
      })
    mutations?.observe(document.body, { childList: true, subtree: true })

    return () => {
      mutations?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
    // `ids` is captured via `key`; re-running on every array identity change
    // would thrash the observer.
  }, [key, margin])

  return activeId
}
