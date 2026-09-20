/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

const spec = {
  asyncapi: '2.6.0',
  info: { title: 'Nav modes', version: '1.0.0' },
  channels: {
    'user/signup': { subscribe: { operationId: 'onUserSignup', message: { name: 'M', payload: { type: 'object' } } } },
    'order/placed': { publish: { operationId: 'sendOrderPlaced', message: { name: 'O', payload: { type: 'object' } } } },
  },
}

describe('AsyncApiSpec sidebar grouping mode', () => {
  it('defaults to grouping by channel and can switch to grouping by operation', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} />)
    const nav = await screen.findByRole('navigation')

    // Default: channel addresses in the sidebar, operationIds not.
    expect(within(nav).getByText('user/signup')).toBeInTheDocument()
    expect(within(nav).queryByText('onUserSignup')).toBeNull()

    // Switch to grouping by operation.
    fireEvent.click(screen.getByRole('button', { name: /group by operation/i }))

    expect(within(nav).getByText('onUserSignup')).toBeInTheDocument()
    expect(within(nav).getByText('sendOrderPlaced')).toBeInTheDocument()
  })
})
