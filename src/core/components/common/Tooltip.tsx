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
import { css } from '../../styles/css'

interface TooltipProps {
  content: string
  children: ReactNode
}

const wrapperStyle = css({
  position: 'relative',
  display: 'inline-block',
})

const tipStyle = css({
  position: 'fixed',
  padding: '4px 8px',
  backgroundColor: 'var(--omnispec-fg-primary)',
  color: 'var(--omnispec-bg-primary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  borderRadius: '4px',
  whiteSpace: 'nowrap',
  zIndex: 9999,
  pointerEvents: 'none',
})

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const wrapperRef = useRef<HTMLSpanElement>(null)

  const handleEnter = useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setPos({
        top: rect.top - 6,
        left: rect.left + rect.width / 2,
      })
    }
    setVisible(true)
  }, [])

  return (
    <span
      ref={wrapperRef}
      className={`omnispec-tooltip ${wrapperStyle}`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={tipStyle}
          role="tooltip"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
        </span>
      )}
    </span>
  )
}
