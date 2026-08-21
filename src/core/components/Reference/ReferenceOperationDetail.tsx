/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect, useState } from 'react'
import { css, cx } from '../../styles/css'
import { useExpandAll } from '@core/context/ExpandContext'
import { SchemaTree } from '../SchemaViewer/SchemaTree'
import { schemaToNodes } from '../SchemaViewer/schema-utils'
import { MarkdownRenderer } from '../MarkdownRenderer/MarkdownRenderer'
import { Icon } from '../common/Icon'
import type { SchemaNode } from '../SchemaViewer/schema-utils'

interface Parameter {
  name: string
  in: string
  required: boolean
  description?: string
  schema?: Record<string, unknown>
  example?: unknown
}

interface RequestBody {
  description?: string
  required?: boolean
  content: Record<string, { schema?: Record<string, unknown> }>
}

interface Response {
  statusCode: string
  description: string
  content?: Record<string, { schema?: Record<string, unknown> }>
}

export interface ReferenceOperationDetailProps {
  operationId: string
  description?: string
  parameters: Parameter[]
  requestBody?: RequestBody
  responses: Response[]
  security?: string[][]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildParamSchemaNodes(parameters: Parameter[]): SchemaNode[] {
  return parameters.map((p) => ({
    name: p.name,
    type: (p.schema?.type as string) ?? 'any',
    format: p.schema?.format as string | undefined,
    description: p.description,
    required: p.required,
    enum: p.schema?.enum as unknown[] | undefined,
    default: p.schema?.default,
    constraints: [] as string[],
  }))
}

function getStatusColor(code: string): string {
  const num = parseInt(code, 10)
  if (num >= 200 && num < 300) return 'var(--omnispec-color-success)'
  if (num >= 400 && num < 500) return 'var(--omnispec-color-warning)'
  if (num >= 500) return 'var(--omnispec-color-error)'
  return 'var(--omnispec-fg-primary)'
}

function getStatusBg(code: string): string {
  const num = parseInt(code, 10)
  if (num >= 200 && num < 300) return 'rgba(26, 127, 55, 0.08)'
  if (num >= 400 && num < 500) return 'rgba(191, 135, 0, 0.08)'
  if (num >= 500) return 'rgba(207, 34, 46, 0.08)'
  return 'var(--omnispec-bg-tertiary)'
}

// ---------------------------------------------------------------------------
// ResponseCard — expandable per-response section
// ---------------------------------------------------------------------------

interface ResponseCardProps {
  response: Response
}

function ResponseCard({ response }: ResponseCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Mirror the document-wide "expand all" toggle (generation-gated so the
  // initial mount stays collapsed).
  const { expandAll, expandGeneration } = useExpandAll()
  useEffect(() => {
    if (expandGeneration > 0) {
      setExpanded(!!expandAll)
    }
  }, [expandAll, expandGeneration])

  const statusColor = getStatusColor(response.statusCode)
  const statusBg = getStatusBg(response.statusCode)

  const hasContent = response.content && Object.keys(response.content).length > 0

  // The status pill + description are shared between the expandable (has schema)
  // and static (no schema) presentations.
  const header = (
    <>
      <span
        className={cx(
          statusPillStyle,
          css({ color: statusColor, backgroundColor: 'transparent' }),
        )}
      >
        {response.statusCode}
      </span>
      <span className={responseDescStyle}>{response.description}</span>
    </>
  )

  return (
    <div
      className={cx(
        responseCardStyle,
        css({
          borderLeft: `0.1875rem solid ${statusColor}`,
          backgroundColor: statusBg,
        }),
      )}
    >
      {hasContent ? (
        <button
          type="button"
          className={responseCardHeaderStyle}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <span
            className={cx(
              chevronStyle,
              css({ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }),
            )}
          >
            <Icon name="chevron-right" size="0.875rem" />
          </span>
          {header}
        </button>
      ) : (
        // No response schema — render a static, non-interactive row. The left
        // inset keeps the status pill aligned with the expandable rows' pills.
        <div className={responseCardStaticHeaderStyle}>{header}</div>
      )}

      {expanded && hasContent && (
        <div className={responseBodyStyle}>
          {Object.entries(response.content!).map(([contentType, media]) => (
            <div key={contentType}>
              <div className={schemaHeaderRowStyle}>
                <span className={sectionLabelStyle}>Response Schema</span>
                <code className={contentTypeBadgeStyle}>{contentType}</code>
              </div>
              {media.schema && (
                <SchemaTree nodes={schemaToNodes(media.schema)} context="response" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ParamSection — renders a group of parameters through the configurable SchemaTree
// ---------------------------------------------------------------------------

interface ParamSectionProps {
  title: string
  params: Parameter[]
}

function ParamSection({ title, params }: ParamSectionProps) {
  if (params.length === 0) return null
  const nodes = buildParamSchemaNodes(params)

  return (
    <div className={sectionStyle}>
      <h4 className={sectionTitleStyle}>{title}</h4>
      <SchemaTree nodes={nodes} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReferenceOperationDetail({
  description,
  parameters,
  requestBody,
  responses,
  security,
}: ReferenceOperationDetailProps) {
  const pathParams = parameters.filter((p) => p.in === 'path')
  const queryParams = parameters.filter((p) => p.in === 'query')
  const headerParams = parameters.filter((p) => p.in === 'header')

  return (
    <div className={containerStyle}>
      {/* Description */}
      {description && (
        <div className={sectionStyle}>
          <MarkdownRenderer content={description} />
        </div>
      )}

      {/* Security */}
      {security && security.length > 0 && (
        <div className={sectionStyle}>
          <h4 className={sectionTitleStyle}>Security</h4>
          <div className={securityListStyle}>
            {security.map((schemes, idx) => (
              <div key={idx} className={securityRowStyle}>
                {schemes.map((scheme) => (
                  <span key={scheme} className={securityBadgeStyle}>
                    <Icon name="lock" size="0.625rem" strokeWidth={2.5} />
                    {scheme}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Path Parameters */}
      <ParamSection title="Path Parameters" params={pathParams} />

      {/* Query Parameters */}
      <ParamSection title="Query Parameters" params={queryParams} />

      {/* Header Parameters */}
      <ParamSection title="Header Parameters" params={headerParams} />

      {/* Request Body */}
      {requestBody && (
        <div className={sectionStyle}>
          <div className={schemaHeaderRowStyle}>
            <h4 className={sectionTitleStyle}>Request Body</h4>
            {requestBody.required && (
              <span className={requiredTagStyle}>Required</span>
            )}
          </div>
          {Object.entries(requestBody.content).map(([contentType, media]) => (
            <div key={contentType}>
              <code className={contentTypeBadgeStyle}>{contentType}</code>
              {media.schema && (
                <SchemaTree nodes={schemaToNodes(media.schema)} context="request" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Responses */}
      {responses.length > 0 && (
        <div className={sectionStyle}>
          <div className={responsesHeaderRowStyle}>
            <h4 className={sectionTitleStyle}>Responses</h4>
            <div className={statusPillsRowStyle}>
              {responses.map((r) => (
                <span
                  key={r.statusCode}
                  className={cx(
                    statusPillStyle,
                    css({
                      color: getStatusColor(r.statusCode),
                      backgroundColor: getStatusBg(r.statusCode),
                    }),
                  )}
                >
                  {r.statusCode}
                </span>
              ))}
            </div>
          </div>
          <div className={responseListStyle}>
            {responses.map((r) => (
              <ResponseCard key={r.statusCode} response={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle = css({
  display: 'flex',
  flexDirection: 'column',
})

const sectionStyle = css({
  marginBottom: '1.5rem',
})

const sectionTitleStyle = css({
  margin: '0 0 0.75rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--omnispec-fg-muted)',
})

const sectionLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--omnispec-fg-muted)',
})

const securityListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
})

const securityRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  flexWrap: 'wrap',
})

const securityBadgeStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3125rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.1875rem 0.625rem',
  borderRadius: '0.25rem',
  fontWeight: 500,
})

const schemaHeaderRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.5rem',
  flexWrap: 'wrap',
})

const contentTypeBadgeStyle = css({
  display: 'inline-block',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.125rem 0.5rem',
  borderRadius: '0.25rem',
})

const requiredTagStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  color: 'var(--omnispec-color-error)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
})

const responsesHeaderRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '0.75rem',
  flexWrap: 'wrap',
})

const statusPillsRowStyle = css({
  display: 'flex',
  gap: '0.375rem',
  flexWrap: 'wrap',
})

const statusPillStyle = css({
  display: 'inline-block',
  fontFamily: 'var(--omnispec-font-mono)',
  fontWeight: 700,
  fontSize: 'var(--omnispec-font-size-xs)',
  padding: '0.125rem 0.5rem',
  borderRadius: '0.25rem',
})

const responseListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
})

const responseCardStyle = css({
  borderRadius: 'var(--omnispec-border-radius)',
  overflow: 'hidden',
})

const responseCardHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'inherit',
})

// Static (non-expandable) response row. The extra left inset (chevron width +
// gap) keeps its status pill aligned with the expandable rows above/below it.
const responseCardStaticHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.625rem 0.75rem 0.625rem 2.125rem',
  color: 'inherit',
})

const chevronStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  transition: 'transform 0.15s ease',
  color: 'var(--omnispec-fg-muted)',
})

const responseDescStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  flex: 1,
})

const responseBodyStyle = css({
  padding: '0 0.75rem 0.75rem',
})
