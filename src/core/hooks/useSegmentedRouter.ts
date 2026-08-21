/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect, useState } from 'react'

export interface SegmentedRoute {
  view: 'overview' | 'operation'
  operationId: string | null
}

function parseHash(): SegmentedRoute {
  const hash = window.location.hash.slice(1)
  if (!hash || hash === '/') {
    return { view: 'overview', operationId: null }
  }
  return { view: 'operation', operationId: hash }
}

export function useSegmentedRouter() {
  const [route, setRoute] = useState<SegmentedRoute>(parseHash)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigateToOperation = useCallback((operationId: string) => {
    window.location.hash = operationId
  }, [])

  const navigateToOverview = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname)
    setRoute({ view: 'overview', operationId: null })
  }, [])

  return { route, navigateToOperation, navigateToOverview }
}
