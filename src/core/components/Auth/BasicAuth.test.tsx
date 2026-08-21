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
import { BasicAuth } from '@core/components/Auth/BasicAuth'
import type { AuthScheme, AppliedAuthValue } from '@core/types/auth.types'

const scheme: AuthScheme = {
  id: 'BasicAuth',
  type: 'http-basic',
  displayName: 'BasicAuth',
}

describe('BasicAuth', () => {
  afterEach(cleanup)

  it('clears the username and password fields when Remove is clicked', () => {
    const onRemove = vi.fn()
    const appliedValue: AppliedAuthValue = {
      schemeId: 'BasicAuth',
      headerName: 'Authorization',
      headerValue: 'Basic dXNlcjpwYXNz',
      input: { username: 'user', password: 'pass' },
    }
    render(<BasicAuth scheme={scheme} onApply={vi.fn()} onRemove={onRemove} applied appliedValue={appliedValue} />)

    const username = screen.getByPlaceholderText('Username') as HTMLInputElement
    const password = screen.getByLabelText('BasicAuth password') as HTMLInputElement
    expect(username.value).toBe('user')
    expect(password.value).toBe('pass')

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemove).toHaveBeenCalledWith('BasicAuth')
    expect(username.value).toBe('')
    expect(password.value).toBe('')
  })
})
