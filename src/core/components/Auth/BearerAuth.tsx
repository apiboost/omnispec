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
import type { AuthScheme, AppliedAuthValue } from '../../types/auth.types'
import { authStyles } from './ApiKeyAuth'
import { SecretInput } from './SecretInput'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

interface BearerAuthProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied?: boolean
  appliedValue?: AppliedAuthValue
}

export function BearerAuth({ scheme, onApply, onRemove, applied, appliedValue }: BearerAuthProps) {
  const [token, setToken] = useState(appliedValue?.input?.token ?? '')

  const handleApply = () => {
    if (!token.trim()) return
    onApply({
      schemeId: scheme.id,
      headerName: 'Authorization',
      headerValue: `Bearer ${token}`,
      input: { token },
    })
  }

  const handleRemove = () => {
    // Clearing the input on remove keeps the field in sync with the removed auth.
    setToken('')
    onRemove(scheme.id)
  }

  return (
    <div className={authStyles.section}>
      <div className={authStyles.label}>
        {scheme.displayName}
        <span className={authStyles.hint}>(Bearer Token)</span>
      </div>
      {scheme.description && (
        <MarkdownRenderer content={scheme.description} className={authStyles.description} />
      )}
      <div className={authStyles.inputRow}>
        <SecretInput
          value={token}
          onChange={setToken}
          placeholder="Enter bearer token"
          className={authStyles.input}
          aria-label={`${scheme.displayName} bearer token`}
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
