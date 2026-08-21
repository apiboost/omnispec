/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { createContext, useContext, useMemo } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type { SpecType } from '../types/spec-detection.types'
import type { BaseSpecProps } from '../types/common.types'

export interface RendererRegistryValue {
  renderers: Map<SpecType, ComponentType<BaseSpecProps>>
  premiumThemingEnabled: boolean
}

const defaultRegistry: RendererRegistryValue = {
  renderers: new Map(),
  premiumThemingEnabled: false,
}

const RendererRegistryContext = createContext<RendererRegistryValue>(defaultRegistry)

export function useRendererRegistry() {
  return useContext(RendererRegistryContext)
}

interface RendererRegistryProviderProps {
  value: Partial<RendererRegistryValue>
  children: ReactNode
}

export function RendererRegistryProvider({ value, children }: RendererRegistryProviderProps) {
  const merged = useMemo(
    (): RendererRegistryValue => ({ ...defaultRegistry, ...value }),
    [value],
  )
  return (
    <RendererRegistryContext.Provider value={merged}>
      {children}
    </RendererRegistryContext.Provider>
  )
}
