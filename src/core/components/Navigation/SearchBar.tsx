/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useState } from 'react'
import { css } from '../../styles/css'

interface SearchBarProps {
  placeholder?: string
  onSearch: (query: string) => void
  /**
   * Optional controlled value. When provided, the input reflects it (so an
   * external filter — e.g. a clicked tag — shows in the box and can be cleared
   * from outside). When omitted, the input manages its own state.
   */
  value?: string
}

export function SearchBar({ placeholder = 'Search...', onSearch, value }: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('')
  const isControlled = value !== undefined
  const displayValue = isControlled ? value : internalValue

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    if (!isControlled) setInternalValue(query)
    onSearch(query)
  }, [onSearch, isControlled])

  return (
    <div className={`omnispec-search ${containerStyle}`}>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={inputStyle}
        aria-label={placeholder}
      />
    </div>
  )
}

const containerStyle = css({
  padding: '12px',
})

const inputStyle = css({
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-base)',
  outline: 'none',
  boxSizing: 'border-box',
  '&:focus': {
    borderColor: 'var(--omnispec-color-primary)',
    boxShadow: '0 0 0 2px var(--omnispec-color-primary)33',
  },
})
