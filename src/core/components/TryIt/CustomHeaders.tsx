/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '@core/styles/css'
import { Icon } from '@core/components/common/Icon'

export interface CustomHeader {
  name: string
  value: string
}

interface CustomHeadersProps {
  headers: CustomHeader[]
  onChange: (headers: CustomHeader[]) => void
}

/**
 * User-added arbitrary request headers for the Try-It panel ("+ Add header").
 * Included in sent requests and generated code samples.
 */
export function CustomHeaders({ headers, onChange }: CustomHeadersProps) {
  const updateRow = (index: number, patch: Partial<CustomHeader>) => {
    onChange(headers.map((h, i) => (i === index ? { ...h, ...patch } : h)))
  }

  const removeRow = (index: number) => {
    onChange(headers.filter((_, i) => i !== index))
  }

  return (
    <div className={`omnispec-custom-headers ${sectionStyle}`}>
      {headers.length > 0 && <span className={sectionTitleStyle}>Custom Headers</span>}
      {headers.map((header, idx) => (
        <div key={idx} className={rowStyle}>
          <input
            type="text"
            value={header.name}
            onChange={(e) => updateRow(idx, { name: e.target.value })}
            placeholder="Header name"
            aria-label={`Custom header ${idx + 1} name`}
            className={nameInputStyle}
          />
          <input
            type="text"
            value={header.value}
            onChange={(e) => updateRow(idx, { value: e.target.value })}
            placeholder="Value"
            aria-label={`Custom header ${idx + 1} value`}
            className={valueInputStyle}
          />
          <button
            type="button"
            onClick={() => removeRow(idx)}
            aria-label={`Remove custom header ${idx + 1}`}
            className={removeBtnStyle}
          >
            <Icon name="xmark" size="0.875rem" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...headers, { name: '', value: '' }])}
        className={addBtnStyle}
      >
        + Add header
      </button>
    </div>
  )
}

const sectionStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '0.75rem',
})

const sectionTitleStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const rowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
})

const inputBase = {
  padding: '0.375rem 0.5rem',
  borderRadius: 'var(--omnispec-border-radius)',
  border: '1px solid var(--omnispec-input-border)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  minWidth: 0,
} as const

const nameInputStyle = css({
  ...inputBase,
  flex: 1,
})

const valueInputStyle = css({
  ...inputBase,
  flex: 1.4,
})

const removeBtnStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.25rem',
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--omnispec-fg-muted)',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-color-error)',
  },
})

const addBtnStyle = css({
  alignSelf: 'flex-start',
  padding: '0.25rem 0.625rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-sans)',
  fontWeight: 500,
  color: 'var(--omnispec-fg-link)',
  backgroundColor: 'transparent',
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: '1rem',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})
