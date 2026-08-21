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
import { authStyles } from './ApiKeyAuth'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

interface BasicAuthProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied?: boolean
  appliedValue?: AppliedAuthValue
}

const fieldColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

export function BasicAuth({ scheme, onApply, onRemove, applied, appliedValue }: BasicAuthProps) {
  const [username, setUsername] = useState(appliedValue?.input?.username ?? '')
  const [password, setPassword] = useState(appliedValue?.input?.password ?? '')

  const handleApply = () => {
    if (!username.trim()) return
    const encoded = btoa(`${username}:${password}`)
    onApply({
      schemeId: scheme.id,
      headerName: 'Authorization',
      headerValue: `Basic ${encoded}`,
      input: { username, password },
    })
  }

  const handleRemove = () => {
    // Clearing the inputs on remove keeps the fields in sync with the removed auth.
    setUsername('')
    setPassword('')
    onRemove(scheme.id)
  }

  return (
    <div className={authStyles.section}>
      <div className={authStyles.label}>
        {scheme.displayName}
        <span className={authStyles.hint}>(HTTP Basic)</span>
      </div>
      {scheme.description && (
        <MarkdownRenderer content={scheme.description} className={authStyles.description} />
      )}
      <div className={fieldColumnStyle}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className={authStyles.input}
          autoComplete="username"
        />
        <SecretInput
          value={password}
          onChange={setPassword}
          placeholder="Password"
          className={authStyles.input}
          autoComplete="current-password"
          aria-label={`${scheme.displayName} password`}
        />
        <div className={authStyles.inputRow}>
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
    </div>
  )
}
