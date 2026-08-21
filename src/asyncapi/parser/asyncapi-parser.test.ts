/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseAsyncApiSpec } from './asyncapi-parser'

const streetlightsYaml = readFileSync(
  resolve(__dirname, '../../__fixtures__/streetlights-asyncapi.yaml'),
  'utf-8',
)

describe('parseAsyncApiSpec', () => {
  it('parses a valid AsyncAPI 2.6 spec', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(result.title).toBe('Streetlights Kafka API')
    expect(result.version).toBe('1.0.0')
    expect(result.specVersion).toBe('2.6.0')
  })

  it('extracts servers', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(result.servers).toHaveLength(2)
    expect(result.servers[0].name).toBe('production')
    expect(result.servers[0].protocol).toBe('kafka-secure')
    expect(result.servers[0].url).toBe('test.mykafkacluster.org:8092')
    expect(result.servers[1].name).toBe('staging')
  })

  it('extracts channels with operations', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(result.channels).toHaveLength(3)

    const measureChannel = result.channels[0]
    expect(measureChannel.name).toContain('lighting/measured')
    expect(measureChannel.operations).toHaveLength(1)
    expect(measureChannel.operations[0].action).toBe('subscribe')
    expect(measureChannel.operations[0].operationId).toBe('receiveLightMeasurement')
  })

  it('resolves message $refs', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    const measureOp = result.channels[0].operations[0]
    expect(measureOp.message).toBeDefined()
    expect(measureOp.message!.name).toBe('lightMeasured')
    expect(measureOp.message!.title).toBe('Light measured')
    expect(measureOp.message!.payload).toBeDefined()
  })

  it('resolves payload schema $refs', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    const payload = result.channels[0].operations[0].message?.payload
    expect(payload).toBeDefined()
    expect((payload as Record<string, unknown>).type).toBe('object')
    expect((payload as Record<string, Record<string, unknown>>).properties.lumens).toBeDefined()
  })

  it('extracts channel parameters', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    const params = result.channels[0].parameters
    expect(params).toBeDefined()
    expect(params!.streetlightId).toBeDefined()
    expect(params!.streetlightId.description).toBe('The ID of the streetlight.')
  })

  it('extracts component schemas', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(Object.keys(result.components.schemas)).toContain('lightMeasuredPayload')
    expect(Object.keys(result.components.schemas)).toContain('turnOnOffPayload')
    expect(Object.keys(result.components.schemas)).toContain('dimLightPayload')
  })

  it('extracts component messages', async () => {
    const result = await parseAsyncApiSpec(streetlightsYaml)

    expect(Object.keys(result.components.messages)).toContain('lightMeasured')
    expect(Object.keys(result.components.messages)).toContain('turnOnOff')
  })

  it('handles JSON string input', async () => {
    const jsonSpec = JSON.stringify({
      asyncapi: '2.6.0',
      info: { title: 'Test', version: '1.0.0' },
      channels: {},
    })
    const result = await parseAsyncApiSpec(jsonSpec)
    expect(result.title).toBe('Test')
  })
})
