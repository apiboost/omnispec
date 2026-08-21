/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback } from 'react'
import { css } from '../../styles/css'

export interface ParameterDef {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  description?: string
  type?: string
  format?: string
  enum?: string[]
  /** Enum of the array items when the parameter is `type: array` — renders a multi-select. */
  itemsEnum?: string[]
  /** OAS `explode`. For query params the form-style default is true (repeated key=value pairs). */
  explode?: boolean
  default?: string
  example?: string
}

/** Delimiter used to store multi-select values inside the single string value model. */
export const MULTI_VALUE_DELIMITER = ','

interface ParameterFormProps {
  parameters: ParameterDef[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
}

const sectionStyle = css({
  marginBottom: '16px',
})

const sectionTitleStyle = css({
  margin: '0 0 8px',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const fieldStyle = css({
  marginBottom: '14px',
})

const labelStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  marginBottom: '6px',
})

const nameStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
})

const requiredStyle = css({
  color: 'var(--omnispec-color-error)',
  fontWeight: 600,
})

const descriptionStyle = css({
  margin: '4px 0 0',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
})

const inputStyle = css({
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  boxSizing: 'border-box',
  '&:focus': {
    borderColor: 'var(--omnispec-color-primary)',
    outline: 'none',
  },
})

export function ParameterForm({ parameters, values, onChange }: ParameterFormProps) {
  const grouped = groupByLocation(parameters)

  return (
    <div className="adr-parameter-form">
      {(['path', 'query', 'header', 'cookie'] as const).map((location) => {
        const params = grouped[location]
        if (!params || params.length === 0) return null

        return (
          <div key={location} className={sectionStyle}>
            <h4 className={sectionTitleStyle}>
              {locationLabels[location]}
            </h4>
            {params.map((param) => (
              <ParameterInput
                key={param.name}
                param={param}
                value={values[param.name] ?? ''}
                onChange={onChange}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

const locationLabels: Record<string, string> = {
  path: 'Path Parameters',
  query: 'Query Parameters',
  header: 'Header Parameters',
  cookie: 'Cookie Parameters',
}

function ParameterInput({ param, value, onChange }: { param: ParameterDef; value: string; onChange: (name: string, value: string) => void }) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange(param.name, e.target.value)
  }, [param.name, onChange])

  const placeholder = param.example ?? param.default ?? `Filter by ${param.name}`

  return (
    <div className={fieldStyle}>
      <label className={labelStyle} htmlFor={`tryit-param-${param.name}`}>
        <span className={nameStyle}>{param.name}</span>
        {param.required && <span className={requiredStyle}>*</span>}
      </label>
      {param.itemsEnum ? (
        <MultiEnumSelect
          param={param}
          value={value}
          onChange={onChange}
        />
      ) : param.enum ? (
        <select id={`tryit-param-${param.name}`} value={value} onChange={handleChange} className={inputStyle}>
          <option value="">Select...</option>
          {param.enum.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          id={`tryit-param-${param.name}`}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputStyle}
        />
      )}
      {param.description && <p className={descriptionStyle}>{param.description}</p>}
    </div>
  )
}

/**
 * Checkbox multi-select for `type: array` parameters whose items have an enum.
 * Selected values are stored comma-joined in the string value model and split
 * again at request-build time.
 */
function MultiEnumSelect({
  param,
  value,
  onChange,
}: {
  param: ParameterDef
  value: string
  onChange: (name: string, value: string) => void
}) {
  const selected = new Set(value ? value.split(MULTI_VALUE_DELIMITER) : [])

  const toggle = (option: string) => {
    const next = new Set(selected)
    if (next.has(option)) {
      next.delete(option)
    } else {
      next.add(option)
    }
    onChange(param.name, Array.from(next).join(MULTI_VALUE_DELIMITER))
  }

  return (
    <div className={multiSelectStyle} role="group" aria-label={`${param.name} values`}>
      {(param.itemsEnum ?? []).map((option) => (
        <label key={option} className={multiOptionStyle}>
          <input
            type="checkbox"
            checked={selected.has(option)}
            onChange={() => toggle(option)}
          />
          <span className={multiOptionLabelStyle}>{option}</span>
        </label>
      ))}
    </div>
  )
}

const multiSelectStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
})

const multiOptionStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.5rem',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: '1rem',
  backgroundColor: 'var(--omnispec-input-bg)',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-xs)',
  '&:hover': {
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})

const multiOptionLabelStyle = css({
  color: 'var(--omnispec-fg-primary)',
  fontFamily: 'var(--omnispec-font-mono)',
})

function groupByLocation(params: ParameterDef[]): Record<string, ParameterDef[]> {
  const grouped: Record<string, ParameterDef[]> = {}
  for (const param of params) {
    if (!grouped[param.in]) grouped[param.in] = []
    grouped[param.in].push(param)
  }
  return grouped
}
