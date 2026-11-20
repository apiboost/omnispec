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
  it('renders known protocol binding fields with verbatim labels and values', () => {
    render(
      <BindingsSection
        bindings={{ kafka: { topic: 'orders', partitions: 3, bindingVersion: '0.4.0' } }}
      />,
    )
    expect(screen.getByText('KAFKA')).toBeInTheDocument()
    // Binding keys are shown verbatim (as written in the spec).
    expect(screen.getByText('topic')).toBeInTheDocument()
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('partitions')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    // Housekeeping keys are not shown as data rows.
    expect(screen.queryByText('bindingVersion')).toBeNull()
  })

  it('renders an unknown protocol gracefully instead of crashing', () => {
    render(<BindingsSection bindings={{ myproto: { customField: 'value-x' } }} />)
    expect(screen.getByText('MYPROTO')).toBeInTheDocument()
    expect(screen.getByText('customField')).toBeInTheDocument()
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

  it('renders a Kafka topicConfiguration object as nested rows, not raw JSON', () => {
    render(
      <BindingsSection
        bindings={{
          kafka: {
            topic: 'orders',
            topicConfiguration: {
              cleanupPolicy: 'delete',
              retentionMs: 604800000,
            },
            bindingVersion: '0.4.0',
          },
        }}
      />,
    )
    expect(screen.getByText('topicConfiguration')).toBeInTheDocument()
    expect(screen.getByText('cleanupPolicy')).toBeInTheDocument()
    expect(screen.getByText('delete')).toBeInTheDocument()
    expect(screen.queryByText(/\{"cleanupPolicy"/)).toBeNull()
  })

  it('renders a WebSocket query JSON schema as a schema table', () => {
    render(
      <BindingsSection
        bindings={{
          ws: {
            method: 'GET',
            query: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'Auth token' },
              },
            },
          },
        }}
      />,
    )
    expect(screen.getByText('query')).toBeInTheDocument()
    expect(screen.getByText('token')).toBeInTheDocument()
    expect(screen.getByText('Auth token')).toBeInTheDocument()
  })

  it('renders AMQP cc array as comma-separated values', () => {
    render(
      <BindingsSection
        bindings={{ amqp: { cc: ['orders.audit'], bcc: ['orders.log', 'orders.err'] } }}
      />,
    )
    expect(screen.getByText('orders.audit')).toBeInTheDocument()
    expect(screen.getByText('orders.log, orders.err')).toBeInTheDocument()
  })

  it('keeps x- extension field labels literal', () => {
    render(
      <BindingsSection bindings={{ ws: { 'x-subprotocol': 'graphql-ws' } }} />,
    )
    expect(screen.getByText('x-subprotocol')).toBeInTheDocument()
    expect(screen.queryByText('X subprotocol')).toBeNull()
  })

  it('shows binding field keys verbatim — acronyms and casing are not mangled', () => {
    render(
      <BindingsSection
        bindings={{
          kafka: {
            clientId: 'orders-service',
            schemaRegistryUrl: 'https://registry.example.com',
          },
        }}
      />,
    )
    // Verbatim keys — not "Client Id" / "Schema Registry Url".
    expect(screen.getByText('clientId')).toBeInTheDocument()
    expect(screen.getByText('schemaRegistryUrl')).toBeInTheDocument()
    expect(screen.queryByText('Client Id')).toBeNull()
    expect(screen.queryByText('Schema Registry Url')).toBeNull()
  })

  it('shows nested topicConfiguration keys verbatim (dotted keys unchanged)', () => {
    render(
      <BindingsSection
        bindings={{
          kafka: {
            topicConfiguration: {
              'cleanup.policy': 'delete',
              'retention.ms': 604800000,
            },
          },
        }}
      />,
    )
    // Parent and nested keys verbatim — not "Cleanup.policy" / "Retention.ms".
    expect(screen.getByText('topicConfiguration')).toBeInTheDocument()
    expect(screen.getByText('cleanup.policy')).toBeInTheDocument()
    expect(screen.getByText('retention.ms')).toBeInTheDocument()
    expect(screen.queryByText('Cleanup.policy')).toBeNull()
    expect(screen.queryByText('Retention.ms')).toBeNull()
  })

  it('shows a single fixed/allowed value as just that value, not "type + Allowed: [value]"', () => {
    render(
      <BindingsSection
        bindings={{
          kafka: {
            groupId: { type: 'string', enum: ['orders-consumer'] },
          },
        }}
      />,
    )
    // The single allowed value is shown directly.
    expect(screen.getByText('orders-consumer')).toBeInTheDocument()
    // No "Allowed:" affordance for a single fixed value.
    expect(screen.queryByText(/allowed/i)).toBeNull()
  })
})
