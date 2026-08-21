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
import type { OpenApiOperation, OpenApiMediaType } from '../types/openapi.types'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes, generateExample, buildConstraints } from '@core/components/SchemaViewer/schema-utils'
import { CodeBlock } from '@core/components/CodeBlock/CodeBlock'
import { Tabs } from '@core/components/common/Tabs'
import { Icon } from '@core/components/common/Icon'
import { LinkableHeading } from '@core/components/common/LinkableHeading'
import { ExampleSelector, getNamedExamples } from '@core/components/common/ExampleSelector'
import { CallbacksSection } from './CallbacksSection'

interface OperationDetailProps {
  operation: OpenApiOperation
  /** Selected named-example per parameter, keyed by `${in}-${name}`. */
  paramExampleSelections?: Record<string, string>
  /** Called when a parameter's named example is selected. */
  onParamExampleSelect?: (key: string, exampleName: string) => void
}

function ExampleBlock({ media }: { media: OpenApiMediaType }) {
  const namedExamples = getNamedExamples(media)
  const [selectedExample, setSelectedExample] = useState(namedExamples[0]?.name ?? '')

  const activeExample = namedExamples.find((ex) => ex.name === selectedExample)
  const exampleValue = activeExample?.value

  const displayCode = exampleValue !== undefined
    ? (typeof exampleValue === 'string' ? exampleValue : JSON.stringify(exampleValue, null, 2))
    : media.schema
      ? JSON.stringify(generateExample(media.schema as Record<string, unknown>), null, 2)
      : '{}'

  return (
    <>
      <ExampleSelector
        examples={namedExamples}
        selectedName={selectedExample}
        onSelect={setSelectedExample}
      />
      <CodeBlock code={displayCode} language="json" />
    </>
  )
}

/**
 * Renders only the documentation content for an OpenAPI operation:
 * summary, externalDocs, description, security, parameters,
 * request body, and responses.
 *
 * Layout and TryIt rendering are handled by the parent EndpointCard
 * via ExpandableCard + ResponsiveColumns.
 */
export function OperationDetail({
  operation,
  paramExampleSelections,
  onParamExampleSelect,
}: OperationDetailProps) {
  const opId = operation.operationId ?? `${operation.method}-${operation.path}`

  return (
    <>
      {operation.deprecated && (
        <div className={deprecatedBannerStyle} role="alert">
          <Icon name="warning" size="1rem" />
          <span>
            This operation is deprecated and may be removed in a future release. Avoid using it in new integrations.
          </span>
        </div>
      )}

      {operation.summary && (
        <p className={summaryStyle}>{operation.summary}</p>
      )}

      {operation.externalDocs && (
        <a
          href={operation.externalDocs.url}
          target="_blank"
          rel="noopener noreferrer"
          className={externalDocsLinkStyle}
        >
          {operation.externalDocs.description ?? 'External docs'}
          <span className={externalDocsArrowStyle}>&#8599;</span>
        </a>
      )}

      {operation.description && (
        <div className={sectionStyle}>
          <MarkdownRenderer content={operation.description} />
        </div>
      )}

      {/* Per-operation security */}
      {operation.security && operation.security.length > 0 && (
        <div className={sectionStyle}>
          <LinkableHeading id={`${opId}-security`} as="h4" className={sectionTitleStyle}>Security</LinkableHeading>
          <div className={securitySchemesList}>
            {operation.security.map((schemes, idx) => (
              <div key={idx} className={securitySchemesRow}>
                {schemes.map((scheme) => (
                  <span key={scheme} className={securitySchemeBadge}>
                    <Icon name="lock" size="0.625rem" strokeWidth={2.5} />
                    {scheme}
                  </span>
                ))}
                {idx < operation.security!.length - 1 && (
                  <span className={securityOrLabel}>or</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parameters — modern inline layout */}
      {operation.parameters.length > 0 && (
        <div className={sectionStyle}>
          <LinkableHeading id={`${opId}-parameters`} as="h4" className={sectionTitleStyle}>Parameters</LinkableHeading>
          <div className={paramListStyle}>
            {operation.parameters.map((param) => {
              const paramKey = `${param.in}-${param.name}`
              const paramSchema = (param.schema ?? {}) as Record<string, unknown>
              const constraintBadges = buildConstraints(paramSchema)
              const paramFormat = paramSchema.format as string | undefined
              const paramEnum = paramSchema.enum as unknown[] | undefined
              const namedExamples = param.examples
                ? Object.entries(param.examples).map(([name, ex]) => ({
                  name,
                  summary: ex.summary,
                  value: ex.value,
                }))
                : []
              const selectedName = paramExampleSelections?.[paramKey] ?? namedExamples[0]?.name ?? ''
              const activeExample = namedExamples.find((ex) => ex.name === selectedName)
              return (
                <div key={paramKey} className={paramRowStyle}>
                  <div className={paramHeaderStyle}>
                    <span className={paramNameStyle}>{param.name}</span>
                    <pre className={typeBadgeStyle}>
                      {(param.schema as Record<string, unknown>)?.type as string ?? 'any'}
                    </pre>
                    {param.required && <span className={requiredBadgeStyle}>Required</span>}
                    <span className={inBadgeStyle}>{param.in}</span>
                  </div>
                  {(paramFormat || constraintBadges.length > 0 || (paramEnum && paramEnum.length > 0)) && (
                    <div className={paramConstraintsStyle}>
                      {paramFormat && (
                        <span className={paramConstraintBadgeStyle}>{paramFormat}</span>
                      )}
                      {constraintBadges.map((c) => (
                        <span key={c} className={paramConstraintBadgeStyle}>{c}</span>
                      ))}
                      {paramEnum && paramEnum.length > 0 && (
                        <span className={paramEnumBadgeStyle}>
                          enum: {paramEnum.map(String).join(' | ')}
                        </span>
                      )}
                    </div>
                  )}
                  {param.description && (
                    <p className={paramDescStyle}>{param.description}</p>
                  )}
                  {namedExamples.length > 1 && (
                    <ExampleSelector
                      examples={namedExamples}
                      selectedName={selectedName}
                      onSelect={(name) => onParamExampleSelect?.(paramKey, name)}
                    />
                  )}
                  {activeExample?.value !== undefined && (
                    <code className={paramExampleValueStyle}>
                      {typeof activeExample.value === 'string'
                        ? activeExample.value
                        : JSON.stringify(activeExample.value)}
                    </code>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Request Body */}
      {operation.requestBody && (
        <div className={sectionStyle}>
          <LinkableHeading id={`${opId}-request-body`} as="h4" className={sectionTitleStyle}>
            Request Body
            {operation.requestBody.required && <span className={requiredBadgeStyle}> Required</span>}
          </LinkableHeading>
          {operation.requestBody.description && (
            <p className={paramDescStyle}>{operation.requestBody.description}</p>
          )}
          {Object.entries(operation.requestBody.content).map(([contentType, media]) => (
            <div key={contentType} className={mediaTypeStyle}>
              <code className={contentTypeBadgeStyle}>{contentType}</code>
              {media.schema && (
                <Tabs
                  tabs={[
                    {
                      id: 'schema',
                      label: 'Schema',
                      content: <SchemaTree nodes={schemaToNodes(media.schema as Record<string, unknown>)} context="request" />,
                    },
                    {
                      id: 'example',
                      label: 'Example',
                      content: <ExampleBlock media={media} />,
                    },
                  ]}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Responses */}
      {operation.responses.length > 0 && (
        <div className={sectionStyle}>
          <LinkableHeading id={`${opId}-responses`} as="h4" className={sectionTitleStyle}>Responses</LinkableHeading>
          <div className={responseListStyle}>
            {operation.responses.map((response) => (
              <div key={response.statusCode} className={responseCardStyle}>
                <div className={responseHeaderStyle}>
                  <span className={cx(statusBadgeStyle, css({
                    backgroundColor: getStatusBg(response.statusCode),
                    color: getStatusColor(response.statusCode),
                  }))}>
                    {response.statusCode}
                  </span>
                  <span className={responseDescStyle}>{response.description}</span>
                </div>
                {response.headers && Object.keys(response.headers).length > 0 && (
                  <div className={responseHeadersSection}>
                    <span className={responseHeadersLabel}>Headers</span>
                    <div className={responseHeadersList}>
                      {Object.entries(response.headers).map(([headerName, header]) => (
                        <div key={headerName} className={responseHeaderWrapper}>
                          <div className={responseHeaderRow}>
                            <span className={responseHeaderName}>{headerName}</span>
                            {header.schema && (
                              <pre className={typeBadgeStyle}>
                                {(header.schema as Record<string, unknown>).type as string ?? 'string'}
                              </pre>
                            )}
                          </div>
                          {header.description && (
                            <div className={responseHeaderDesc}>{header.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {response.content && Object.entries(response.content).map(([contentType, media]) => {
                  const hasNamedExamples = getNamedExamples(media).length > 0
                  const hasSchema = !!media.schema
                  const hasExample = hasNamedExamples

                  if (!hasSchema && !hasExample) return null

                  const tabs = []
                  if (hasSchema) {
                    tabs.push({
                      id: `schema-${response.statusCode}-${contentType}`,
                      label: 'Schema',
                      content: <SchemaTree nodes={schemaToNodes(media.schema as Record<string, unknown>)} context="response" />,
                    })
                  }
                  if (hasExample || hasSchema) {
                    tabs.push({
                      id: `example-${response.statusCode}-${contentType}`,
                      label: 'Example',
                      content: <ExampleBlock media={media} />,
                    })
                  }

                  return (
                    <div key={contentType} className={mediaTypeStyle}>
                      <code className={contentTypeLabel}>{contentType}</code>
                      <Tabs tabs={tabs} defaultTab={hasExample && !hasSchema ? tabs[0]?.id : undefined} />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Callbacks */}
      {operation.callbacks && Object.keys(operation.callbacks).length > 0 && (
        <div className={sectionStyle}>
          <CallbacksSection callbacks={operation.callbacks} />
        </div>
      )}
    </>
  )
}

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

const summaryStyle = css({
  margin: '0 0 16px',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.5,
})

const sectionStyle = css({
  marginBottom: '24px',
})

const sectionTitleStyle = css({
  margin: '0 0 12px',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const paramListStyle = css({
  display: 'flex',
  flexDirection: 'column',
})

const paramRowStyle = css({
  padding: '12px 0',
})

const paramHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
})

const paramNameStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 700,
  backgroundColor: 'transparent',
  padding: 0,
})

const typeBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 400,
})

const requiredBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  color: 'var(--omnispec-color-error)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
})

const inBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 6px',
  borderRadius: '3px',
  fontFamily: 'var(--omnispec-font-mono)',
})

const paramDescStyle = css({
  margin: '4px 0 0',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.5,
})

const deprecatedBannerStyle = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
  padding: '0.625rem 0.75rem',
  marginBottom: '1rem',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'color-mix(in srgb, var(--omnispec-color-warning) 12%, transparent)',
  color: 'var(--omnispec-color-warning)',
  fontSize: 'var(--omnispec-font-size-sm)',
  lineHeight: 1.4,
})

const paramConstraintsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  marginTop: '0.375rem',
})

const paramConstraintBadgeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  padding: '0.0625rem 0.375rem',
  borderRadius: 'var(--omnispec-border-radius)',
})

const paramEnumBadgeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-info)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  padding: '0.0625rem 0.375rem',
  borderRadius: 'var(--omnispec-border-radius)',
  wordBreak: 'break-word',
})

const paramExampleValueStyle = css({
  display: 'block',
  marginTop: '0.375rem',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  wordBreak: 'break-all',
})

const mediaTypeStyle = css({
  marginTop: '1rem',
  overflow: 'hidden',
  minWidth: 0,
})

const contentTypeLabel = css({
  display: 'inline-block',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  marginBottom: '4px',
})

const contentTypeBadgeStyle = css({
  marginBottom: '8px',
  fontSize: 'var(--omnispec-font-size-sm)',
})

const responseListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const responseCardStyle = css({
  minWidth: 0,
  [mq.desktop]: {
    padding: '0.625rem 1rem',
    borderRadius: 'var(--omnispec-border-radius)',
    border: '1px solid color-mix(in srgb, var(--omnispec-border-color) 80%, transparent)',
  },
})

const responseHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
})

const statusBadgeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontWeight: 700,
  fontSize: 'var(--omnispec-font-size-sm)',
  padding: '2px 8px',
  borderRadius: '4px',
})

const responseDescStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
})

const securitySchemesList = css({
  display: 'flex',
  gap: '8px',
})

const securitySchemesRow = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
})

const securitySchemeBadge = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '3px 10px',
  borderRadius: '4px',
  fontWeight: 500,
})

const securityOrLabel = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  fontStyle: 'italic',
})

const externalDocsLinkStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '3px 10px',
  borderRadius: '12px',
  fontWeight: 500,
  marginBottom: '12px',
  '&:hover': {
    textDecoration: 'underline',
  },
})

const externalDocsArrowStyle = css({
  fontSize: '11px',
})

const responseHeadersSection = css({
  marginTop: '8px',
  paddingTop: '8px',
  borderTop: '1px dashed var(--omnispec-border-color)',
})

const responseHeadersLabel = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '10px',
})

const responseHeadersList = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
})

const responseHeaderWrapper = css({
  display: 'flex',
  flexDirection: 'column',
})

const responseHeaderRow = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 0',
})

const responseHeaderName = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'transparent',
  padding: 0,
})

const responseHeaderDesc = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
})
