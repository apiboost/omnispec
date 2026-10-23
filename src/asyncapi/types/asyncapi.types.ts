/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export interface AsyncApiExternalDocs {
  description?: string
  url: string
}

/**
 * A tag as carried on a channel, operation, or message. Unlike the richer
 * document-root tag (which also has `displayName`), these carry the tag's own
 * `description` and `externalDocs` so a tag chip can surface its docs link.
 */
export interface AsyncApiTag {
  name: string
  description?: string
  externalDocs?: AsyncApiExternalDocs
}

export interface AsyncApiSecurityRequirement {
  name: string
  scopes: string[]
}

export interface ParsedAsyncApiSpec {
  title: string
  description?: string
  version: string
  specVersion: string
  servers: AsyncApiServer[]
  channels: AsyncApiChannel[]
  components: AsyncApiComponents
  tags?: Array<{ name: string; description?: string; displayName?: string; externalDocs?: AsyncApiExternalDocs }>
  tagGroups?: Array<{ name: string; tags: string[] }>
  externalDocs?: AsyncApiExternalDocs
  contact?: { name?: string; url?: string; email?: string }
  license?: { name: string; url?: string }
  termsOfService?: string
  logo?: { url: string; backgroundColor?: string; altText?: string; href?: string }
  /** Document-root `defaultContentType`, inherited by messages without their own. */
  defaultContentType?: string
}

export interface AsyncApiServer {
  name: string
  url: string
  protocol: string
  protocolVersion?: string
  description?: string
  variables?: Record<string, { default?: string; description?: string; enum?: string[] }>
  security?: Record<string, string[]>[]
  /** Names of security schemes referenced by this server. */
  securityNames?: string[]
  /**
   * Full security requirements with per-requirement scopes. Outer array = OR
   * alternatives; inner array = AND within an alternative.
   */
  securityRequirements?: AsyncApiSecurityRequirement[][]
  bindings?: Record<string, unknown>
}

export interface AsyncApiChannel {
  name: string
  address: string
  description?: string
  operations: AsyncApiOperation[]
  parameters?: Record<string, AsyncApiChannelParameter>
  bindings?: Record<string, unknown>
  externalDocs?: AsyncApiExternalDocs
  tags?: AsyncApiTag[]
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
  title?: string
  summary?: string
  description?: string
  /**
   * All messages an operation can carry. In 2.x this is the `message.oneOf`
   * list (or a single message); in 3.x it is the resolved `messages` array.
   * `message` is retained as an alias for `messages[0]`.
   */
  messages: AsyncApiMessage[]
  message?: AsyncApiMessage
  tags?: AsyncApiTag[]
  bindings?: Record<string, unknown>
  externalDocs?: AsyncApiExternalDocs
  /** Names of security schemes required by this operation (OR semantics). */
  securityNames?: string[]
  /**
   * Full security requirements with per-requirement scopes. Outer array = OR
   * alternatives; inner array = AND within an alternative.
   */
  securityRequirements?: AsyncApiSecurityRequirement[][]
  /** AsyncAPI 3.x request-reply: the message(s) sent back in response. */
  reply?: {
    messages: AsyncApiMessage[]
    /**
     * The reply address. `location` is a runtime expression (dynamic address);
     * `value` is a fixed literal address (`reply.address` given as a plain
     * string). Either may be present.
     */
    address?: { location?: string; value?: string; description?: string }
    channelName?: string
  }
  xBadges?: Array<{ name: string; color?: string; position?: 'before' | 'after' }>
  xInternal?: boolean
}

export interface AsyncApiMessage {
  name?: string
  title?: string
  summary?: string
  description?: string
  contentType?: string
  schemaFormat?: string
  payload?: Record<string, unknown>
  headers?: Record<string, unknown>
  correlationId?: { description?: string; location: string }
  tags?: AsyncApiTag[]
  examples?: Array<{ name?: string; summary?: string; payload?: unknown; headers?: unknown }>
  bindings?: Record<string, unknown>
  externalDocs?: AsyncApiExternalDocs
  /** True when `contentType` was inherited from the document default, not declared. */
  contentTypeInherited?: boolean
  /**
   * Identifiers of the message traits applied to this message, in applied order
   * (a trait's `name`/`title`, or the `$ref` target name). Empty/absent when the
   * message uses no traits.
   */
  appliedTraits?: string[]
}

export interface AsyncApiOAuthFlow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  availableScopes?: Record<string, string>
  scopes?: Record<string, string>
}

export interface AsyncApiSecurityScheme {
  type: string
  description?: string
  name?: string
  in?: string
  scheme?: string
  bearerFormat?: string
  openIdConnectUrl?: string
  flows?: Record<string, AsyncApiOAuthFlow>
  [key: string]: unknown
}

export interface AsyncApiComponents {
  schemas: Record<string, Record<string, unknown>>
  messages: Record<string, AsyncApiMessage>
  securitySchemes: Record<string, AsyncApiSecurityScheme>
}
