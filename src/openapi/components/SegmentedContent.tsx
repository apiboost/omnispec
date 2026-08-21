/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactNode } from 'react'
import type { SegmentedRoute } from '@core/hooks/useSegmentedRouter'
import type { ParsedOpenApiSpec } from '../types/openapi.types'
import { OperationView } from './OperationView'

interface SegmentedContentProps {
  route: SegmentedRoute
  parsedSpec: ParsedOpenApiSpec
  serverUrl: string
  onBack: () => void
  overviewContent: ReactNode
}

export function SegmentedContent({
  route,
  parsedSpec,
  serverUrl,
  onBack,
  overviewContent,
}: SegmentedContentProps) {
  if (route.view === 'overview' || !route.operationId) {
    return <>{overviewContent}</>
  }

  for (const tag of parsedSpec.tags) {
    for (const op of tag.operations) {
      const opId = op.operationId ?? `${op.method}-${op.path}`
      if (opId === route.operationId) {
        return (
          <OperationView
            operation={op}
            serverUrl={serverUrl}
            onBack={onBack}
            tagName={tag.displayName ?? tag.name}
          />
        )
      }
    }
  }

  return <>{overviewContent}</>
}
