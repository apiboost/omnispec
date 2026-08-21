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
import { detectSpecType } from './detect-spec'
import { SpecType } from '../types/spec-detection.types'

describe('detectSpecType', () => {
  describe('OpenAPI detection', () => {
    it('detects Swagger 2.0 from JSON object', () => {
      const result = detectSpecType({ swagger: '2.0', info: { title: 'Test' } })
      expect(result).toEqual({
        type: SpecType.OPENAPI_2,
        confidence: 'high',
        version: '2.0',
      })
    })

    it('detects OpenAPI 3.0 from JSON object', () => {
      const result = detectSpecType({ openapi: '3.0.3', info: { title: 'Test' } })
      expect(result).toEqual({
        type: SpecType.OPENAPI_3,
        confidence: 'high',
        version: '3.0.3',
      })
    })

    it('detects OpenAPI 3.0 from JSON string', () => {
      const json = JSON.stringify({ openapi: '3.0.1', info: { title: 'Test' } })
      const result = detectSpecType(json)
      expect(result?.type).toBe(SpecType.OPENAPI_3)
    })

    it('detects Swagger 2.0 from YAML string', () => {
      const yaml = 'swagger: "2.0"\ninfo:\n  title: Test API\n  version: "1.0"'
      const result = detectSpecType(yaml)
      expect(result?.type).toBe(SpecType.OPENAPI_2)
    })

    it('detects OpenAPI 3.0 from YAML string', () => {
      const yaml = 'openapi: 3.0.2\ninfo:\n  title: Test API'
      const result = detectSpecType(yaml)
      expect(result?.type).toBe(SpecType.OPENAPI_3)
    })
  })

  describe('AsyncAPI detection', () => {
    it('detects AsyncAPI 2.x from JSON object', () => {
      const result = detectSpecType({ asyncapi: '2.6.0', info: { title: 'Test' } })
      expect(result).toEqual({
        type: SpecType.ASYNCAPI_2,
        confidence: 'high',
        version: '2.6.0',
      })
    })

    it('detects AsyncAPI 3.x from JSON object', () => {
      const result = detectSpecType({ asyncapi: '3.0.0', info: { title: 'Test' } })
      expect(result).toEqual({
        type: SpecType.ASYNCAPI_3,
        confidence: 'high',
        version: '3.0.0',
      })
    })

    it('detects AsyncAPI from YAML string', () => {
      const yaml = 'asyncapi: 2.5.0\ninfo:\n  title: Events'
      const result = detectSpecType(yaml)
      expect(result?.type).toBe(SpecType.ASYNCAPI_2)
    })
  })

  describe('GraphQL detection', () => {
    it('detects GraphQL introspection result', () => {
      const result = detectSpecType({ __schema: { types: [] } })
      expect(result?.type).toBe(SpecType.GRAPHQL_INTROSPECTION)
    })

    it('detects GraphQL introspection wrapped in data', () => {
      const result = detectSpecType({ data: { __schema: { types: [] } } })
      expect(result?.type).toBe(SpecType.GRAPHQL_INTROSPECTION)
    })

    it('detects GraphQL SDL', () => {
      const sdl = `
        type Query {
          users: [User]
        }
        type User {
          id: ID!
          name: String
        }
      `
      const result = detectSpecType(sdl)
      expect(result?.type).toBe(SpecType.GRAPHQL_SDL)
    })
  })

  describe('SOAP/WSDL detection', () => {
    it('detects WSDL 1.1 from XML', () => {
      const xml = '<?xml version="1.0"?><definitions xmlns="http://schemas.xmlsoap.org/wsdl/"></definitions>'
      const result = detectSpecType(xml)
      expect(result?.type).toBe(SpecType.SOAP_WSDL)
    })

    it('detects WSDL with namespace prefix', () => {
      const xml = '<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"></wsdl:definitions>'
      const result = detectSpecType(xml)
      expect(result?.type).toBe(SpecType.SOAP_WSDL)
    })
  })

  describe('edge cases', () => {
    it('returns null for unrecognized content', () => {
      const result = detectSpecType('just some random text')
      expect(result).toBeNull()
    })

    it('returns null for empty object', () => {
      const result = detectSpecType({})
      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = detectSpecType('')
      expect(result).toBeNull()
    })
  })
})
