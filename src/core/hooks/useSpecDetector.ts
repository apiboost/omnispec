/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useMemo } from 'react'
import type { SpecDetectionResult } from '../types/spec-detection.types'
import type { SpecType } from '../types/spec-detection.types'
import { detectSpecType } from '../utils/detect-spec'

export function useSpecDetector(
  content: string | Record<string, unknown> | null,
  hintType?: SpecType,
): SpecDetectionResult | null {
  return useMemo(() => {
    if (hintType && content) {
      return { type: hintType, confidence: 'high' as const }
    }
    if (!content) return null
    return detectSpecType(content)
  }, [content, hintType])
}
