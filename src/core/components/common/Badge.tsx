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

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

interface BadgeProps {
  label: string
  variant?: 'method' | 'status' | 'protocol' | 'default'
  method?: HttpMethod
  color?: string
}

const methodColorVars: Record<HttpMethod, string> = {
  get: 'var(--omnispec-color-get)',
  post: 'var(--omnispec-color-post)',
  put: 'var(--omnispec-color-put)',
  delete: 'var(--omnispec-color-delete)',
  patch: 'var(--omnispec-color-patch)',
  options: 'var(--omnispec-fg-muted)',
  head: 'var(--omnispec-fg-muted)',
}

const badgeBaseStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#ffffff',
})

export function Badge({ label, variant = 'default', method, color }: BadgeProps) {
  const bgColor = color
    ?? (variant === 'method' && method ? methodColorVars[method] : undefined)
    ?? 'var(--omnispec-fg-muted)'

  const dynamicStyle = css({
    backgroundColor: bgColor,
    minWidth: variant === 'method' ? '52px' : undefined,
  })

  return <span className={`omnispec-badge ${badgeBaseStyle} ${dynamicStyle}`}>{label}</span>
}
