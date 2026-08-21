/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { AuthScheme } from '../../core/types/auth.types'

export interface ParsedOpenApiSpec {
  title: string
  description?: string
  version: string
  specVersion: string
  servers: OpenApiServer[]
  tags: OpenApiTag[]
  tagGroups?: Array<{ name: string; tags: string[] }>
  securitySchemes: AuthScheme[]
  components: OpenApiComponents
  externalDocs?: { description?: string; url: string }
  contact?: { name?: string; url?: string; email?: string }
  license?: { name: string; url?: string }
  termsOfService?: string
  logo?: { url: string; backgroundColor?: string; altText?: string; href?: string }
  /** OpenAPI 3.1 top-level webhooks, normalized to operations. */
  webhooks?: OpenApiOperation[]
}

export interface OpenApiServer {
  url: string
  description?: string
  variables?: Record<string, OpenApiServerVariable>
}

export interface OpenApiServerVariable {
  default: string
  description?: string
  enum?: string[]
}

export interface OpenApiTag {
  name: string
  displayName?: string
  description?: string
  externalDocs?: { description?: string; url: string }
  operations: OpenApiOperation[]
}

export interface OpenApiOperation {
  operationId?: string
  summary?: string
  description?: string
  method: string
  path: string
  tags: string[]
  deprecated?: boolean
  parameters: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
  responses: OpenApiResponse[]
  security?: string[][]
  callbacks?: Record<string, unknown>
  externalDocs?: { description?: string; url: string }
  xCodeSamples?: Array<{ lang: string; label?: string; source: string }>
  xBadges?: Array<{ name: string; color?: string; position?: 'before' | 'after' }>
  xInternal?: boolean
}

export interface OpenApiParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  description?: string
  deprecated?: boolean
  schema?: Record<string, unknown>
  example?: unknown
  examples?: Record<string, { summary?: string; value: unknown }>
  style?: string
  explode?: boolean
}

export interface OpenApiRequestBody {
  description?: string
  required?: boolean
  content: Record<string, OpenApiMediaType>
}

export interface OpenApiMediaType {
  schema?: Record<string, unknown>
  example?: unknown
  examples?: Record<string, { summary?: string; value: unknown }>
}

export interface OpenApiResponse {
  statusCode: string
  description: string
  content?: Record<string, OpenApiMediaType>
  headers?: Record<string, { description?: string; schema?: Record<string, unknown> }>
}

export interface OpenApiComponents {
  schemas: Record<string, Record<string, unknown>>
  responses?: Record<string, unknown>
  parameters?: Record<string, unknown>
  requestBodies?: Record<string, unknown>
}
