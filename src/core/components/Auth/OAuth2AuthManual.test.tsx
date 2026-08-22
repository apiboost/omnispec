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
import { OAuth2AuthManual } from '@core/components/Auth/OAuth2AuthManual'
import type { AuthScheme } from '@core/types/auth.types'

const scheme: AuthScheme = {
  id: 'OAuth2',
  type: 'oauth2',
  displayName: 'OAuth2',
  flows: {
    authorizationCode: {
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: {
        read: 'Read access',
        write: 'Write access',
      },
    },
    clientCredentials: {
      tokenUrl: 'https://auth.example.com/cc-token',
      scopes: {
        admin: 'Admin access',
      },
    },
  },
}

describe('OAuth2AuthManual', () => {
  afterEach(cleanup)

  it('renders read-only flow details and a manual token input without interactive controls', () => {
    render(<OAuth2AuthManual scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} applied={false} />)

    // Read-only flow details for the first flow.
    expect(screen.getByText('https://auth.example.com/authorize')).toBeTruthy()
    expect(screen.getByText('https://auth.example.com/token')).toBeTruthy()
    expect(screen.getByText('read')).toBeTruthy()
    expect(screen.getByText('write')).toBeTruthy()

    // Flow selector tabs for the two flows.
    expect(screen.getByRole('button', { name: /authorization code/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /client credentials/i })).toBeTruthy()

    // Manual token input is present.
    expect(screen.getByLabelText('OAuth2 access token')).toBeTruthy()

    // No interactive parts.
    expect(screen.queryByText(/get token/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/client id/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/client secret/i)).toBeNull()
  })

  it('applies a pasted token as a Bearer credential', () => {
    const onApply = vi.fn()
    render(<OAuth2AuthManual scheme={scheme} onApply={onApply} onRemove={vi.fn()} applied={false} />)

    const field = screen.getByLabelText('OAuth2 access token') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'tok-123' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onApply).toHaveBeenCalledWith({
      schemeId: 'OAuth2',
      headerName: 'Authorization',
      headerValue: 'Bearer tok-123',
      input: { token: 'tok-123' },
    })
  })
})
