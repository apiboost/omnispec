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
import { parseOpenApiSpec } from '../parser/openapi-parser'
import type { ParsedOpenApiSpec } from '../types/openapi.types'
import type { ResolveRefsOptions } from '../parser/ref-resolver'

export function useOpenApiSpec(
  spec: string | Record<string, unknown>,
  refOptions?: ResolveRefsOptions,
) {
  const parser = useCallback(async (raw: string) => {
    return parseOpenApiSpec(raw, refOptions)
  }, [refOptions])

  return useSpecFetcher<ParsedOpenApiSpec>(spec, parser)
}
