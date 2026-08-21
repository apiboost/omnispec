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
 * Centralized breakpoints for responsive styling.
 *
 * Usage:
 *   import { mq } from '@core/styles/breakpoints'
 *
 *   const style = css({
 *     padding: '1.5rem',
 *     [mq.mobile]: {
 *       padding: '0.75rem',
 *     },
 *   })
 */

const breakpoints = {
  mobile: 1024,
} as const

export const mq = {
  /** max-width: 1023px — targets mobile / small screens */
  mobile: `@media (max-width: ${breakpoints.mobile - 1}px)`,
  /** min-width: 1024px — targets desktop / large screens */
  desktop: `@media (min-width: ${breakpoints.mobile}px)`,
} as const

export { breakpoints }
