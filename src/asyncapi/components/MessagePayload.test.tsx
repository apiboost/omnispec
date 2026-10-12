/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MessagePayload } from './MessagePayload'
import type { AsyncApiMessage } from '../types/asyncapi.types'

afterEach(cleanup)

function renderMessage(message: AsyncApiMessage) {
  return render(<MessagePayload message={message} idx="msg" />)
}

describe('MessagePayload', () => {
  it('renders the message-level externalDocs link', () => {
    renderMessage({
      name: 'UserSignedUp',
      externalDocs: { url: 'https://docs.example.com/user-signed-up', description: 'Message docs' },
      payload: { type: 'object', properties: { id: { type: 'string' } } },
    })
    const link = screen.getByRole('link', { name: /external docs/i })
    expect(link).toHaveAttribute('href', 'https://docs.example.com/user-signed-up')
  })

  it('renders message tags as chips', () => {
    renderMessage({
      name: 'UserSignedUp',
      tags: [{ name: 'user' }, { name: 'lifecycle' }],
      payload: { type: 'object', properties: { id: { type: 'string' } } },
    })
    expect(screen.getByText('user')).toBeInTheDocument()
    expect(screen.getByText('lifecycle')).toBeInTheDocument()
  })
})
