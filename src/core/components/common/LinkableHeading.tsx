/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { css } from '@core/styles/css'
import { Icon } from './Icon'

interface LinkableHeadingProps {
  id: string
  as?: 'h2' | 'h3' | 'h4' | 'h5'
  className?: string
  children: ReactNode
}

export function LinkableHeading({ id, as: Tag = 'h3', className, children }: LinkableHeadingProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const url = `${window.location.origin}${window.location.pathname}#${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [id])

  return (
    <Tag id={id} className={`${containerStyle} ${className ?? ''}`}>
      {children}
      <a
        href={`#${id}`}
        onClick={handleCopy}
        className={linkIconStyle}
        aria-label="Copy link to section"
        title={copied ? 'Copied!' : 'Copy link'}
      >
        <Icon name="link" size="0.75em" />
      </a>
    </Tag>
  )
}

const containerStyle = css({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  '&:hover a': {
    opacity: 1,
  },
})

const linkIconStyle = css({
  opacity: 0,
  color: 'var(--omnispec-fg-muted)',
  transition: 'opacity 0.15s',
  flexShrink: 0,
  lineHeight: 1,
  textDecoration: 'none',
  '&:hover': {
    color: 'var(--omnispec-color-primary)',
  },
})
