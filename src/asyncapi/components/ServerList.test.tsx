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
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { ServerList } from './ServerList'
import type { AsyncApiServer } from '../types/asyncapi.types'

afterEach(cleanup)

describe('ServerList server selector', () => {
  const servers: AsyncApiServer[] = [
    { name: 'production', url: 'mqtts://prod.example.com', protocol: 'mqtt' },
    { name: 'staging', url: 'mqtt://staging.example.com', protocol: 'mqtt' },
  ]

  it('offers a selector and shows one server at a time when there are multiple servers', () => {
    render(<ServerList servers={servers} />)
    const tablist = screen.getByRole('tablist')
    expect(within(tablist).getByRole('tab', { name: /production/i })).toBeInTheDocument()
    expect(within(tablist).getByRole('tab', { name: /staging/i })).toBeInTheDocument()

    // Default shows the first server only.
    expect(screen.getByText('mqtts://prod.example.com')).toBeInTheDocument()
    expect(screen.queryByText('mqtt://staging.example.com')).toBeNull()

    // Selecting staging swaps the visible card.
    fireEvent.click(within(tablist).getByRole('tab', { name: /staging/i }))
    expect(screen.getByText('mqtt://staging.example.com')).toBeInTheDocument()
    expect(screen.queryByText('mqtts://prod.example.com')).toBeNull()
  })

  it('renders a single server without a selector', () => {
    render(<ServerList servers={[servers[0]]} />)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('mqtts://prod.example.com')).toBeInTheDocument()
  })
})

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

  it('highlights server variable placeholders and lists variable enums', () => {
    const servers: AsyncApiServer[] = [
      {
        name: 'production',
        url: '{scheme}://broker.example.com:{port}',
        protocol: 'mqtt',
        variables: {
          scheme: { default: 'mqtts', enum: ['mqtt', 'mqtts'], description: 'Connection scheme' },
          port: { default: '8883' },
        },
      },
    ]
    render(<ServerList servers={servers} />)
    // Placeholder names are surfaced as distinct highlighted tokens.
    expect(screen.getAllByText('scheme').length).toBeGreaterThan(0)
    // The variable enum is listed.
    expect(screen.getByText(/mqtt \| mqtts/)).toBeInTheDocument()
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
