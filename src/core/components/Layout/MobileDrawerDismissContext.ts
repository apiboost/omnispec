/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { createContext, useContext } from 'react'

/**
 * Dismiss callback provided by DocLayout around the content of its mobile
 * drawer (and only there — the desktop sidebar renders the same content with
 * no provider). Navigation components call it after performing a selection so
 * the full-screen drawer closes instead of covering the content the user just
 * navigated to. The package is router-agnostic, so this is the only channel
 * through which nav content can tell the drawer that navigation happened.
 */
export const MobileDrawerDismissContext = createContext<(() => void) | null>(
  null,
)

export function useMobileDrawerDismiss(): (() => void) | null {
  return useContext(MobileDrawerDismissContext)
}
