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
import { render, screen, cleanup } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('AsyncApiSpec unassigned operations (invalid documents)', () => {
  // An operation pointing at a channel that does not exist must surface under
  // the "Unassigned operations" group with a visible notice, never vanish.
  it('surfaces an operation referencing a missing channel with a notice', async () => {
    const spec = {
      asyncapi: '3.0.0',
      info: { title: 'Missing channel', version: '1.0.0' },
      channels: {
        lighting: { address: 'lighting', messages: { m: { name: 'M', payload: { type: 'object' } } } },
      },
      operations: {
        ghost: { action: 'send', channel: { $ref: '#/channels/doesNotExist' } },
      },
    }
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} defaultExpandOperations />)

    // The synthetic "Unassigned operations" group is present (card header), the
    // group reports its operation count, and an always-visible notice explains
    // the unresolved reference — the operation is surfaced, not silently dropped.
    expect((await screen.findAllByText('Unassigned operations')).length).toBeGreaterThan(0)
    expect(document.body.textContent).toMatch(/undefined channel/i)
    expect(document.body.textContent).toMatch(/unresolved reference/i)
    expect(screen.getByText('1 operation')).toBeInTheDocument()
  })

  // The zero-channels case: a document that defines NO channels at all but has
  // operations must still surface the operations, not show only "No channels".
  it('surfaces operations when the document defines zero channels', async () => {
    const spec = {
      asyncapi: '3.0.0',
      info: { title: 'Zero channels', version: '1.0.0' },
      operations: {
        ghost: { action: 'send', channel: { $ref: '#/channels/doesNotExist' } },
      },
    }
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} defaultExpandOperations />)

    // Even with zero channels, the operation surfaces under the Unassigned group
    // with the explanatory notice — and the misleading "No channels" empty state
    // must NOT be the only thing shown.
    expect((await screen.findAllByText('Unassigned operations')).length).toBeGreaterThan(0)
    expect(document.body.textContent).toMatch(/undefined channel/i)
    expect(screen.getByText('1 operation')).toBeInTheDocument()
    expect(screen.queryByText('No channels are defined for this API.')).not.toBeInTheDocument()
  })
})
