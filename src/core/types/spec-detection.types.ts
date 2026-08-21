/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export enum SpecType {
  OPENAPI_2 = 'openapi-2',
  OPENAPI_3 = 'openapi-3',
  ASYNCAPI_2 = 'asyncapi-2',
  ASYNCAPI_3 = 'asyncapi-3',
  SOAP_WSDL = 'soap-wsdl',
  GRAPHQL_SDL = 'graphql-sdl',
  GRAPHQL_INTROSPECTION = 'graphql-introspection',
  GRPC_PROTO = 'grpc-proto',
}

export interface SpecDetectionResult {
  type: SpecType
  confidence: 'high' | 'medium' | 'low'
  version?: string
}

export type ContentFormat = 'json' | 'yaml' | 'xml' | 'graphql-sdl' | 'graphql-introspection'
