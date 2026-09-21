/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactNode } from 'react'
import { css } from '@core/styles/css'

/** `"cleanSession"` / `"clean_session"` → `"Clean Session"`. */
export function humanizeField(field: string): string {
  const spaced = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function renderValue(value: unknown): ReactNode {
  if (value === null) return <span className={mutedStyle}>null</span>
  if (typeof value === 'boolean') return <code className={codeStyle}>{value ? 'true' : 'false'}</code>
  if (typeof value === 'number') return <code className={codeStyle}>{String(value)}</code>
  if (typeof value === 'string') return <span>{value}</span>
  // Objects/arrays (e.g. MQTT lastWill, WebSocket query schema).
  return <code className={jsonStyle}>{JSON.stringify(value)}</code>
}

/**
 * A key/value grid used to render binding fields and security-scheme fields.
 * Keys are humanized; values are formatted by type. Shared so binding and
 * security displays stay visually identical and a change lands in one place.
 */
export function FieldRows({ fields }: { fields: Array<[string, unknown]> }) {
  if (fields.length === 0) return null
  return (
    <dl className={listStyle}>
      {fields.map(([field, value]) => (
        <div key={field} className={rowStyle}>
          <dt className={nameStyle}>{humanizeField(field)}</dt>
          <dd className={valueStyle}>{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

const listStyle = css({
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  gap: '0.25rem 1rem',
  margin: '0.25rem 0 0',
})

const rowStyle = css({ display: 'contents' })

const nameStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-secondary)',
})

const valueStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-primary)',
  margin: 0,
  minWidth: 0,
  wordBreak: 'break-word',
})

const codeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const jsonStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  wordBreak: 'break-all',
})

const mutedStyle = css({
  color: 'var(--omnispec-fg-muted)',
})
