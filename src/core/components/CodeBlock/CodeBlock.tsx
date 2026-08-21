/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-xml-doc'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-graphql'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-csharp'
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { Icon } from '@core/components/common/Icon'

export type CodeLanguage = 'json' | 'yaml' | 'xml' | 'bash' | 'graphql' | 'http' | 'text' | 'javascript' | 'python' | 'go' | 'java' | 'csharp'

interface CodeBlockProps {
  code: string
  language?: CodeLanguage
  title?: string
  showCopy?: boolean
  maxHeight?: string
  headerLeft?: ReactNode
}

const languageMap: Record<CodeLanguage, string> = {
  json: 'json',
  yaml: 'yaml',
  xml: 'xml-doc',
  bash: 'bash',
  graphql: 'graphql',
  http: 'http',
  text: 'text',
  javascript: 'javascript',
  python: 'python',
  go: 'go',
  java: 'java',
  csharp: 'csharp',
}

export function CodeBlock({
  code,
  language = 'text',
  title,
  showCopy = true,
  maxHeight,
  headerLeft,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const highlighted = highlightCode(code, language)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const hasHeader = title || showCopy || headerLeft

  return (
    <div className={cx('omnispec-code-block', containerStyle)}>
      {hasHeader && (
        <div className={headerStyle}>
          <div className={headerLeftStyle}>
            {title && <span className={titleStyle}>{title}</span>}
            {headerLeft}
          </div>
          {showCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className={copyBtnStyle}
              aria-label={copied ? 'Copied' : 'Copy code'}
              title={copied ? 'Copied!' : 'Copy'}
            >
              <Icon name={copied ? 'check' : 'copy'} size="0.875rem" />
            </button>
          )}
        </div>
      )}
      <pre
        className={cx(preStyle, css({
          maxHeight: maxHeight ?? '25rem',
        }))}
      >
        <code
          ref={codeRef}
          className={`language-${languageMap[language]}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  )
}

function highlightCode(code: string, language: CodeLanguage): string {
  const prismLang = languageMap[language]
  const grammar = Prism.languages[prismLang]
  if (!grammar) return escapeHtml(code)
  return Prism.highlight(code, grammar, prismLang)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const containerStyle = css({
  overflow: 'hidden',
  fontSize: 'var(--omnispec-font-size-sm)',
  [mq.desktop]: {
    borderRadius: 'var(--omnispec-border-radius)',
    border: '1px solid var(--omnispec-border-color)',
  },
})

const headerStyle = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  borderBottom: '1px solid var(--omnispec-border-color)',
  gap: '0.5rem',
})

const headerLeftStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
})

const titleStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  fontWeight: 500,
})

const copyBtnStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  background: 'none',
  border: 'none',
  borderRadius: 'var(--omnispec-border-radius)',
  padding: '0.25rem',
  color: 'var(--omnispec-fg-muted)',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})

// Doubling the generated class via emotion's `&&` self-reference
// (`.css-XXX.css-XXX`) raises specificity from (0,1,0) to (0,2,0), so
// these top-corner overrides win against the global `.css-XXX pre`
// rule (0,1,1) applied by surrounding prose styles. No `!important`
// needed. All other pre styling is intentionally left to the global
// rule.
const preStyle = css({
  '&&': {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: '0.5rem 1rem',
    margin: 0,
  },
})
