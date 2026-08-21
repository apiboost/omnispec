/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { css } from '../../styles/css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className={backdropStyle}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={dialogStyle}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={headerStyle}>
          {title && <h3 className={titleStyle}>{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            className={closeBtnStyle}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className={bodyStyle}>
          {children}
        </div>
      </div>
    </>
  )
}

const backdropStyle = css({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1100,
})

const dialogStyle = css({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '768px',
  maxHeight: '85vh',
  backgroundColor: 'var(--omnispec-bg-primary)',
  borderRadius: '12px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  zIndex: 1101,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

const headerStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid var(--omnispec-border-color)',
})

const titleStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-h3-font-size)',
  fontWeight: 600,
  color: 'var(--omnispec-color-primary)',
})

const closeBtnStyle = css({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '24px',
  lineHeight: 1,
  color: 'var(--omnispec-fg-muted)',
  padding: '4px 8px',
  borderRadius: '4px',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})

const bodyStyle = css({
  padding: '20px',
  overflowY: 'auto',
  flex: 1,
})
