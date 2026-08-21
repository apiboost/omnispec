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
 * Try-It input persistence.
 *
 * Non-sensitive form state (parameter values, request body, content type,
 * custom headers) is persisted to localStorage, namespaced per spec and
 * operation, so it survives navigation and reloads. Auth tokens are NOT
 * stored here — they live in sessionStorage only (see AuthContext).
 */

export interface PersistedTryItState {
  paramValues?: Record<string, string>
  body?: string
  contentType?: string
  /** Text-only form field values (files are never persisted). */
  formFields?: Record<string, string>
  /** Custom user-added headers. */
  customHeaders?: Array<{ name: string; value: string }>
}

const PREFIX = 'omnispec:tryit'

/** Storage envelope: state plus the epoch-ms timestamp it was saved at. */
interface PersistedEnvelope {
  savedAt: number
  state: PersistedTryItState
}

function storageKey(specKey: string, operationKey: string): string {
  return `${PREFIX}:${specKey}:${operationKey}`
}

function isEnvelope(value: unknown): value is PersistedEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PersistedEnvelope).savedAt === 'number' &&
    typeof (value as PersistedEnvelope).state === 'object' &&
    (value as PersistedEnvelope).state !== null
  )
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    // Validate the API surface — some environments expose a stub object.
    if (typeof window.localStorage.setItem !== 'function' || typeof window.localStorage.getItem !== 'function') {
      return null
    }
    return window.localStorage
  } catch {
    // Access can throw in sandboxed iframes / privacy modes.
    return null
  }
}

/**
 * Loads persisted Try-It state.
 *
 * `ttlSeconds` bounds the age of restored entries: entries older than the TTL
 * (and legacy entries with no timestamp, whose age is unknowable) are removed
 * and treated as absent. `0` disables persistence — nothing is restored.
 * `undefined` means no expiration.
 */
export function loadTryItState(
  specKey: string | undefined,
  operationKey: string,
  ttlSeconds?: number,
): PersistedTryItState | null {
  if (!specKey) return null
  if (ttlSeconds === 0) return null
  const storage = getStorage()
  if (!storage) return null
  const key = storageKey(specKey, operationKey)
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isEnvelope(parsed)) {
      if (ttlSeconds !== undefined && Date.now() - parsed.savedAt > ttlSeconds * 1000) {
        storage.removeItem(key)
        return null
      }
      return parsed.state
    }
    // Legacy bare-state entry (pre-envelope format, no timestamp).
    if (parsed && typeof parsed === 'object') {
      if (ttlSeconds !== undefined) {
        // Age unknown — with a TTL configured, err on the side of expiry.
        storage.removeItem(key)
        return null
      }
      return parsed as PersistedTryItState
    }
    return null
  } catch {
    return null
  }
}

export function saveTryItState(
  specKey: string | undefined,
  operationKey: string,
  state: PersistedTryItState,
): void {
  if (!specKey) return
  const storage = getStorage()
  if (!storage) return
  try {
    const envelope: PersistedEnvelope = { savedAt: Date.now(), state }
    storage.setItem(storageKey(specKey, operationKey), JSON.stringify(envelope))
  } catch {
    // Quota exceeded or storage disabled — persistence is best-effort.
  }
}

const PANEL_WIDTH_KEY = `${PREFIX}:panel-width`

/** Loads the persisted Try-It panel width in pixels (global, not per operation). */
export function loadPanelWidth(): number | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(PANEL_WIDTH_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** Persists the Try-It panel width in pixels. */
export function savePanelWidth(width: number): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(PANEL_WIDTH_KEY, String(Math.round(width)))
  } catch {
    // Best-effort.
  }
}

export function clearTryItState(specKey: string | undefined, operationKey: string): void {
  if (!specKey) return
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(storageKey(specKey, operationKey))
  } catch {
    // Best-effort.
  }
}
