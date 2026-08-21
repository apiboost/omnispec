/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '../../styles/css'

export interface NamedExample {
  name: string
  summary?: string
  value: unknown
}

interface ExampleSelectorProps {
  examples: NamedExample[]
  selectedName: string
  onSelect: (name: string) => void
}

export function ExampleSelector({
  examples,
  selectedName,
  onSelect,
}: ExampleSelectorProps) {
  // Return null if there are no examples or only one example
  if (examples.length <= 1) {
    return null
  }

  return (
    <div className={containerStyle}>
      <label htmlFor="example-selector" className={labelStyle}>
        Example:
      </label>
      <select
        id="example-selector"
        value={selectedName}
        onChange={(e) => onSelect(e.target.value)}
        className={selectStyle}
      >
        {examples.map((example) => (
          <option key={example.name} value={example.name}>
            {example.summary ? `${example.name} - ${example.summary}` : example.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function getNamedExamples(
  media: {
    example?: unknown
    examples?: Record<string, { summary?: string; value: unknown }>
  },
): NamedExample[] {
  // If singular example exists, return it as the default
  if (media.example !== undefined) {
    return [{ name: 'default', value: media.example }]
  }

  // If plural examples map exists, convert to NamedExample array
  if (media.examples && typeof media.examples === 'object') {
    return Object.entries(media.examples).map(([name, example]) => ({
      name,
      summary: (example as { summary?: string }).summary,
      value: (example as { value: unknown }).value,
    }))
  }

  // No examples found
  return []
}

const containerStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.75rem',
})

const labelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
})

const selectStyle = css({
  padding: '0.375rem 0.625rem',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
})
