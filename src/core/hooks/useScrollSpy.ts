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
 * Scroll-spy: returns the id of the section currently near the top of the
 * viewport, for driving a sidebar's active-item highlight as the reader scrolls.
 *
 * Observes the elements whose ids are given (missing ones are ignored) with an
 * `IntersectionObserver` whose root band is a thin strip near the top of the
 * viewport (default `rootMargin` shrinks the bottom 80%, so only the top ~20%
 * counts). The active id is the **topmost** (earliest in `ids`) element in that
 * band; when the scroll position is between sections the last active id is kept.
 */
export function useScrollSpy(ids: string[], rootMargin = '0px 0px -80% 0px'): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  // Stable dependency: re-observe only when the set of ids actually changes.
  const key = ids.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const next = ids.find((id) => visible.has(id))
        if (next) setActiveId(next)
      },
      { rootMargin, threshold: 0 },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
    // `ids` is captured via `key`; re-running on every array identity change
    // would thrash the observer.
  }, [key, rootMargin])

  return activeId
}
