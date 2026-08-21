/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { OpenApiOperation } from './types/openapi.types'

/**
 * Returns true when an operation matches a lowercased sidebar search query.
 * Matches against path, summary, description, operationId, and HTTP method.
 */
export function operationMatchesSearch(op: OpenApiOperation, lowercasedQuery: string): boolean {
  return (
    op.path.toLowerCase().includes(lowercasedQuery) ||
    (op.summary?.toLowerCase().includes(lowercasedQuery) ?? false) ||
    (op.description?.toLowerCase().includes(lowercasedQuery) ?? false) ||
    (op.operationId?.toLowerCase().includes(lowercasedQuery) ?? false) ||
    op.method.toLowerCase().includes(lowercasedQuery)
  )
}
