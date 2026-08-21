/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '@core/styles/css'
import type { OpenApiOperation } from '@openapi/types/openapi.types'
import { MethodBar } from '@core/components/common/MethodBar'
import { ResponsiveColumns } from '@core/components/common/ResponsiveColumns'
import { TryItPanel } from '@core/components/TryIt/TryItPanel'
import { generateExample } from '@core/components/SchemaViewer/schema-utils'
import { OperationDetail } from '@openapi/components/OperationDetail'
import { useConfig } from '@core/context/ConfigContext'
import type { ParameterDef } from '@core/components/TryIt/ParameterForm'
import { ReferenceLayout } from '@core/components/Reference/ReferenceLayout'
import { ReferenceOperationDetail } from '@core/components/Reference/ReferenceOperationDetail'
import { SamplesPanel } from '@core/components/Reference/SamplesPanel'

interface OperationViewProps {
  operation: OpenApiOperation
  serverUrl: string
  onBack: () => void
  tagName?: string
}

export function OperationView({ operation, serverUrl, onBack, tagName }: OperationViewProps) {
  const { allowTryIt, displayMode } = useConfig()
  const title = operation.summary || operation.operationId || operation.path

  const tryItParams: ParameterDef[] = operation.parameters.map((p) => {
    const schema = p.schema as Record<string, unknown> | undefined
    return {
      name: p.name,
      in: p.in,
      required: p.required,
      description: p.description,
      type: schema?.type as string | undefined,
      format: schema?.format as string | undefined,
      enum: schema?.enum as string[] | undefined,
      example: p.example !== null && p.example !== undefined ? String(p.example) : undefined,
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
  const defaultBodyExample = defaultBodySchema
    ? JSON.stringify(generateExample(defaultBodySchema as Record<string, unknown>), null, 2)
    : undefined

  return (
    <div className={containerStyle}>
      <button type="button" onClick={onBack} className={backBtnStyle}>
        ← {tagName ?? 'All Operations'}
      </button>
      <h2 className={titleStyle}>{title}</h2>
      <MethodBar
        label={operation.method}
        path={operation.path}
        method={operation.method as 'get' | 'post' | 'put' | 'delete' | 'patch'}
      />
      <div className={contentStyle}>
        {displayMode === 'reference' ? (
          <ReferenceLayout
            operationId={operation.operationId ?? `${operation.method}-${operation.path}`}
            schema={
              <ReferenceOperationDetail
                operationId={operation.operationId ?? `${operation.method}-${operation.path}`}
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
                operationId={operation.operationId ?? `${operation.method}-${operation.path}`}
                requestBodySchema={defaultBodySchema as Record<string, unknown> | undefined}
                requestBodyContentType={defaultContentType}
                responses={operation.responses}
              />
            }
            tryIt={allowTryIt ? (
              <TryItPanel
                method={operation.method}
                path={operation.path}
                serverUrl={serverUrl}
                parameters={tryItParams}
                requestBodyContentTypes={requestBodyContentTypes}
                defaultRequestBody={defaultBodyExample}
                requestBodySchema={defaultBodySchema as Record<string, unknown> | undefined}
                xCodeSamples={operation.xCodeSamples}
              />
            ) : <div />}
          />
        ) : (
          <ResponsiveColumns
            left={<OperationDetail operation={operation} />}
            right={allowTryIt ? (
              <TryItPanel
                method={operation.method}
                path={operation.path}
                serverUrl={serverUrl}
                parameters={tryItParams}
                requestBodyContentTypes={requestBodyContentTypes}
                defaultRequestBody={defaultBodyExample}
                requestBodySchema={defaultBodySchema as Record<string, unknown> | undefined}
                xCodeSamples={operation.xCodeSamples}
              />
            ) : undefined}
            rightLabel="Try It"
          />
        )}
      </div>
    </div>
  )
}

const containerStyle = css({
  padding: 0,
})

const backBtnStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-link)',
  padding: '0 0 0.75rem',
  fontWeight: 500,
  '&:hover': {
    textDecoration: 'underline',
  },
})

const titleStyle = css({
  fontSize: 'var(--omnispec-h2-font-size)',
  fontWeight: 'var(--omnispec-h2-font-weight)',
  color: 'var(--omnispec-h2-color)',
  margin: '0 0 0.75rem',
})

const contentStyle = css({
  marginTop: '1rem',
})
