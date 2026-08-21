/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { SpecType } from '../types/spec-detection.types'
import type { SpecDetectionResult } from '../types/spec-detection.types'

export function detectSpecType(content: string | Record<string, unknown>): SpecDetectionResult | null {
  if (typeof content === 'object') {
    return detectFromObject(content)
  }

  const trimmed = content.trim()

  // Try JSON parse
  try {
    const parsed = JSON.parse(trimmed)
    return detectFromObject(parsed)
  } catch {
    // Not JSON
  }

  // Try YAML detection (look for top-level keys without braces)
  const yamlResult = detectFromYamlString(trimmed)
  if (yamlResult) return yamlResult

  // Try XML detection (WSDL)
  if (trimmed.startsWith('<') || trimmed.startsWith('<?xml')) {
    return detectFromXml(trimmed)
  }

  // Try Protocol Buffers detection (before GraphQL — both use keyword matching)
  if (isProtoBuf(trimmed)) {
    return {
      type: SpecType.GRPC_PROTO,
      confidence: 'high',
    }
  }

  // Try GraphQL SDL detection
  if (isGraphQLSDL(trimmed)) {
    return {
      type: SpecType.GRAPHQL_SDL,
      confidence: 'medium',
    }
  }

  return null
}

function detectFromObject(obj: Record<string, unknown>): SpecDetectionResult | null {
  // OpenAPI 2.x (Swagger)
  if ('swagger' in obj && typeof obj.swagger === 'string') {
    return {
      type: SpecType.OPENAPI_2,
      confidence: 'high',
      version: obj.swagger as string,
    }
  }

  // OpenAPI 3.x
  if ('openapi' in obj && typeof obj.openapi === 'string') {
    return {
      type: SpecType.OPENAPI_3,
      confidence: 'high',
      version: obj.openapi as string,
    }
  }

  // AsyncAPI
  if ('asyncapi' in obj && typeof obj.asyncapi === 'string') {
    const version = obj.asyncapi as string
    const major = parseInt(version.split('.')[0], 10)
    return {
      type: major >= 3 ? SpecType.ASYNCAPI_3 : SpecType.ASYNCAPI_2,
      confidence: 'high',
      version,
    }
  }

  // GraphQL introspection result
  if ('__schema' in obj || ('data' in obj && typeof obj.data === 'object' && obj.data !== null && '__schema' in (obj.data as Record<string, unknown>))) {
    return {
      type: SpecType.GRAPHQL_INTROSPECTION,
      confidence: 'high',
    }
  }

  return null
}

function detectFromYamlString(content: string): SpecDetectionResult | null {
  // Simple YAML key detection without a full parser
  const lines = content.split('\n').slice(0, 20)

  for (const line of lines) {
    const match = line.match(/^(\w+)\s*:\s*['"]?([^'"#\s]+)/)
    if (!match) continue

    const [, key, value] = match

    if (key === 'swagger') {
      return { type: SpecType.OPENAPI_2, confidence: 'high', version: value }
    }
    if (key === 'openapi') {
      return { type: SpecType.OPENAPI_3, confidence: 'high', version: value }
    }
    if (key === 'asyncapi') {
      const major = parseInt(value.split('.')[0], 10)
      return {
        type: major >= 3 ? SpecType.ASYNCAPI_3 : SpecType.ASYNCAPI_2,
        confidence: 'high',
        version: value,
      }
    }
  }

  return null
}

function detectFromXml(content: string): SpecDetectionResult | null {
  // WSDL 1.1: <definitions> or <wsdl:definitions>
  if (content.includes('<definitions') || content.includes('<wsdl:definitions')) {
    return { type: SpecType.SOAP_WSDL, confidence: 'high' }
  }
  // WSDL 2.0: <description>
  if (content.includes('<description') && content.includes('wsdl')) {
    return { type: SpecType.SOAP_WSDL, confidence: 'medium' }
  }
  return null
}

function isGraphQLSDL(content: string): boolean {
  const sdlPatterns = [
    /^\s*type\s+Query\s*\{/m,
    /^\s*schema\s*\{/m,
    /^\s*type\s+\w+\s*(implements\s+\w+)?\s*\{/m,
    /^\s*directive\s+@/m,
    /^\s*enum\s+\w+\s*\{/m,
    /^\s*input\s+\w+\s*\{/m,
    /^\s*interface\s+\w+\s*\{/m,
    /^\s*union\s+\w+\s*=/m,
  ]

  let matchCount = 0
  for (const pattern of sdlPatterns) {
    if (pattern.test(content)) matchCount++
  }

  return matchCount >= 2
}

function isProtoBuf(content: string): boolean {
  // Proto files have a distinctive syntax: "syntax = "proto3";" or service/rpc/message keywords
  if (/^\s*syntax\s*=\s*"proto[23]"\s*;/m.test(content)) return true
  // Fallback: must have both service+rpc and message keywords
  const hasServiceRpc = /\bservice\s+\w+\s*\{/.test(content) && /\brpc\s+\w+\s*\(/.test(content)
  const hasMessage = /\bmessage\s+\w+\s*\{/.test(content)
  return hasServiceRpc && hasMessage
}
