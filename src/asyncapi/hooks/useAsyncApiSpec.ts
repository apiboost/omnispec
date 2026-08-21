/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback } from 'react'
import { useSpecFetcher } from '../../core/hooks/useSpecFetcher'
import { parseAsyncApiSpec } from '../parser/asyncapi-parser'
import type { ParsedAsyncApiSpec } from '../types/asyncapi.types'

export function useAsyncApiSpec(spec: string | Record<string, unknown>) {
  const parser = useCallback(async (raw: string) => {
    return parseAsyncApiSpec(raw)
  }, [])

  return useSpecFetcher<ParsedAsyncApiSpec>(spec, parser)
}
