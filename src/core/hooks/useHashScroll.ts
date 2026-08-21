/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect } from 'react'

const expandListeners = new Map<string, () => void>()

export function onExpandRequest(id: string, callback: () => void): () => void {
  expandListeners.set(id, callback)
  return () => {
    expandListeners.delete(id)
  }
}

export function requestExpand(id: string) {
  const listener = expandListeners.get(id)
  if (listener) listener()
}

const SMOOTH_THRESHOLD = 50

export function useHashScroll(operationCount = 0) {
  const scrollBehavior: ScrollBehavior = operationCount > SMOOTH_THRESHOLD ? 'instant' : 'smooth'

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    requestExpand(hash)

    const attempt = () => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: scrollBehavior, block: 'start' })
        return true
      }
      return false
    }

    if (attempt()) return

    let tries = 0
    const interval = setInterval(() => {
      if (attempt() || ++tries >= 10) clearInterval(interval)
    }, 200)

    return () => clearInterval(interval)
  }, [scrollBehavior])

  const navigateTo = useCallback((id: string) => {
    window.history.replaceState(null, '', `#${id}`)
    requestExpand(id)

    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      el?.scrollIntoView({ behavior: scrollBehavior, block: 'start' })
    })
  }, [scrollBehavior])

  return { navigateTo }
}
