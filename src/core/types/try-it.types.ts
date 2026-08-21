/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export interface TryItRequest {
  url: string
  method: string
  headers: Record<string, string>
  queryParams: Record<string, string | string[]>
  pathParams: Record<string, string>
  body?: string | FormData
  bodyType?: string
}

export interface TryItResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  /** 'base64' for binary responses (body is base64-encoded bytes). Default 'utf-8'. */
  bodyEncoding?: 'utf-8' | 'base64'
  contentType: string
  duration: number
}

export interface ProxyRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  bodyEncoding?: 'utf-8' | 'base64'
  timeout?: number
}

export interface ProxyResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  bodyEncoding: 'utf-8' | 'base64'
  duration: number
}

export interface TryItConfig {
  proxyUrl?: string
  beforeRequest?: (req: TryItRequest) => TryItRequest | Promise<TryItRequest>
  afterResponse?: (res: TryItResponse) => void
}
