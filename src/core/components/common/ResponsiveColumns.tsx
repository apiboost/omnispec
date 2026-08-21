/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { css } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { loadPanelWidth, savePanelWidth } from '@core/utils/tryit-storage'

interface ResponsiveColumnsProps {
  left: React.ReactNode
  right?: React.ReactNode
  rightLabel?: string
}

/** Resize bounds for the right (Try-It) column. */
const MIN_RIGHT_WIDTH = 320
const MAX_RIGHT_FRACTION = 0.65

const singleColumnStyle = css({
  padding: '0.75rem 0',
  minWidth: 0,
  [mq.desktop]: {
    padding: '1rem 1.25rem',
  },
})

const gridStyle = css({
  maxWidth: '100%',
  [mq.desktop]: {
    display: 'grid',
    // The custom property is set inline while a user-chosen width is active;
    // it falls back to a 65/35 split (content-heavy left, Try-It on the right).
    gridTemplateColumns: '1fr 0.375rem var(--omnispec-tryit-col, calc(35% - 0.375rem))',
  },
})

const leftColumnStyle = css({
  padding: '0.75rem 0',
  minWidth: 0,
  [mq.desktop]: {
    padding: '1rem 1.25rem',
  },
})

const toggleButtonStyle = css({
  display: 'block',
  width: '100%',
  padding: '10px 16px',
  marginTop: '12px',
  borderRadius: 'var(--omnispec-border-radius)',
  background: 'var(--omnispec-color-primary, #1a1a2e)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 500,
  textAlign: 'center',
  [mq.desktop]: {
    display: 'none',
  },
})

const rightColumnStyle = css({
  padding: '0.75rem 0',
  background: 'var(--omnispec-bg-secondary)',
  minWidth: 0,
  display: 'none',
  '&[data-mobile-visible]': {
    display: 'block',
    borderTop: '1px solid var(--omnispec-border-color)',
  },
  [mq.desktop]: {
    display: 'block',
    padding: '1rem 1.25rem',
    borderTop: 'none',
  },
})

const resizeHandleStyle = css({
  display: 'none',
  [mq.desktop]: {
    display: 'block',
    cursor: 'col-resize',
    backgroundColor: 'var(--omnispec-border-color)',
    borderRadius: '0.1875rem',
    transition: 'background-color 0.15s ease',
    marginTop: '1rem',
    marginBottom: '1rem',
    '&:hover, &[data-dragging]': {
      backgroundColor: 'var(--omnispec-color-primary)',
    },
  },
})

const draggingContainerStyle = css({
  userSelect: 'none',
})

export function ResponsiveColumns({ left, right, rightLabel = 'Try It' }: ResponsiveColumnsProps) {
  const [showRight, setShowRight] = useState(false)
  const [rightWidth, setRightWidth] = useState<number | null>(() => loadPanelWidth())
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)

    const onMove = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const raw = rect.right - ev.clientX
      const max = rect.width * MAX_RIGHT_FRACTION
      setRightWidth(Math.min(max, Math.max(MIN_RIGHT_WIDTH, raw)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDragging(false)
      setRightWidth((width) => {
        if (width !== null) savePanelWidth(width)
        return width
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (!right) {
    return (
      <div className={singleColumnStyle}>
        {left}
      </div>
    )
  }

  const containerStyle: CSSProperties | undefined = rightWidth !== null
    ? ({ '--omnispec-tryit-col': `${rightWidth}px` } as CSSProperties)
    : undefined

  return (
    <div
      ref={containerRef}
      className={`${gridStyle} ${dragging ? draggingContainerStyle : ''}`}
      style={containerStyle}
    >
      <div className={leftColumnStyle}>
        {left}
        <button
          type="button"
          className={toggleButtonStyle}
          onClick={() => setShowRight((prev) => !prev)}
        >
          {showRight ? 'Hide' : rightLabel}
        </button>
      </div>
      <div
        className={resizeHandleStyle}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${rightLabel} panel`}
        onPointerDown={startDrag}
        {...(dragging ? { 'data-dragging': '' } : {})}
      />
      <div
        className={rightColumnStyle}
        {...(showRight ? { 'data-mobile-visible': '' } : {})}
      >
        {right}
      </div>
    </div>
  )
}
