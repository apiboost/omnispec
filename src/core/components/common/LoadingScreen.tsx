/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css, keyframes } from '../../styles/css'

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
})

const containerStyle = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  gap: '1rem',
})

const spinnerStyle = css({
  width: '2.5rem',
  height: '2.5rem',
  border: '3px solid var(--omnispec-border-color)',
  borderTopColor: 'var(--omnispec-color-primary)',
  borderRadius: '50%',
  animation: `${spin} 0.8s linear infinite`,
})

const textStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 500,
  color: 'var(--omnispec-fg-muted)',
  letterSpacing: '0.02em',
})

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className={`omnispec-loading ${containerStyle}`}>
      <div className={spinnerStyle} />
      <span className={textStyle}>{message}</span>
    </div>
  )
}
