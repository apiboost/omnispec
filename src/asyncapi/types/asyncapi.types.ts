/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export interface ParsedAsyncApiSpec {
  title: string
  description?: string
  version: string
  specVersion: string
  servers: AsyncApiServer[]
  channels: AsyncApiChannel[]
  components: AsyncApiComponents
  tags?: Array<{ name: string; description?: string; displayName?: string; externalDocs?: { description?: string; url: string } }>
  tagGroups?: Array<{ name: string; tags: string[] }>
  externalDocs?: { description?: string; url: string }
  contact?: { name?: string; url?: string; email?: string }
  license?: { name: string; url?: string }
  termsOfService?: string
  logo?: { url: string; backgroundColor?: string; altText?: string; href?: string }
}

export interface AsyncApiServer {
  name: string
  url: string
  protocol: string
  protocolVersion?: string
  description?: string
  variables?: Record<string, { default?: string; description?: string; enum?: string[] }>
  security?: Record<string, string[]>[]
}

export interface AsyncApiChannel {
  name: string
  address: string
  description?: string
  operations: AsyncApiOperation[]
  parameters?: Record<string, AsyncApiChannelParameter>
  bindings?: Record<string, unknown>
  xInternal?: boolean
}

export interface AsyncApiChannelParameter {
  description?: string
  schema?: Record<string, unknown>
  location?: string
}

export interface AsyncApiOperation {
  action: 'send' | 'receive' | 'publish' | 'subscribe'
  operationId?: string
  summary?: string
  description?: string
  message?: AsyncApiMessage
  tags?: Array<{ name: string; description?: string }>
  bindings?: Record<string, unknown>
  xBadges?: Array<{ name: string; color?: string; position?: 'before' | 'after' }>
  xInternal?: boolean
}

export interface AsyncApiMessage {
  name?: string
  title?: string
  summary?: string
  description?: string
  contentType?: string
  payload?: Record<string, unknown>
  headers?: Record<string, unknown>
  correlationId?: { description?: string; location: string }
  tags?: Array<{ name: string; description?: string }>
  examples?: Array<{ name?: string; summary?: string; payload?: unknown; headers?: unknown }>
  bindings?: Record<string, unknown>
}

export interface AsyncApiComponents {
  schemas: Record<string, Record<string, unknown>>
  messages: Record<string, AsyncApiMessage>
}
