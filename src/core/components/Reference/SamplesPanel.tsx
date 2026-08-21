/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useMemo, useState } from 'react'
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { TryItRequest } from '@core/types/try-it.types'
import { CodeBlock } from '@core/components/CodeBlock/CodeBlock'
import type { CodeLanguage } from '@core/components/CodeBlock/CodeBlock'
import { generateCurl } from '@core/components/TryIt/curl-generator'
import {
  generateJavaScript,
  generatePython,
  generateGo,
  generateJava,
  generateCSharp,
  CODE_LANGUAGES,
} from '@core/components/TryIt/code-generators'
import type { CodeLanguageId } from '@core/components/TryIt/code-generators'
import { generateExample } from '@core/components/SchemaViewer/schema-utils'
import { ExampleSelector, getNamedExamples } from '@core/components/common/ExampleSelector'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResponseSample {
  statusCode: string
  description: string
  content?: Record<string, {
    schema?: Record<string, unknown>
    example?: unknown
    examples?: Record<string, { value: unknown }>
  }>
}

export interface SamplesPanelProps {
  method: string
  path: string
  serverUrl: string
  operationId: string
  requestBodySchema?: Record<string, unknown>
  requestBodyContentType?: string
  responses: ResponseSample[]
  onPropertyClick?: (propertyPath: string) => void
}

// ---------------------------------------------------------------------------
// Code generators map
// ---------------------------------------------------------------------------

const generators: Record<CodeLanguageId, (req: TryItRequest, url: string) => string> = {
  curl: generateCurl,
  javascript: generateJavaScript,
  python: generatePython,
  go: generateGo,
  java: generateJava,
  csharp: generateCSharp,
}

// ---------------------------------------------------------------------------
// Status-code colour helpers
// ---------------------------------------------------------------------------

function getStatusColor(statusCode: string): string {
  const code = parseInt(statusCode, 10)
  if (code >= 200 && code < 300) return 'var(--omnispec-color-success)'
  if (code >= 400 && code < 500) return 'var(--omnispec-color-warning)'
  if (code >= 500) return 'var(--omnispec-color-error)'
  return 'var(--omnispec-fg-muted)'
}

function getStatusBg(statusCode: string): string {
  const code = parseInt(statusCode, 10)
  if (code >= 200 && code < 300) return 'rgba(26, 127, 55, 0.15)'
  if (code >= 400 && code < 500) return 'rgba(191, 135, 0, 0.15)'
  if (code >= 500) return 'rgba(207, 34, 46, 0.15)'
  return 'var(--omnispec-bg-secondary)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SamplesPanel({
  method,
  path,
  serverUrl,
  requestBodySchema,
  requestBodyContentType = 'application/json',
  responses,
}: SamplesPanelProps) {
  const [selectedLang, setSelectedLang] = useState<CodeLanguageId>('curl')
  const [selectedResponseIndex, setSelectedResponseIndex] = useState(0)
  const [selectedExampleName, setSelectedExampleName] = useState<string>('')

  // Build a minimal TryItRequest from props so we can feed it to generators
  const request = useMemo<TryItRequest>(() => {
    const headers: Record<string, string> = {}
    const hasBody = requestBodySchema && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())

    if (hasBody) {
      headers['Content-Type'] = requestBodyContentType
    }

    const body = hasBody
      ? JSON.stringify(generateExample(requestBodySchema!), null, 2)
      : undefined

    return {
      url: path,
      method: method.toUpperCase(),
      headers,
      queryParams: {},
      pathParams: {},
      body,
    }
  }, [method, path, requestBodySchema, requestBodyContentType])

  // Generated code for the selected language
  const requestCode = useMemo(() => {
    const generator = generators[selectedLang]
    return generator ? generator(request, serverUrl) : ''
  }, [request, serverUrl, selectedLang])

  const langOption = CODE_LANGUAGES.find((l) => l.id === selectedLang)
  const prismLang = (langOption?.prismLanguage ?? 'text') as CodeLanguage

  // Response data for the selected tab
  const activeResponse = responses[selectedResponseIndex] ?? null

  const { namedExamples, responseContentType } = useMemo(() => {
    if (!activeResponse?.content) return { namedExamples: [], responseContentType: null }
    const firstContentType = Object.keys(activeResponse.content)[0]
    const firstMedia = activeResponse.content[firstContentType]
    if (!firstMedia) return { namedExamples: [], responseContentType: firstContentType }

    const examples = getNamedExamples(firstMedia as { example?: unknown; examples?: Record<string, { summary?: string; value: unknown }> })
    if (examples.length === 0 && firstMedia.schema) {
      return {
        namedExamples: [{ name: 'generated', value: generateExample(firstMedia.schema as Record<string, unknown>) }],
        responseContentType: firstContentType,
      }
    }
    return { namedExamples: examples, responseContentType: firstContentType }
  }, [activeResponse])

  const responseExampleCode = useMemo(() => {
    if (namedExamples.length === 0) return null
    const target = selectedExampleName
      ? namedExamples.find((ex) => ex.name === selectedExampleName)
      : namedExamples[0]
    const value = target?.value ?? namedExamples[0]?.value ?? null
    if (value === null) return null
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }, [namedExamples, selectedExampleName])

  // Language tab bar rendered into CodeBlock headerLeft
  const languageTabs = (
    <div className={languageBarStyle}>
      {CODE_LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => setSelectedLang(lang.id)}
          className={cx(langBtnStyle, selectedLang === lang.id && langBtnActiveStyle)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className={panelStyle}>
      {/* ------------------------------------------------------------------ */}
      {/* Request Samples                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className={sectionStyle}>
        <div className={sectionHeaderStyle}>
          <span className={sectionTitleStyle}>Request samples</span>
          {requestBodyContentType && (
            <code className={contentTypeBadgeStyle}>{requestBodyContentType}</code>
          )}
        </div>

        <CodeBlock
          code={requestCode}
          language={prismLang}
          showCopy={true}
          headerLeft={languageTabs}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Response Samples                                                     */}
      {/* ------------------------------------------------------------------ */}
      {responses.length > 0 && (
        <div className={sectionStyle}>
          <div className={sectionHeaderStyle}>
            <span className={sectionTitleStyle}>Response samples</span>
          </div>

          {/* Status code tab pills */}
          <div className={statusTabsStyle}>
            {responses.map((res, idx) => {
              const color = getStatusColor(res.statusCode)
              const bg = getStatusBg(res.statusCode)
              const isActive = idx === selectedResponseIndex

              return (
                <button
                  key={res.statusCode}
                  type="button"
                  onClick={() => {
                    setSelectedResponseIndex(idx); setSelectedExampleName('')
                  }}
                  className={cx(statusTabStyle, isActive && statusTabActiveStyle)}
                  style={
                    {
                      '--status-color': color,
                      '--status-bg': bg,
                    } as React.CSSProperties
                  }
                  title={res.description}
                >
                  {res.statusCode}
                </button>
              )
            })}
          </div>

          {/* Response code block */}
          {responseExampleCode !== null ? (
            <div>
              <div className={contentTypeLabelStyle}>
                <code className={contentTypeBadgeStyle}>{responseContentType}</code>
              </div>
              {namedExamples.length > 1 && (
                <ExampleSelector
                  examples={namedExamples}
                  selectedName={selectedExampleName || namedExamples[0]?.name}
                  onSelect={setSelectedExampleName}
                />
              )}
              <CodeBlock
                code={responseExampleCode}
                language="json"
                showCopy={true}
              />
            </div>
          ) : (
            <div className={emptyStateStyle}>No response sample available.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
})

const sectionStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
})

const sectionHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
})

const sectionTitleStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  [mq.desktop]: {
    fontSize: 'var(--omnispec-font-size-base)',
  },
})

const contentTypeBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  padding: '0.125rem 0.375rem',
  borderRadius: 'var(--omnispec-border-radius)',
})

const languageBarStyle = css({
  display: 'flex',
  gap: '0.125rem',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
})

const langBtnStyle = css({
  padding: '0.25rem 0.5rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 500,
  color: 'var(--omnispec-fg-muted)',
  whiteSpace: 'nowrap',
  borderRadius: 'var(--omnispec-border-radius)',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})

const langBtnActiveStyle = css({
  color: 'var(--omnispec-color-primary)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  fontWeight: 600,
})

const statusTabsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
})

// Status tabs use CSS custom properties set via inline style so each tab
// can carry its own colour without a unique class per status code.
const statusTabStyle = css({
  padding: '0.25rem 0.625rem',
  border: 'none',
  borderRadius: 'var(--omnispec-border-radius)',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  fontFamily: 'var(--omnispec-font-mono)',
  opacity: 0.65,
  backgroundColor: 'var(--status-bg)',
  color: 'var(--status-color)',
  transition: 'opacity 0.15s, box-shadow 0.15s',
  '&:hover': {
    opacity: 0.85,
  },
})

const statusTabActiveStyle = css({
  opacity: 1,
  boxShadow: '0 0 0 1px var(--status-color)',
})

const contentTypeLabelStyle = css({
  marginBottom: '0.25rem',
})

const emptyStateStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  padding: '0.75rem 0',
})
