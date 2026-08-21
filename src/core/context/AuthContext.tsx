/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppliedAuthValue, AuthScheme } from '../types/auth.types'
import { useConfig } from './ConfigContext'

/**
 * Applied credentials persist to localStorage — but only when the integrator
 * opts in with a positive `tryItPersistTtl` (seconds). The stored envelope
 * carries a savedAt timestamp so entries expire once older than the TTL. When
 * no positive TTL is configured (undefined or 0) nothing is persisted:
 * credentials live in memory for the current page only, and any previously
 * stored entry is cleared. Entries are namespaced per spec so credentials never
 * bleed across different API docs sharing an origin.
 */
const AUTH_KEY_PREFIX = 'omnispec:auth'

interface AuthEnvelope {
  savedAt: number
  values: AppliedAuthValue[]
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    if (typeof window.localStorage.setItem !== 'function' || typeof window.localStorage.getItem !== 'function') {
      return null
    }
    return window.localStorage
  } catch {
    return null
  }
}

/** Persistence is opt-in: only a finite, positive TTL enables it. */
function persistEnabled(ttlSeconds?: number): boolean {
  return typeof ttlSeconds === 'number' && Number.isFinite(ttlSeconds) && ttlSeconds > 0
}

function authStorageKey(specKey: string): string {
  return `${AUTH_KEY_PREFIX}:${specKey}`
}

function loadPersistedAuth(specKey: string | undefined, ttlSeconds?: number): Map<string, AppliedAuthValue> {
  if (!specKey || !persistEnabled(ttlSeconds)) return new Map()
  const storage = getStorage()
  if (!storage) return new Map()
  const key = authStorageKey(specKey)
  try {
    const raw = storage.getItem(key)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as AuthEnvelope
    if (!parsed || typeof parsed.savedAt !== 'number' || !Array.isArray(parsed.values)) {
      storage.removeItem(key)
      return new Map()
    }
    if (Date.now() - parsed.savedAt > (ttlSeconds as number) * 1000) {
      storage.removeItem(key)
      return new Map()
    }
    return new Map(parsed.values.filter((v) => v && v.schemeId).map((v) => [v.schemeId, v]))
  } catch {
    return new Map()
  }
}

function persistAuth(auth: Map<string, AppliedAuthValue>, specKey: string | undefined, ttlSeconds?: number): void {
  if (!specKey) return
  const storage = getStorage()
  if (!storage) return
  const key = authStorageKey(specKey)
  try {
    // When persistence is disabled (or nothing is applied) clear any stale
    // entry so a previously-persisted credential can't linger.
    if (!persistEnabled(ttlSeconds) || auth.size === 0) {
      storage.removeItem(key)
      return
    }
    const envelope: AuthEnvelope = { savedAt: Date.now(), values: Array.from(auth.values()) }
    storage.setItem(key, JSON.stringify(envelope))
  } catch {
    // Best-effort — storage may be disabled or over quota.
  }
}

interface AuthContextValue {
  appliedAuth: Map<string, AppliedAuthValue>
  applyAuth: (value: AppliedAuthValue) => void
  removeAuth: (schemeId: string) => void
  clearAuth: () => void
  getAuthHeaders: () => Record<string, string>
  /** Security schemes available to the Authorize panel. */
  schemes: AuthScheme[]
  /** Whether any security schemes exist (drives the Authorize button). */
  hasAuth: boolean
  /** Whether the Authorize panel modal is open. */
  authPanelOpen: boolean
  openAuthPanel: () => void
  closeAuthPanel: () => void
}

const AuthContext = createContext<AuthContextValue>({
  appliedAuth: new Map(),
  applyAuth: () => {},
  removeAuth: () => {},
  clearAuth: () => {},
  getAuthHeaders: () => ({}),
  schemes: [],
  hasAuth: false,
  authPanelOpen: false,
  openAuthPanel: () => {},
  closeAuthPanel: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
  /** Security schemes surfaced by the Authorize panel. */
  schemes?: AuthScheme[]
}

export function AuthProvider({ children, schemes = [] }: AuthProviderProps) {
  const { specKey, tryItPersistTtl } = useConfig()
  const [appliedAuth, setAppliedAuth] = useState<Map<string, AppliedAuthValue>>(
    () => loadPersistedAuth(specKey, tryItPersistTtl),
  )
  const [authPanelOpen, setAuthPanelOpen] = useState(false)

  useEffect(() => {
    persistAuth(appliedAuth, specKey, tryItPersistTtl)
  }, [appliedAuth, specKey, tryItPersistTtl])

  const applyAuth = useCallback((value: AppliedAuthValue) => {
    setAppliedAuth((prev) => {
      const next = new Map(prev)
      next.set(value.schemeId, value)
      return next
    })
  }, [])

  const removeAuth = useCallback((schemeId: string) => {
    setAppliedAuth((prev) => {
      const next = new Map(prev)
      next.delete(schemeId)
      return next
    })
  }, [])

  const clearAuth = useCallback(() => {
    setAppliedAuth(new Map())
  }, [])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}
    for (const auth of appliedAuth.values()) {
      headers[auth.headerName] = auth.headerValue
    }
    return headers
  }, [appliedAuth])

  const openAuthPanel = useCallback(() => setAuthPanelOpen(true), [])
  const closeAuthPanel = useCallback(() => setAuthPanelOpen(false), [])

  const value = useMemo<AuthContextValue>(() => ({
    appliedAuth,
    applyAuth,
    removeAuth,
    clearAuth,
    getAuthHeaders,
    schemes,
    hasAuth: schemes.length > 0,
    authPanelOpen,
    openAuthPanel,
    closeAuthPanel,
  }), [appliedAuth, applyAuth, removeAuth, clearAuth, getAuthHeaders, schemes, authPanelOpen, openAuthPanel, closeAuthPanel])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
