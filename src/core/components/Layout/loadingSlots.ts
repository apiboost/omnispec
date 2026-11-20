/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { SlotOverrides } from '../../types/theme.types'

/**
 * Slots for a loading state: the mobile trail shows `loadingBreadcrumbs` when
 * the host provides it (see SlotOverrides), otherwise the usual `breadcrumbs`.
 */
export function loadingSlots(slots: SlotOverrides = {}): SlotOverrides {
  return slots.loadingBreadcrumbs ? { ...slots, breadcrumbs: slots.loadingBreadcrumbs } : slots
}
