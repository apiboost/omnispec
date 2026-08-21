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
import { css, cx } from '@core/styles/css'
import type { TryItRequest } from '@core/types/try-it.types'
import { CodeBlock } from '@core/components/CodeBlock/CodeBlock'
import type { CodeLanguage } from '@core/components/CodeBlock/CodeBlock'
import { generateCurl } from './curl-generator'
import {
  generateJavaScript,
  generatePython,
  generateGo,
  generateJava,
  generateCSharp,
  CODE_LANGUAGES,
} from './code-generators'
import type { CodeLanguageId } from './code-generators'

interface CodeSamplesProps {
  request: TryItRequest
  serverUrl: string
  selectedLanguage: CodeLanguageId
  onLanguageChange: (lang: CodeLanguageId) => void
  xCodeSamples?: XCodeSample[]
}

export interface XCodeSample {
  lang: string
  label?: string
  source: string
}

const generators: Record<CodeLanguageId, (req: TryItRequest, url: string) => string> = {
  curl: generateCurl,
  javascript: generateJavaScript,
  python: generatePython,
  go: generateGo,
  java: generateJava,
  csharp: generateCSharp,
}

export function CodeSamples({
  request,
  serverUrl,
  selectedLanguage,
  onLanguageChange,
  xCodeSamples,
}: CodeSamplesProps) {
  const code = useMemo(() => {
    if (xCodeSamples) {
      const custom = xCodeSamples.find(
        (s) => s.lang.toLowerCase() === selectedLanguage || s.label?.toLowerCase() === selectedLanguage,
      )
      if (custom) return custom.source
    }
    const generator = generators[selectedLanguage]
    return generator ? generator(request, serverUrl) : ''
  }, [request, serverUrl, selectedLanguage, xCodeSamples])

  const langOption = CODE_LANGUAGES.find((l) => l.id === selectedLanguage)
  const prismLang = langOption?.prismLanguage ?? 'text'

  const languageTabs = (
    <div className={languageBarStyle}>
      {CODE_LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => onLanguageChange(lang.id)}
          className={cx(langBtnStyle, selectedLanguage === lang.id && langBtnActiveStyle)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className={containerStyle}>
      <CodeBlock
        code={code}
        language={prismLang as CodeLanguage}
        showCopy={true}
        headerLeft={languageTabs}
      />
    </div>
  )
}

const containerStyle = css({
  marginTop: '0.75rem',
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
