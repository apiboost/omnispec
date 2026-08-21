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
import { css } from '../../styles/css'

interface CopyButtonProps {
  text: string
  label?: string
}

const copyBtnStyle = css({
  background: 'none',
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: 'var(--omnispec-border-radius)',
  padding: '4px 10px',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    borderColor: 'var(--omnispec-fg-muted)',
  },
})

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={copyBtnStyle}
      aria-label={label}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}
