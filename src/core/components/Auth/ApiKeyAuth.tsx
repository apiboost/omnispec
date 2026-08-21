/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState } from 'react'
import { css } from '../../styles/css'
import type { AuthScheme, AppliedAuthValue } from '../../types/auth.types'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

export const authStyles = {
  section: css({
    padding: '0.75rem 0',
    borderBottom: '1px solid var(--omnispec-border-color)',
    '&:last-child': {
      borderBottom: 'none',
    },
  }),
  label: css({
    fontWeight: 600,
    fontSize: 'var(--omnispec-font-size-sm)',
    color: 'var(--omnispec-fg-primary)',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  hint: css({
    fontWeight: 400,
    fontSize: 'var(--omnispec-font-size-xs)',
    color: 'var(--omnispec-fg-muted)',
  }),
  description: css({
    fontSize: 'var(--omnispec-font-size-xs)',
    color: 'var(--omnispec-fg-secondary)',
    margin: '4px 0 8px',
  }),
  inputRow: css({
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  }),
  input: css({
    flex: 1,
    padding: '6px 10px',
    border: '1px solid var(--omnispec-input-border)',
    borderRadius: 'var(--omnispec-border-radius)',
    backgroundColor: 'var(--omnispec-input-bg)',
    color: 'var(--omnispec-fg-primary)',
    fontSize: 'var(--omnispec-font-size-sm)',
    fontFamily: 'var(--omnispec-font-mono)',
    '&:focus': {
      borderColor: 'var(--omnispec-color-primary)',
      outline: 'none',
    },
    '&:hover': {
      borderColor: 'var(--omnispec-color-primary)',
    },
  }),
  applyBtn: css({
    padding: '6px 16px',
    backgroundColor: 'var(--omnispec-color-primary)',
    color: 'var(--omnispec-color-primary-text)',
    border: 'none',
    borderRadius: 'var(--omnispec-border-radius)',
    cursor: 'pointer',
    fontSize: 'var(--omnispec-font-size-sm)',
    fontWeight: 500,
    '&:hover': {
      opacity: 0.85,
    },
  }),
  removeBtn: css({
    padding: '6px 16px',
    backgroundColor: 'var(--omnispec-color-error)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--omnispec-border-radius)',
    cursor: 'pointer',
    fontSize: 'var(--omnispec-font-size-sm)',
    fontWeight: 500,
    '&:hover': {
      opacity: 0.85,
    },
  }),
} as const

interface ApiKeyAuthProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied?: boolean
  appliedValue?: AppliedAuthValue
}

export function ApiKeyAuth({ scheme, onApply, onRemove, applied, appliedValue }: ApiKeyAuthProps) {
  const [value, setValue] = useState(appliedValue?.input?.value ?? '')

  const handleApply = () => {
    if (!value.trim()) return
    const headerName = scheme.in === 'query' ? scheme.name ?? 'api_key' : scheme.name ?? 'X-API-Key'
    onApply({
      schemeId: scheme.id,
      headerName,
      headerValue: value,
      input: { value },
    })
  }

  const handleRemove = () => {
    // Clearing the input on remove keeps the field in sync with the removed auth.
    setValue('')
    onRemove(scheme.id)
  }

  return (
    <div className={authStyles.section}>
      <div className={authStyles.label}>
        {scheme.displayName}
        <span className={authStyles.hint}>({scheme.in}: {scheme.name})</span>
      </div>
      {scheme.description && (
        <MarkdownRenderer content={scheme.description} className={authStyles.description} />
      )}
      <div className={authStyles.inputRow}>
        <SecretInput
          value={value}
          onChange={setValue}
          placeholder="Enter API key"
          className={authStyles.input}
          aria-label={`${scheme.displayName} value`}
        />
        {applied ? (
          <button type="button" onClick={handleRemove} className={authStyles.removeBtn}>
            Remove
          </button>
        ) : (
          <button type="button" onClick={handleApply} className={authStyles.applyBtn}>
            Apply
          </button>
        )}
      </div>
    </div>
  )
}
