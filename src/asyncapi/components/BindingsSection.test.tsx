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
import { BindingsSection } from './BindingsSection'

afterEach(cleanup)

describe('BindingsSection', () => {
  it('renders known protocol binding fields with humanized labels and values', () => {
    render(
      <BindingsSection
        bindings={{ kafka: { topic: 'orders', partitions: 3, bindingVersion: '0.4.0' } }}
      />,
    )
    expect(screen.getByText('KAFKA')).toBeInTheDocument()
    expect(screen.getByText('Topic')).toBeInTheDocument()
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('Partitions')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    // Housekeeping keys are not shown as data rows.
    expect(screen.queryByText('Binding Version')).toBeNull()
  })

  it('renders an unknown protocol gracefully instead of crashing', () => {
    render(<BindingsSection bindings={{ myproto: { customField: 'value-x' } }} />)
    expect(screen.getByText('MYPROTO')).toBeInTheDocument()
    expect(screen.getByText('Custom Field')).toBeInTheDocument()
    expect(screen.getByText('value-x')).toBeInTheDocument()
  })

  it('renders nothing when there are no bindings', () => {
    const { container } = render(<BindingsSection bindings={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders all protocols when several bindings coexist', () => {
    render(
      <BindingsSection
        bindings={{ mqtt: { qos: 1 }, ws: { method: 'GET' } }}
      />,
    )
    expect(screen.getByText('MQTT')).toBeInTheDocument()
    expect(screen.getByText('WS')).toBeInTheDocument()
    expect(screen.getByText('GET')).toBeInTheDocument()
  })
})
