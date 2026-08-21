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
}

export function SearchBar({ placeholder = 'Search...', onSearch }: SearchBarProps) {
  const [value, setValue] = useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setValue(query)
    onSearch(query)
  }, [onSearch])

  return (
    <div className={`omnispec-search ${containerStyle}`}>
      <input
        type="text"
        value={value}
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
