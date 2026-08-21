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
import { detectSpecType } from '../core/utils/detect-spec'
import { SpecType } from '../core/types/spec-detection.types'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const petstoreJson = JSON.parse(
  readFileSync(resolve(__dirname, '../__fixtures__/petstore-minimal.json'), 'utf-8'),
)
const streetlightsYaml = readFileSync(
  resolve(__dirname, '../__fixtures__/streetlights-asyncapi.yaml'), 'utf-8',
)
const starWarsSDL = readFileSync(
  resolve(__dirname, '../__fixtures__/starwars.graphql'), 'utf-8',
)
const greeterProto = readFileSync(
  resolve(__dirname, '../__fixtures__/greeter.proto'), 'utf-8',
)

describe('OmniSpecRenderer auto-detection integration', () => {
  it('detects OpenAPI 3.0 from JSON object', () => {
    const result = detectSpecType(petstoreJson)
    expect(result?.type).toBe(SpecType.OPENAPI_3)
    expect(result?.confidence).toBe('high')
  })

  it('detects AsyncAPI from YAML string', () => {
    const result = detectSpecType(streetlightsYaml)
    expect(result?.type).toBe(SpecType.ASYNCAPI_2)
    expect(result?.confidence).toBe('high')
  })

  it('detects GraphQL SDL from string', () => {
    const result = detectSpecType(starWarsSDL)
    expect(result?.type).toBe(SpecType.GRAPHQL_SDL)
  })

  it('detects WSDL from XML', () => {
    const wsdl = '<?xml version="1.0"?><definitions xmlns="http://schemas.xmlsoap.org/wsdl/"></definitions>'
    const result = detectSpecType(wsdl)
    expect(result?.type).toBe(SpecType.SOAP_WSDL)
  })

  it('detects Protocol Buffers from proto string', () => {
    const result = detectSpecType(greeterProto)
    expect(result?.type).toBe(SpecType.GRPC_PROTO)
    expect(result?.confidence).toBe('high')
  })

  it('returns null for unknown content', () => {
    const result = detectSpecType('hello world this is not a spec')
    expect(result).toBeNull()
  })
})
