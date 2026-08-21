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
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { Icon } from '@core/components/common/Icon'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes } from '@core/components/SchemaViewer/schema-utils'
import { MethodBar } from '@core/components/common/MethodBar'

interface CallbacksSectionProps {
  callbacks: Record<string, unknown>
}

interface ParsedCallback {
  name: string
  urlExpression: string
  method: string
  summary?: string
  description?: string
  requestBodySchema?: Record<string, unknown>
  responseStatuses: Array<{ code: string; description: string }>
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']

/**
 * Walks the OAS 3.0 callbacks nested structure and extracts a flat list
 * of ParsedCallback objects for rendering.
 *
 * OAS shape:
 *   callbacks: {
 *     callbackName: {
 *       "{$request.body#/callbackUrl}": {
 *         post: { summary, description, requestBody, responses }
 *       }
 *     }
 *   }
 */
function parseCallbacks(callbacks: Record<string, unknown>): ParsedCallback[] {
  const result: ParsedCallback[] = []

  for (const [name, callbackValue] of Object.entries(callbacks)) {
    if (!callbackValue || typeof callbackValue !== 'object') continue

    const pathItemMap = callbackValue as Record<string, unknown>

    for (const [urlExpression, pathItem] of Object.entries(pathItemMap)) {
      if (!pathItem || typeof pathItem !== 'object') continue

      const pathItemObj = pathItem as Record<string, unknown>

      for (const method of HTTP_METHODS) {
        const operation = pathItemObj[method]
        if (!operation || typeof operation !== 'object') continue

        const op = operation as Record<string, unknown>

        // Extract request body schema (first content type found)
        let requestBodySchema: Record<string, unknown> | undefined
        const requestBody = op.requestBody as Record<string, unknown> | undefined
        if (requestBody?.content && typeof requestBody.content === 'object') {
          const content = requestBody.content as Record<string, unknown>
          const firstMedia = Object.values(content)[0] as Record<string, unknown> | undefined
          if (firstMedia?.schema && typeof firstMedia.schema === 'object') {
            requestBodySchema = firstMedia.schema as Record<string, unknown>
          }
        }

        // Extract response statuses
        const responseStatuses: ParsedCallback['responseStatuses'] = []
        const responses = op.responses as Record<string, unknown> | undefined
        if (responses && typeof responses === 'object') {
          for (const [code, responseValue] of Object.entries(responses)) {
            const response = responseValue as Record<string, unknown> | undefined
            responseStatuses.push({
              code,
              description: typeof response?.description === 'string' ? response.description : '',
            })
          }
        }

        result.push({
          name,
          urlExpression,
          method,
          summary: typeof op.summary === 'string' ? op.summary : undefined,
          description: typeof op.description === 'string' ? op.description : undefined,
          requestBodySchema,
          responseStatuses,
        })
      }
    }
  }

  return result
}

/**
 * Renders an individual callback as an expandable card with a dashed border.
 * Shows the method, URL expression, and when expanded: summary, description,
 * request body schema, and response statuses.
 */
function CallbackCard({ callback }: { callback: ParsedCallback }) {
  const [expanded, setExpanded] = useState(false)

  const method = callback.method as HttpMethod

  return (
    <div className={cardStyle}>
      <button
        type="button"
        className={cardHeaderStyle}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className={cx(chevronStyle, expanded && chevronExpandedStyle)}>
          <Icon name="chevron-right" size="0.75rem" />
        </span>
        <span className={callbackNameStyle}>{callback.name}</span>
        <code className={urlExpressionStyle}>{callback.urlExpression}</code>
      </button>

      {expanded && (
        <div className={cardBodyStyle}>
          <MethodBar
            label={callback.method.toUpperCase()}
            path={callback.urlExpression}
            method={method}
          />

          {callback.summary && (
            <p className={summaryStyle}>{callback.summary}</p>
          )}

          {callback.description && (
            <p className={descriptionStyle}>{callback.description}</p>
          )}

          {callback.requestBodySchema && (
            <div className={sectionStyle}>
              <span className={sectionLabelStyle}>Request Body</span>
              <SchemaTree nodes={schemaToNodes(callback.requestBodySchema)} context="request" />
            </div>
          )}

          {callback.responseStatuses.length > 0 && (
            <div className={sectionStyle}>
              <span className={sectionLabelStyle}>Responses</span>
              <div className={responseListStyle}>
                {callback.responseStatuses.map(({ code, description }) => (
                  <div key={code} className={responseRowStyle}>
                    <span className={cx(statusBadgeStyle, css({
                      backgroundColor: getStatusBg(code),
                      color: getStatusColor(code),
                    }))}>
                      {code}
                    </span>
                    {description && (
                      <span className={responseDescStyle}>{description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Renders the "Callbacks" section for an OAS 3.0 operation.
 * Each callback name maps to one or more CallbackCard components.
 */
export function CallbacksSection({ callbacks }: CallbacksSectionProps) {
  const parsed = parseCallbacks(callbacks)
  if (parsed.length === 0) return null

  return (
    <div className={containerStyle}>
      <h4 className={titleStyle}>Callbacks</h4>
      <div className={cardListStyle}>
        {parsed.map((cb, idx) => (
          <CallbackCard key={`${cb.name}-${cb.method}-${idx}`} callback={cb} />
        ))}
      </div>
    </div>
  )
}

// ─── Status helpers ────────────────────────────────────────────────────────────

function getStatusColor(code: string): string {
  const num = parseInt(code, 10)
  if (num >= 200 && num < 300) return 'var(--omnispec-color-success)'
  if (num >= 300 && num < 400) return 'var(--omnispec-color-info)'
  if (num >= 400 && num < 500) return 'var(--omnispec-color-warning)'
  if (num >= 500) return 'var(--omnispec-color-error)'
  return 'var(--omnispec-fg-primary)'
}

function getStatusBg(code: string): string {
  const num = parseInt(code, 10)
  if (num >= 200 && num < 300) return 'rgba(26, 127, 55, 0.1)'
  if (num >= 300 && num < 400) return 'rgba(5, 80, 174, 0.1)'
  if (num >= 400 && num < 500) return 'rgba(191, 135, 0, 0.1)'
  if (num >= 500) return 'rgba(207, 34, 46, 0.1)'
  return 'var(--omnispec-bg-tertiary)'
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle = css({
  marginBottom: '1.5rem',
})

const titleStyle = css({
  margin: '0 0 0.75rem',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const cardListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
})

const cardStyle = css({
  borderRadius: '0.375rem',
  border: '1px dashed var(--omnispec-border-color)',
  overflow: 'hidden',
})

const cardHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: 'var(--omnispec-bg-secondary)',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  flexWrap: 'wrap',
  [mq.desktop]: {
    flexWrap: 'nowrap',
    gap: '0.75rem',
    padding: '0.625rem 1rem',
  },
})

const chevronStyle = css({
  color: 'var(--omnispec-fg-muted)',
  flexShrink: 0,
  transition: 'transform 0.2s ease',
})

const chevronExpandedStyle = css({
  transform: 'rotate(90deg)',
})

const callbackNameStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  flexShrink: 0,
})

const urlExpressionStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.125rem 0.375rem',
  borderRadius: '0.25rem',
  minWidth: 0,
  wordBreak: 'break-all',
  [mq.desktop]: {
    wordBreak: 'normal',
  },
})

const cardBodyStyle = css({
  padding: '0',
  borderTop: '1px solid var(--omnispec-border-color)',
})

const summaryStyle = css({
  margin: '0.75rem 1rem 0',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.5,
})

const descriptionStyle = css({
  margin: '0.5rem 1rem 0',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.5,
})

const sectionStyle = css({
  padding: '0.75rem 1rem',
  borderTop: '1px solid color-mix(in srgb, var(--omnispec-border-color) 60%, transparent)',
})

const sectionLabelStyle = css({
  display: 'block',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.5rem',
})

const responseListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
})

const responseRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
})

const statusBadgeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontWeight: 700,
  fontSize: 'var(--omnispec-font-size-sm)',
  padding: '0.125rem 0.5rem',
  borderRadius: '0.25rem',
  flexShrink: 0,
})

const responseDescStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
})
