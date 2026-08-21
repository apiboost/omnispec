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
 * Resolves the `downloadLink` prop into the concrete URL string the toolbar
 * download button should point at (or `undefined` to hide it).
 *
 * - `true`  → the spec URL, when `spec` is a URL string (object specs have no URL)
 * - string  → that URL, verbatim
 * - `false` / `undefined` → hidden
 *
 * Every spec renderer must use this so the Download button behaves identically
 * across OpenAPI, AsyncAPI, GraphQL, SOAP, and gRPC. Do not re-implement the
 * branching inline in a renderer.
 */
export function resolveDownloadLink(
  downloadLink: string | boolean | undefined,
  spec: string | Record<string, unknown>,
): string | undefined {
  if (downloadLink === true) {
    return typeof spec === 'string' ? spec : undefined
  }
  return typeof downloadLink === 'string' ? downloadLink : undefined
}
