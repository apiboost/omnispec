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
 * Re-export of @emotion/styled.
 *
 * All internal imports should use this module instead of importing
 * `@emotion/styled` directly, so that the dependency is centralized. The
 * indirection keeps style injection re-pointable (notably for the Shadow-DOM
 * Web Component wrapper), mirroring `@core/styles/css`.
 */

export { default as styled } from '@emotion/styled'

/**
 * The object-syntax CSS type accepted by `styled(...)` / `css(...)`. Re-exported
 * here so variant-style maps can be typed without importing `@emotion/*`
 * directly, keeping the emotion dependency centralized.
 */
export type { CSSObject } from '@emotion/styled'
