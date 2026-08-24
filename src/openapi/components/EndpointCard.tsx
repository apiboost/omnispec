/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState } from 'react'
import { css } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { OpenApiOperation } from '@openapi/types/openapi.types'
import { ExpandableCard } from '@core/components/common/ExpandableCard'
import { MethodBar } from '@core/components/common/MethodBar'
import { ResponsiveColumns } from '@core/components/common/ResponsiveColumns'
import { TryItPanel } from '@core/components/TryIt/TryItPanel'
import { InlineTryIt } from '@core/components/TryIt/InlineTryIt'
import { generateExample } from '@core/components/SchemaViewer/schema-utils'
import { OperationDetail } from '@openapi/components/OperationDetail'
import { useConfig } from '@core/context/ConfigContext'
import type { ParameterDef } from '@core/components/TryIt/ParameterForm'
import { ReferenceLayout } from '@core/components/Reference/ReferenceLayout'
import { ReferenceOperationDetail } from '@core/components/Reference/ReferenceOperationDetail'
import { SamplesPanel } from '@core/components/Reference/SamplesPanel'

interface EndpointCardProps {
  operation: OpenApiOperation
  serverUrl: string
  id?: string
  expandAll?: boolean
  expandGeneration?: number
}

export function EndpointCard({ operation, serverUrl, id, expandAll, expandGeneration }: EndpointCardProps) {
  const { allowTryIt, displayMode, tryItLayout } = useConfig()
  const title = operation.summary || operation.operationId || operation.path

  const paramCount = operation.parameters.length + (operation.requestBody ? 1 : 0)
  const rightLabel = paramCount > 0 ? `${paramCount} param${paramCount !== 1 ? 's' : ''}` : undefined

  // Per-parameter selected named example (keyed by `${in}-${name}`). The
  // selected example prefills the corresponding Try-It input.
  const [paramExampleSelections, setParamExampleSelections] = useState<Record<string, string>>({})

  const tryItParams: ParameterDef[] = operation.parameters.map((p) => {
    const schema = p.schema as Record<string, unknown> | undefined
    const items = schema?.items as Record<string, unknown> | undefined
    const itemsEnum = schema?.type === 'array' && Array.isArray(items?.enum)
      ? (items.enum as unknown[]).map(String)
      : undefined
    const exampleValue = resolveParamExampleValue(p, paramExampleSelections[`${p.in}-${p.name}`])
    return {
      name: p.name,
      in: p.in,
      required: p.required,
      description: p.description,
      type: schema?.type as string | undefined,
      format: schema?.format as string | undefined,
      enum: schema?.enum as string[] | undefined,
      itemsEnum,
      explode: p.explode,
      example: exampleValue !== null && exampleValue !== undefined ? String(exampleValue) : undefined,
      default: schema?.default !== null && schema?.default !== undefined ? String(schema.default) : undefined,
    }
  })

  const requestBodyContentTypes = operation.requestBody?.content
    ? Object.keys(operation.requestBody.content)
    : undefined

  const defaultContentType = requestBodyContentTypes?.[0]
  const defaultBodySchema = defaultContentType
    ? operation.requestBody?.content[defaultContentType]?.schema
    : undefined

  // Schemas per content type so the Try-It body editor can adapt (e.g. render
  // multipart/form-data file pickers) when the user switches content type.
  const requestBodySchemas = operation.requestBody?.content
    ? Object.fromEntries(
      Object.entries(operation.requestBody.content).map(([ct, media]) => [
        ct,
        media.schema as Record<string, unknown> | undefined,
      ]),
    )
    : undefined
  const defaultBodyExample = defaultBodySchema
    ? JSON.stringify(generateExample(defaultBodySchema as Record<string, unknown>), null, 2)
    : undefined

  // Shared Try-It props — identical whether the panel docks in the side column
  // (`tryItLayout: 'panel'`) or expands inline below the operation
  // (`tryItLayout: 'inline'`).
  const tryItPanelProps = {
    method: operation.method,
    path: operation.path,
    serverUrl,
    parameters: tryItParams,
    requestBodyContentTypes,
    defaultRequestBody: defaultBodyExample,
    requestBodySchema: defaultBodySchema as Record<string, unknown> | undefined,
    requestBodySchemas,
    security: operation.security,
    xCodeSamples: operation.xCodeSamples,
  }

  return (
    <ExpandableCard
      id={id}
      title={title}
      rightLabel={rightLabel}
      deprecated={operation.deprecated}
      badges={operation.xBadges}
      expandAll={expandAll}
      expandGeneration={expandGeneration}
    >
      <MethodBar
        label={operation.method}
        path={operation.path}
        method={operation.method as 'get' | 'post' | 'put' | 'delete' | 'patch'}
      />
      {displayMode === 'reference' ? (
        <ReferenceLayout
          operationId={id ?? `${operation.method}-${operation.path}`}
          schema={
            <ReferenceOperationDetail
              operationId={id ?? `${operation.method}-${operation.path}`}
              description={operation.description}
              parameters={operation.parameters}
              requestBody={operation.requestBody}
              responses={operation.responses}
              security={operation.security}
            />
          }
          samples={
            <SamplesPanel
              method={operation.method}
              path={operation.path}
              serverUrl={serverUrl}
              operationId={id ?? `${operation.method}-${operation.path}`}
              requestBodySchema={defaultBodySchema as Record<string, unknown> | undefined}
              requestBodyContentType={defaultContentType}
              responses={operation.responses}
            />
          }
          tryIt={allowTryIt ? <TryItPanel {...tryItPanelProps} /> : <div />}
        />
      ) : tryItLayout === 'inline' ? (
        // Inline (compact only): operation detail spans full width, with the
        // Try-It console in a collapsed-by-default disclosure below it.
        <div className={inlineWrapperStyle}>
          <OperationDetail
            operation={operation}
            paramExampleSelections={paramExampleSelections}
            onParamExampleSelect={(key, name) =>
              setParamExampleSelections((prev) => ({ ...prev, [key]: name }))
            }
          />
          {allowTryIt && <InlineTryIt {...tryItPanelProps} />}
        </div>
      ) : (
        <ResponsiveColumns
          left={
            <OperationDetail
              operation={operation}
              paramExampleSelections={paramExampleSelections}
              onParamExampleSelect={(key, name) =>
                setParamExampleSelections((prev) => ({ ...prev, [key]: name }))
              }
            />
          }
          right={allowTryIt ? <TryItPanel {...tryItPanelProps} /> : undefined}
          rightLabel="Try It"
        />
      )}
    </ExpandableCard>
  )
}

// Full-width inline layout: mirrors ResponsiveColumns' single-column padding so
// the operation detail lines up whether the Try-It docks or expands inline.
const inlineWrapperStyle = css({
  padding: '0.75rem 0',
  minWidth: 0,
  [mq.desktop]: {
    padding: '1rem 1.25rem',
  },
})

/**
 * Resolves the effective example value for a parameter given a selected named
 * example. Falls back to the selected example, then the first named example,
 * then the singular `example`.
 */
function resolveParamExampleValue(
  param: OpenApiOperation['parameters'][number],
  selectedName?: string,
): unknown {
  if (param.examples && Object.keys(param.examples).length > 0) {
    if (selectedName && param.examples[selectedName]) {
      return param.examples[selectedName].value
    }
    const first = Object.values(param.examples)[0]
    return first?.value
  }
  return param.example
}
