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
import { BearerAuth } from '@core/components/Auth/BearerAuth'
import type { AuthScheme, AppliedAuthValue } from '@core/types/auth.types'

const scheme: AuthScheme = {
  id: 'BearerAuth',
  type: 'http-bearer',
  displayName: 'BearerAuth',
}

describe('BearerAuth', () => {
  afterEach(cleanup)

  it('clears the token field when Remove is clicked', () => {
    const onRemove = vi.fn()
    const appliedValue: AppliedAuthValue = {
      schemeId: 'BearerAuth',
      headerName: 'Authorization',
      headerValue: 'Bearer tok-123',
      input: { token: 'tok-123' },
    }
    render(<BearerAuth scheme={scheme} onApply={vi.fn()} onRemove={onRemove} applied appliedValue={appliedValue} />)

    const field = screen.getByLabelText('BearerAuth bearer token') as HTMLInputElement
    expect(field.value).toBe('tok-123')

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemove).toHaveBeenCalledWith('BearerAuth')
    expect(field.value).toBe('')
  })
})
