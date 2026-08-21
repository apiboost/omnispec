/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ApiKeyAuth } from '@core/components/Auth/ApiKeyAuth'
import type { AuthScheme, AppliedAuthValue } from '@core/types/auth.types'

const scheme: AuthScheme = {
  id: 'ApiKeyAuth',
  type: 'apiKey',
  displayName: 'ApiKeyAuth',
  in: 'header',
  name: 'X-API-Key',
}

describe('ApiKeyAuth', () => {
  afterEach(cleanup)

  it('clears the key field when Remove is clicked', () => {
    const onRemove = vi.fn()
    const appliedValue: AppliedAuthValue = {
      schemeId: 'ApiKeyAuth',
      headerName: 'X-API-Key',
      headerValue: 'secret-key',
      input: { value: 'secret-key' },
    }
    render(<ApiKeyAuth scheme={scheme} onApply={vi.fn()} onRemove={onRemove} applied appliedValue={appliedValue} />)

    const field = screen.getByLabelText('ApiKeyAuth value') as HTMLInputElement
    expect(field.value).toBe('secret-key')

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemove).toHaveBeenCalledWith('ApiKeyAuth')
    expect(field.value).toBe('')
  })
})
