/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '../../styles/css'
import { Badge } from './Badge'

interface MethodBarProps {
  label: string
  path: string
  color?: string
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
}

const barStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  backgroundColor: 'rgba(0, 0, 0, 0.02)',
  borderBottom: '1px solid var(--omnispec-border-color)',
  overflow: 'hidden',
  maxWidth: '100%',
})

const pathStyle = css({
  minWidth: 0,
  wordBreak: 'break-all',
})

export function MethodBar({ label, path, color, method }: MethodBarProps) {
  return (
    <div className={barStyle}>
      <Badge
        label={label}
        variant={method ? 'method' : 'default'}
        method={method}
        color={color}
      />
      <code className={pathStyle}>{path}</code>
    </div>
  )
}
