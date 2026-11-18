/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * SSRF address classification for the proxy. The implementation lives in the
 * isomorphic core module so browser code (the `$ref` guard) can share it
 * without pulling in Node built-ins; this file re-exports it so server code
 * and the public `@apiboost/omnispec/server` exports keep one source of truth.
 */
export { isBlockedAddress, isPrivateIp, normalizeHostname } from '../core/utils/ip-classify'
