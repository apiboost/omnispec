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
import { ServerList } from './ServerList'
import type { AsyncApiServer } from '../types/asyncapi.types'

afterEach(cleanup)

describe('ServerList', () => {
  it('renders server-level protocol bindings', () => {
    const servers: AsyncApiServer[] = [
      {
        name: 'production',
        url: 'mqtt://broker.example.com',
        protocol: 'mqtt',
        bindings: { mqtt: { clientId: 'guest', cleanSession: true } },
      },
    ]
    render(<ServerList servers={servers} />)
    expect(screen.getByText('Client Id')).toBeInTheDocument()
    expect(screen.getByText('guest')).toBeInTheDocument()
    expect(screen.getByText('Clean Session')).toBeInTheDocument()
  })

  it('renders server security scheme references', () => {
    const servers: AsyncApiServer[] = [
      {
        name: 'production',
        url: 'mqtt://broker.example.com',
        protocol: 'mqtt',
        securityNames: ['userPass'],
      },
    ]
    render(<ServerList servers={servers} />)
    expect(screen.getByText('userPass')).toBeInTheDocument()
  })
})
