/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ThemeConfig, ThemeTokens } from '../types/theme.types'
import { lightTheme, darkTheme } from './tokens'
import { css, cx } from '../styles/css'
import { Icon } from '../components/common/Icon'
import { useConfig } from '../context/ConfigContext'

interface ThemeContextValue {
  tokens: ThemeTokens
  base: 'light' | 'dark'
  isAuto: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  tokens: lightTheme,
  base: 'light',
  isAuto: false,
  toggle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function buildTokenCss(scopeClass: string, tokens: ThemeTokens): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(tokens)) {
    lines.push(`  ${key}: ${value};`)
  }
  return `.${scopeClass} {\n${lines.join('\n')}\n}`
}

interface ThemeProviderProps {
  theme?: ThemeConfig
  children: ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const isAuto = theme?.base === 'auto'
  const [autoBase, setAutoBase] = useState<'light' | 'dark'>(() =>
    isAuto ? getSystemPreference() : 'light',
  )

  useEffect(() => {
    if (!isAuto) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setAutoBase(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [isAuto])

  useEffect(() => {
    if (isAuto && theme?.onThemeChange) {
      theme.onThemeChange(autoBase)
    }
  }, [isAuto, autoBase, theme?.onThemeChange])

  const toggle = useCallback(() => {
    if (!isAuto) return
    setAutoBase((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [isAuto])

  const resolvedBase = isAuto ? autoBase : (theme?.base ?? 'light') as 'light' | 'dark'

  const { premiumThemingEnabled } = useConfig()

  const resolved = useMemo((): ThemeContextValue => {
    const baseTokens = resolvedBase === 'dark' ? darkTheme : lightTheme
    const tokens = premiumThemingEnabled && theme?.overrides
      ? { ...baseTokens, ...theme.overrides }
      : baseTokens

    return { tokens, base: resolvedBase, isAuto, toggle }
  }, [resolvedBase, theme?.overrides, isAuto, toggle, premiumThemingEnabled])

  const reactId = useId()
  const scopeClass = useMemo(
    () => `omnispec-theme-${reactId.replace(/:/g, '')}`,
    [reactId],
  )

  const tokenCss = useMemo(
    () => buildTokenCss(scopeClass, resolved.tokens),
    [scopeClass, resolved.tokens],
  )

  const showToggle = isAuto && theme?.themeToggle !== false

  return (
    <ThemeContext.Provider value={resolved}>
      <style dangerouslySetInnerHTML={{ __html: tokenCss }} />
      <div className={cx('omnispec-root', scopeClass, rootStyle)}>
        {showToggle && <ThemeToggleButton base={resolvedBase} onToggle={toggle} />}
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

const rootStyle = css({
  backgroundColor: 'var(--omnispec-bg-primary)',
  color: 'var(--omnispec-fg-primary)',
  fontFamily: 'var(--omnispec-font-sans)',
  '& *, &': {
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--omnispec-scrollbar-thumb) var(--omnispec-scrollbar-track)',
  },
  '& ::-webkit-scrollbar': {
    width: 'var(--omnispec-scrollbar-width)',
    height: 'var(--omnispec-scrollbar-width)',
  },
  '& ::-webkit-scrollbar-track': {
    background: 'var(--omnispec-scrollbar-track)',
  },
  '& ::-webkit-scrollbar-thumb': {
    background: 'var(--omnispec-scrollbar-thumb)',
    borderRadius: 'var(--omnispec-scrollbar-width)',
  },
  '& ::-webkit-scrollbar-thumb:hover': {
    background: 'var(--omnispec-scrollbar-thumb-hover)',
  },
  // Themed form controls, applied across every spec renderer. Element
  // selectors (specificity 0,1,1) intentionally win over the per-component
  // select/checkbox classes (0,1,0) for the accent, box, and chevron, while
  // leaving each component's own width / font-size / layout untouched.
  // Fully custom checkbox + radio (appearance:none): larger, brand-filled, with
  // a white SVG check / centered dot on selection.
  '& input[type="checkbox"], & input[type="radio"]': {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    boxSizing: 'border-box',
    width: '1.15rem',
    height: '1.15rem',
    margin: 0,
    flexShrink: 0,
    display: 'inline-block',
    verticalAlign: 'middle',
    cursor: 'pointer',
    backgroundColor: 'var(--omnispec-input-bg)',
    border: '1.5px solid var(--omnispec-input-border)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    transition: 'background-color 120ms ease, border-color 120ms ease',
  },
  '& input[type="checkbox"]': {
    borderRadius: '0.28rem',
    backgroundSize: '0.85rem',
  },
  '& input[type="radio"]': {
    borderRadius: '50%',
  },
  '& input[type="checkbox"]:hover, & input[type="radio"]:hover': {
    borderColor: 'var(--omnispec-color-primary)',
  },
  '& input[type="checkbox"]:checked': {
    backgroundColor: 'var(--omnispec-color-primary)',
    borderColor: 'var(--omnispec-color-primary)',
    // Lucide-style check (white stroke on the brand fill).
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%2220 6 9 17 4 12%22/%3E%3C/svg%3E")',
  },
  '& input[type="radio"]:checked': {
    borderColor: 'var(--omnispec-color-primary)',
    backgroundImage: 'radial-gradient(var(--omnispec-color-primary) 0 45%, transparent 48%)',
  },
  '& input[type="checkbox"]:focus-visible, & input[type="radio"]:focus-visible': {
    outline: '2px solid var(--omnispec-color-primary)',
    outlineOffset: '2px',
  },
  '& select': {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-input-bg)',
    border: '1px solid var(--omnispec-input-border)',
    borderRadius: 'var(--omnispec-border-radius)',
    padding: '0.375rem 2rem 0.375rem 0.625rem',
    cursor: 'pointer',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.625rem center',
    backgroundSize: '0.75rem',
    // Chevron in a theme-neutral muted grey (reads on both light and dark).
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%237d8590%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22/%3E%3C/svg%3E")',
  },
  '& select:hover': {
    borderColor: 'var(--omnispec-color-primary)',
  },
  '& select:focus-visible': {
    borderColor: 'var(--omnispec-color-primary)',
    outline: '2px solid var(--omnispec-color-primary)',
    outlineOffset: '1px',
  },
  '& select:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
})

interface ThemeToggleButtonProps {
  base: 'light' | 'dark'
  onToggle: () => void
}

function ThemeToggleButton({ base, onToggle }: ThemeToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={toggleButtonStyle}
      aria-label={`Switch to ${base === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${base === 'light' ? 'dark' : 'light'} mode`}
    >
      <Icon name={base === 'light' ? 'moon' : 'sun'} size="1rem" strokeWidth={2} />
    </button>
  )
}

const toggleButtonStyle = css({
  position: 'fixed',
  bottom: '1.25rem',
  right: '1.25rem',
  zIndex: 9999,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '50%',
  border: '1px solid var(--omnispec-border-color)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  color: 'var(--omnispec-fg-primary)',
  cursor: 'pointer',
  boxShadow: '0 0.125rem 0.5rem rgba(0, 0, 0, 0.15)',
  '&:hover': {
    backgroundColor: 'var(--omnispec-bg-tertiary)',
  },
})
