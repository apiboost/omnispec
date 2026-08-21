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
import { marked } from 'marked'
import { css, cx } from '@core/styles/css'
import { sanitizeHtml } from '@core/utils/sanitize-html'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/*
 * CommonMark line-break semantics: single newlines are soft breaks that flow
 * as spaces. Spec descriptions almost always come from YAML block scalars
 * (`description: |`) whose newlines are just the author's source wrapping —
 * `breaks: true` would turn each one into a <br> and hard-wrap every
 * multi-line description (worst on mobile). Authors who want a real line
 * break use a trailing double space, a backslash, or a blank line.
 */
marked.setOptions({
  breaks: false,
  gfm: true,
})

const containerStyle = css({
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-base)',
  lineHeight: 1.6,
})

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return ''
    // Spec content is third-party input — always sanitize the rendered HTML.
    return sanitizeHtml(marked.parse(content, { async: false }) as string)
  }, [content])

  return (
    <div
      className={cx('omnispec-markdown', containerStyle, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
