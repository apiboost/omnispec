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
import type { TryItResponse } from '@core/types/try-it.types'
import { CodeBlock } from '@core/components/CodeBlock/CodeBlock'
import type { CodeLanguage } from '@core/components/CodeBlock/CodeBlock'
import { Tabs } from '@core/components/common/Tabs'
import { Button } from '@core/components/common/Button'
import { base64ToBlob, filenameForResponse } from '@core/utils/binary-response'

interface ResponseViewerProps {
  response: TryItResponse | null
  loading?: boolean
  error?: string
}

const containerStyle = css({
  marginTop: '12px',
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: 'var(--omnispec-border-radius)',
  padding: '12px',
  backgroundColor: 'var(--omnispec-bg-secondary)',
})

const statusBarStyle = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
})

const statusCodeBaseStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontWeight: 700,
  fontSize: 'var(--omnispec-font-size-base)',
})

const durationStyle = css({
  color: 'var(--omnispec-fg-muted)',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const loadingStyle = css({
  color: 'var(--omnispec-fg-muted)',
  textAlign: 'center',
  padding: '24px',
})

const errorStyle = css({
  color: 'var(--omnispec-color-error)',
  padding: '12px',
})

const headersStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const headerRowStyle = css({
  display: 'flex',
  gap: '8px',
  padding: '2px 0',
})

const headerKeyStyle = css({
  color: 'var(--omnispec-fg-secondary)',
  fontWeight: 600,
})

const headerValueStyle = css({
  color: 'var(--omnispec-fg-primary)',
  wordBreak: 'break-all',
})

export function ResponseViewer({ response, loading, error }: ResponseViewerProps) {
  if (loading) {
    return (
      <div className={containerStyle}>
        <div className={loadingStyle}>Sending request...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={containerStyle}>
        <div className={errorStyle}>{error}</div>
      </div>
    )
  }

  if (!response) return null

  const statusColor = getStatusColor(response.status)
  const isBinary = response.bodyEncoding === 'base64'
  const bodyLanguage = detectLanguage(response.contentType)
  const formattedBody = isBinary ? '' : formatBody(response.body, bodyLanguage)

  const handleDownload = () => {
    const blob = base64ToBlob(response.body, response.contentType)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filenameForResponse(response.headers, response.contentType)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  // Approximate decoded size of a base64 payload.
  const binarySize = isBinary ? Math.floor((response.body.length * 3) / 4) : 0

  return (
    <div className={`adr-response ${containerStyle}`}>
      <div className={statusBarStyle}>
        <span className={css(statusCodeBaseStyle, { color: statusColor })}>
          {response.status} {response.statusText}
        </span>
        <span className={durationStyle}>{response.duration.toFixed(0)}ms</span>
      </div>

      <Tabs
        tabs={[
          {
            id: 'body',
            label: 'Response Body',
            content: isBinary ? (
              <div className={binaryPanelStyle}>
                <span className={binaryInfoStyle}>
                  Binary response — {response.contentType.split(';')[0]} ({formatSize(binarySize)})
                </span>
                <Button variant="secondary" onClick={handleDownload}>
                  Download
                </Button>
              </div>
            ) : (
              <CodeBlock
                code={formattedBody}
                language={bodyLanguage}
                title={response.contentType}
                maxHeight="300px"
              />
            ),
          },
          {
            id: 'headers',
            label: 'Headers',
            content: (
              <div className={headersStyle}>
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className={headerRowStyle}>
                    <span className={headerKeyStyle}>{key}:</span>
                    <span className={headerValueStyle}>{value}</span>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

const binaryPanelStyle = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '1rem',
})

const binaryInfoStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  fontFamily: 'var(--omnispec-font-mono)',
  wordBreak: 'break-all',
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--omnispec-color-success)'
  if (status >= 300 && status < 400) return 'var(--omnispec-color-info)'
  if (status >= 400 && status < 500) return 'var(--omnispec-color-warning)'
  return 'var(--omnispec-color-error)'
}

function detectLanguage(contentType: string): CodeLanguage {
  if (contentType.includes('json')) return 'json'
  if (contentType.includes('xml') || contentType.includes('html')) return 'xml'
  if (contentType.includes('yaml') || contentType.includes('yml')) return 'yaml'
  return 'text'
}

function formatBody(body: string, language: CodeLanguage): string {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  }
  return body
}
