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
import type { LoadingState } from '../types/common.types'
import { fetchSpec } from '../utils/fetch-spec'

export interface UseSpecFetcherResult<T> {
  data: T | null
  state: LoadingState
  refetch: () => void
}

/**
 * True when a string `spec` prop is a URL to fetch rather than inline spec
 * content. Inline content must not be used as a `$ref` base URL.
 */
export function isSpecUrl(spec: unknown): spec is string {
  return typeof spec === 'string' && (spec.startsWith('http://') || spec.startsWith('https://') || spec.startsWith('/'))
}

export function useSpecFetcher<T = string>(
  spec: string | Record<string, unknown>,
  parse?: (raw: string) => T | Promise<T>,
): UseSpecFetcherResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [state, setState] = useState<LoadingState>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })

    try {
      let raw: string
      if (typeof spec === 'object') {
        raw = JSON.stringify(spec)
      } else if (isSpecUrl(spec)) {
        raw = await fetchSpec(spec)
      } else {
        raw = spec
      }

      const result = parse ? await parse(raw) : (raw as unknown as T)
      setData(result)
      setState({ status: 'success' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load spec'
      setState({ status: 'error', error: message })
    }
  }, [spec, parse])

  useEffect(() => {
    load()
  }, [load])

  return { data, state, refetch: load }
}
