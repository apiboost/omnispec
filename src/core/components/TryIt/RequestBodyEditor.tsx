/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect, useRef } from 'react'
import { css } from '../../styles/css'

export type MultipartFieldValue = string | File | null

interface RequestBodyEditorProps {
  value: string
  onChange: (value: string) => void
  contentType: string
  onContentTypeChange?: (contentType: string) => void
  availableContentTypes?: string[]
  /** JSON schema of the selected content type — drives the multipart form fields. */
  schema?: Record<string, unknown>
  /** Field values for multipart/form-data mode, keyed by property name. */
  multipartFields?: Record<string, MultipartFieldValue>
  /** Called when a multipart field changes. */
  onMultipartFieldChange?: (name: string, value: MultipartFieldValue) => void
}

interface MultipartProp {
  name: string
  isFile: boolean
  required: boolean
  description?: string
}

/** Derives the multipart form fields from a schema's properties. */
export function getMultipartProps(schema?: Record<string, unknown>): MultipartProp[] {
  const properties = schema?.properties as Record<string, Record<string, unknown>> | undefined
  if (!properties) return []
  const required = (schema?.required as string[] | undefined) ?? []
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    // `type: string, format: binary` (OAS 3.0) or `contentEncoding` (3.1)
    // marks a file part; arrays of binary items also count.
    isFile:
      prop.format === 'binary' ||
      prop.contentEncoding !== undefined ||
      (prop.items as Record<string, unknown> | undefined)?.format === 'binary',
    required: required.includes(name),
    description: prop.description as string | undefined,
  }))
}

const containerStyle = css({
  marginBottom: '12px',
  display: 'flex',
  flexDirection: 'column',
})

const headerStyle = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
})

const labelStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const contentTypeSelectStyle = css({
  padding: '4px 8px',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const textareaStyle = css({
  width: '100%',
  minHeight: '120px',
  padding: '10px',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-code)',
  color: 'var(--omnispec-fg-code)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
  resize: 'vertical',
  boxSizing: 'border-box',
  lineHeight: 1.5,
})

export function RequestBodyEditor({
  value,
  onChange,
  contentType,
  onContentTypeChange,
  availableContentTypes = ['application/json'],
  schema,
  multipartFields = {},
  onMultipartFieldChange,
}: RequestBodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  // Form-field mode covers both multipart (file pickers + text) and
  // x-www-form-urlencoded (text only) bodies.
  const isMultipart = contentType.includes('multipart/form-data')
  const isUrlEncoded = contentType.includes('application/x-www-form-urlencoded')
  const multipartProps = (isMultipart || isUrlEncoded) ? getMultipartProps(schema) : []
  const showMultipartForm = (isMultipart || isUrlEncoded) && multipartProps.length > 0 && onMultipartFieldChange

  return (
    <div className={`adr-request-body ${containerStyle}`}>
      <div className={headerStyle}>
        <span className={labelStyle}>Request Body</span>
        {availableContentTypes.length > 1 && onContentTypeChange && (
          <select
            value={contentType}
            onChange={(e) => onContentTypeChange(e.target.value)}
            className={contentTypeSelectStyle}
          >
            {availableContentTypes.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        )}
      </div>
      {showMultipartForm ? (
        <div className={multipartListStyle}>
          {multipartProps.map((prop) => {
            const fieldValue = multipartFields[prop.name]
            return (
              <div key={prop.name} className={multipartFieldStyle}>
                <label className={multipartLabelStyle}>
                  <span className={multipartNameStyle}>{prop.name}</span>
                  {prop.required && <span className={multipartRequiredStyle}>*</span>}
                </label>
                {prop.isFile && isMultipart ? (
                  <input
                    type="file"
                    onChange={(e) => onMultipartFieldChange(prop.name, e.target.files?.[0] ?? null)}
                    className={multipartFileInputStyle}
                  />
                ) : (
                  <input
                    type="text"
                    value={typeof fieldValue === 'string' ? fieldValue : ''}
                    onChange={(e) => onMultipartFieldChange(prop.name, e.target.value)}
                    placeholder={prop.description ?? prop.name}
                    className={multipartTextInputStyle}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          name="request-body"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={getPlaceholder(contentType)}
          className={textareaStyle}
          spellCheck={false}
        />
      )}
    </div>
  )
}

const multipartListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
})

const multipartFieldStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
})

const multipartLabelStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.125rem',
})

const multipartNameStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const multipartRequiredStyle = css({
  color: 'var(--omnispec-color-error)',
  fontWeight: 600,
})

const multipartTextInputStyle = css({
  width: '100%',
  padding: '0.5rem 0.625rem',
  borderRadius: 'var(--omnispec-border-radius)',
  border: '1px solid var(--omnispec-input-border)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
  boxSizing: 'border-box',
})

const multipartFileInputStyle = css({
  width: '100%',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  '&::file-selector-button': {
    padding: '0.375rem 0.75rem',
    marginRight: '0.5rem',
    borderRadius: 'var(--omnispec-border-radius)',
    border: '1px solid var(--omnispec-input-border)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
    color: 'var(--omnispec-fg-primary)',
    fontSize: 'var(--omnispec-font-size-xs)',
    cursor: 'pointer',
  },
})

function getPlaceholder(contentType: string): string {
  if (contentType.includes('json')) return '{\n  "key": "value"\n}'
  if (contentType.includes('xml')) return '<root>\n  <element>value</element>\n</root>'
  return 'Enter request body...'
}
