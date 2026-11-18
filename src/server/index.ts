/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export { createProxyRouter } from './proxy-router'
export type { ProxyRouterOptions, ProxyAuditEntry } from './proxy-router'
export type { ProxyDnsLookup, ResolvedAddress } from './guarded-lookup'
export { isPrivateIp, isBlockedAddress } from './ssrf-guard'
