/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

/**
 * The document-wide "expand all" signal.
 *
 * `expandGeneration` is bumped on every Expand/Collapse-All toggle. Collapsibles
 * mirror `expandAll` only when the generation is > 0, so the initial mount
 * (generation 0) leaves each item's `defaultOpen` untouched, and each toggle
 * re-applies even if the user opened/closed an item in between.
 *
 * This lets deeply-nested collapsibles (response cards, request/response
 * sections) respond to Expand All without prop-drilling the signal through
 * every intermediate component.
 */
export interface ExpandState {
  expandAll: boolean
  expandGeneration: number
}

const ExpandContext = createContext<ExpandState>({ expandAll: false, expandGeneration: 0 })

/** Reads the current document-wide expand-all signal. */
export function useExpandAll(): ExpandState {
  return useContext(ExpandContext)
}

/** Publishes the expand-all signal to every collapsible in the subtree. */
export function ExpandProvider({
  expandAll,
  expandGeneration,
  children,
}: ExpandState & { children: ReactNode }) {
  const value = useMemo(
    () => ({ expandAll, expandGeneration }),
    [expandAll, expandGeneration],
  )
  return <ExpandContext.Provider value={value}>{children}</ExpandContext.Provider>
}
