/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { TryItRequest, TryItResponse } from '@core/types/try-it.types'
import { useAuth } from '@core/context/AuthContext'
import { useConfig } from '@core/context/ConfigContext'
import { sendProxiedRequest } from '@core/utils/proxy-client'
import { sendDirectRequest } from '@core/utils/direct-client'
import type { ParameterDef } from './ParameterForm'
import { ParameterForm, MULTI_VALUE_DELIMITER } from './ParameterForm'
import { RequestBodyEditor } from './RequestBodyEditor'
import type { MultipartFieldValue } from './RequestBodyEditor'
import { ResponseViewer } from './ResponseViewer'
import { CodeSamples } from './CodeSamples'
import type { XCodeSample } from './CodeSamples'
import { generateExample } from '@core/components/SchemaViewer/schema-utils'
import { Button } from '@core/components/common/Button'
import { Icon } from '@core/components/common/Icon'
import type { CodeLanguageId } from './code-generators'
import { loadTryItState, saveTryItState, clearTryItState } from '@core/utils/tryit-storage'
import { CustomHeaders } from './CustomHeaders'
import type { CustomHeader } from './CustomHeaders'

interface TryItPanelProps {
  method: string
  path: string
  serverUrl: string
  parameters?: ParameterDef[]
  requestBodyContentTypes?: string[]
  defaultRequestBody?: string
  requestBodySchema?: Record<string, unknown>
  /** Schemas keyed by content type — used to drive per-content-type editors (e.g. multipart form fields). */
  requestBodySchemas?: Record<string, Record<string, unknown> | undefined>
  /** Security requirement groups (scheme-name lists) — used to block Send until a required scheme is applied. */
  security?: string[][]
  xCodeSamples?: XCodeSample[]
  /**
   * Whether the panel is docked in a side column (`tryItLayout: 'panel'`, the
   * default). Docked panels stick to the viewport and cap their own height. In
   * the inline layout the panel flows full-width below the operation, so pass
   * `docked={false}` to disable the sticky/maxHeight/overflow behavior.
   */
  docked?: boolean
  onRequest?: (request: TryItRequest) => void
  onResponse?: (response: TryItResponse) => void
}

export function TryItPanel({
  method,
  path,
  serverUrl,
  parameters = [],
  requestBodyContentTypes,
  defaultRequestBody,
  requestBodySchema,
  requestBodySchemas,
  security,
  xCodeSamples,
  docked = true,
  onRequest,
  onResponse,
}: TryItPanelProps) {
  const { allowTryIt, proxyUrl, proxyHeaders, specKey, tryItPersistTtl } = useConfig()
  const { getAuthHeaders, appliedAuth, openAuthPanel, hasAuth, clearAuth } = useAuth()

  // Reflect whether any credential has been applied so the header button
  // toggles between its "Authorize" (open lock) and "Authorized" (closed lock) states.
  const authorized = appliedAuth.size > 0

  // Persisted (non-sensitive) form state, namespaced per spec + operation.
  // A TTL of 0 disables persistence entirely (no restore, no save).
  const persistenceDisabled = tryItPersistTtl === 0
  const operationKey = `${method.toUpperCase()} ${path}`
  const persisted = useMemo(
    () => loadTryItState(specKey, operationKey, tryItPersistTtl),
    [specKey, operationKey, tryItPersistTtl],
  )

  const defaultParamValues = (): Record<string, string> => {
    const initial: Record<string, string> = {}
    for (const param of parameters) {
      const val = param.example ?? param.default
      if (val !== undefined) initial[param.name] = val
    }
    return initial
  }

  const [paramValues, setParamValues] = useState<Record<string, string>>(() => ({
    ...defaultParamValues(),
    ...persisted?.paramValues,
  }))
  const [body, setBody] = useState(persisted?.body ?? defaultRequestBody ?? '')
  const [contentType, setContentType] = useState(
    persisted?.contentType ?? requestBodyContentTypes?.[0] ?? 'application/json',
  )
  const [multipartFields, setMultipartFields] = useState<Record<string, MultipartFieldValue>>(
    () => ({ ...persisted?.formFields }),
  )
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>(
    () => persisted?.customHeaders ?? [],
  )
  const [response, setResponse] = useState<TryItResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [codeLang, setCodeLang] = useState<CodeLanguageId>('curl')

  // Track which params the user manually edited so example-selection changes
  // (which arrive as new `example` prop values) don't clobber user input.
  // Params restored from persistence count as touched.
  const touchedParams = useRef<Set<string>>(new Set(Object.keys(persisted?.paramValues ?? {})))

  // Persist non-sensitive form state (best-effort, per spec + operation).
  useEffect(() => {
    if (!specKey || persistenceDisabled) return
    const formFields: Record<string, string> = {}
    for (const [name, value] of Object.entries(multipartFields)) {
      if (typeof value === 'string' && value !== '') formFields[name] = value
    }
    saveTryItState(specKey, operationKey, {
      paramValues,
      body,
      contentType,
      formFields,
      customHeaders,
    })
  }, [specKey, operationKey, persistenceDisabled, paramValues, body, contentType, multipartFields, customHeaders])

  // Required-input enforcement: Send is blocked while required path/query
  // params are empty or a required security scheme has no applied credential.
  const missingRequiredParams = useMemo(() => {
    const missing: string[] = []
    for (const param of parameters) {
      if (!param.required) continue
      if (param.in !== 'path' && param.in !== 'query') continue
      if (!paramValues[param.name]?.trim()) missing.push(`${param.name} (${param.in})`)
    }
    return missing
  }, [parameters, paramValues])

  const authSatisfied = useMemo(() => {
    if (!security || security.length === 0) return true
    // Requirement groups are OR'd; schemes within a group are AND'd.
    // An empty group means "auth optional".
    return security.some((group) => group.length === 0 || group.every((name) => appliedAuth.has(name)))
  }, [security, appliedAuth])

  // getAuthHeaders attaches every applied credential regardless of scheme, so
  // credentials applied under a different scheme name must not hard-block Send
  // — the request will carry them. Only block when nothing is applied at all.
  const authMismatch = !authSatisfied && appliedAuth.size > 0
  const authBlocked = !authSatisfied && appliedAuth.size === 0
  const declaredSchemes = useMemo(
    () => Array.from(new Set((security ?? []).flat())),
    [security],
  )

  const sendBlocked = missingRequiredParams.length > 0 || authBlocked

  const handleReset = () => {
    clearTryItState(specKey, operationKey)
    touchedParams.current = new Set()
    setParamValues(defaultParamValues())
    setBody(defaultRequestBody ?? '')
    setContentType(requestBodyContentTypes?.[0] ?? 'application/json')
    setMultipartFields({})
    setCustomHeaders([])
    // Also return the Authorization panel to its pristine state — clear every
    // applied credential (and its persisted copy). Auth is global, so this
    // resets authorization across the whole spec, not just this operation.
    clearAuth()
  }

  const handleParamChange = useCallback((name: string, value: string) => {
    touchedParams.current.add(name)
    setParamValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  // When the effective example for a parameter changes (e.g. a named example is
  // selected in the docs), prefill the corresponding Try-It input — unless the
  // user has already edited it.
  const exampleSignature = parameters.map((p) => `${p.name}=${p.example ?? ''}`).join('|')
  useEffect(() => {
    setParamValues((prev) => {
      let changed = false
      const next = { ...prev }
      for (const param of parameters) {
        if (param.example === undefined) continue
        if (touchedParams.current.has(param.name)) continue
        if (next[param.name] !== param.example) {
          next[param.name] = param.example
          changed = true
        }
      }
      return changed ? next : prev
    })
    // exampleSignature encodes the relevant `parameters[].example` values;
    // `parameters` itself is intentionally omitted to avoid re-running on every
    // render (it is a new array each time).
  }, [exampleSignature])

  const buildRequest = useCallback((): TryItRequest => {
    const authHeaders = getAuthHeaders()
    const headers: Record<string, string> = { ...authHeaders }

    // Add header parameters
    for (const param of parameters) {
      if (param.in === 'header' && paramValues[param.name]) {
        headers[param.name] = paramValues[param.name]
      }
    }

    // User-added custom headers override spec-defined ones by name.
    for (const header of customHeaders) {
      const name = header.name.trim()
      if (name) headers[name] = header.value
    }

    const bodyCapable = ['post', 'put', 'patch'].includes(method.toLowerCase())
    const isMultipart = contentType.includes('multipart/form-data')
    const isUrlEncoded = contentType.includes('application/x-www-form-urlencoded')
    const hasFormFieldValues = Object.values(multipartFields).some((v) => v !== null && v !== '')

    const pathParams: Record<string, string> = {}
    const queryParams: Record<string, string | string[]> = {}

    for (const param of parameters) {
      const val = paramValues[param.name]
      if (!val) continue
      if (param.in === 'path') pathParams[param.name] = val
      if (param.in === 'query') {
        if (param.itemsEnum) {
          const values = val.split(MULTI_VALUE_DELIMITER).filter(Boolean)
          // OAS form-style default: explode=true → repeated key=value pairs;
          // explode=false → single comma-joined value.
          queryParams[param.name] = param.explode === false ? values.join(',') : values
        } else {
          queryParams[param.name] = val
        }
      }
    }

    let encodedBody: string | FormData | undefined

    if (bodyCapable && isMultipart) {
      // Build real FormData from the multipart form fields. Do NOT set the
      // Content-Type header manually — fetch adds it with the boundary in
      // direct mode, and the proxy client sets it during serialization.
      const formData = new FormData()
      let hasEntries = false
      for (const [name, value] of Object.entries(multipartFields)) {
        if (value === null || value === '') continue
        formData.append(name, value)
        hasEntries = true
      }
      if (hasEntries) encodedBody = formData
    } else if (bodyCapable && isUrlEncoded && hasFormFieldValues) {
      // Form-field UI for x-www-form-urlencoded — serialize the labeled
      // inputs directly to URL-encoded pairs.
      headers['Content-Type'] = contentType
      const params = new URLSearchParams()
      for (const [name, value] of Object.entries(multipartFields)) {
        if (value === null || value === '' || typeof value !== 'string') continue
        params.set(name, value)
      }
      encodedBody = params.toString()
    } else if (bodyCapable && body) {
      headers['Content-Type'] = contentType
      encodedBody = body
      if (isUrlEncoded) {
        // Legacy fallback: no schema-driven fields — accept JSON in the
        // textarea and convert it to URL-encoded pairs.
        try {
          const parsed = JSON.parse(body)
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(parsed)) {
            params.set(key, String(value))
          }
          encodedBody = params.toString()
        } catch {
          encodedBody = body
        }
      }
    }

    return {
      url: path,
      method: method.toUpperCase(),
      headers,
      pathParams,
      queryParams,
      body: encodedBody,
      bodyType: contentType,
    }
  }, [parameters, paramValues, body, contentType, multipartFields, customHeaders, method, path, getAuthHeaders])

  const handleSend = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    setResponse(null)

    const request = buildRequest()
    onRequest?.(request)

    const fullRequest: TryItRequest = {
      ...request,
      url: serverUrl + request.url,
    }

    try {
      // Use proxy if configured, otherwise send directly from the browser
      const res = proxyUrl
        ? await sendProxiedRequest(proxyUrl, fullRequest, proxyHeaders)
        : await sendDirectRequest(fullRequest)

      setResponse(res)
      onResponse?.(res)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      if (!proxyUrl && message.includes('Failed to fetch')) {
        // A browser fetch that fails without a response is opaque — it could be
        // CORS, mixed content, or a plain-http server URL. Give the most likely
        // cause: a stale `http://` server URL (blocked from https pages, and
        // often un-followable to https because the redirect lacks CORS headers)
        // is a common culprit and has a concrete fix.
        const isHttpTarget = /^http:\/\//i.test(fullRequest.url)
        const hint = isHttpTarget
          ? "The spec's server URL uses http://, which browsers block from an https page and often can't follow to https (the redirect carries no CORS headers). Use an https:// server URL, or route requests through a proxyUrl."
          : 'This is usually a CORS restriction — the API does not allow browser cross-origin requests. Configure a proxyUrl to route requests through your backend.'
        setError(`${message}. ${hint}`)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [proxyUrl, proxyHeaders, buildRequest, serverUrl, onRequest, onResponse])

  // Generate a fallback body from schema required fields for curl display
  const schemaBody = useMemo(() => {
    if (!requestBodySchema) return undefined
    return JSON.stringify(generateExample(requestBodySchema), null, 2)
  }, [requestBodySchema])

  if (!allowTryIt) return null

  const request = buildRequest()
  const hasBodyMethods = ['post', 'put', 'patch'].includes(method.toLowerCase())
  const codeSampleRequest = useMemo(() => {
    const r = { ...request }
    if (hasBodyMethods && !r.body && schemaBody) {
      r.body = schemaBody
      if (!r.headers['Content-Type']) {
        r.headers = { ...r.headers, 'Content-Type': contentType }
      }
    }
    return r
  }, [request, hasBodyMethods, schemaBody, contentType])

  return (
    <div className={cx('omnispec-tryit', docked && dockedContainerStyle)}>
      <div className={titleRowStyle}>
        <h4 className={titleStyle}>Try it</h4>
        <div className={statusRowStyle}>
          <div className={headerActionsStyle}>
            {hasAuth && (
              <button
                type="button"
                onClick={openAuthPanel}
                className={headerBtnStyle}
                title={authorized ? 'Update authorization credentials' : 'Set authorization credentials'}
              >
                <Icon
                  name={authorized ? 'lock-keyhole' : 'lock-keyhole-open'}
                  size="0.875rem"
                  color={authorized ? 'var(--omnispec-color-success)' : undefined}
                />
                {authorized ? 'Authorized' : 'Authorize'}
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className={headerBtnStyle}
              title="Reset Try-It inputs for this operation and clear all applied authorization"
            >
              <Icon name="rotate-ccw" size="0.875rem" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {parameters.length > 0 && (
        <ParameterForm
          parameters={parameters}
          values={paramValues}
          onChange={handleParamChange}
        />
      )}

      <CustomHeaders headers={customHeaders} onChange={setCustomHeaders} />

      {hasBodyMethods && requestBodyContentTypes && (
        <RequestBodyEditor
          value={body}
          onChange={setBody}
          contentType={contentType}
          onContentTypeChange={setContentType}
          availableContentTypes={requestBodyContentTypes}
          schema={requestBodySchemas?.[contentType] ?? requestBodySchema}
          multipartFields={multipartFields}
          onMultipartFieldChange={(name, value) =>
            setMultipartFields((prev) => ({ ...prev, [name]: value }))
          }
        />
      )}

      <div className={actionsStyle}>
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={loading || sendBlocked}
          className={fullWidthBtnStyle}
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {(sendBlocked || authMismatch) && (
        <div className={validationMsgStyle} role="status">
          {missingRequiredParams.length > 0 && (
            <span>
              Required: {missingRequiredParams.join(', ')}
            </span>
          )}
          {authBlocked && (
            <span>Authorization required — apply credentials in the Authorization panel.</span>
          )}
          {authMismatch && (
            <span>
              This operation declares {declaredSchemes.join(', ')} — your applied credentials
              will be sent with the request.
            </span>
          )}
        </div>
      )}

      <CodeSamples
        request={codeSampleRequest}
        serverUrl={serverUrl}
        selectedLanguage={codeLang}
        onLanguageChange={setCodeLang}
        xCodeSamples={xCodeSamples}
      />

      <ResponseViewer response={response} loading={loading} error={error} />
    </div>
  )
}

// Docked (side-column) placement only. In the inline layout the panel flows
// full-width below the operation, so this sticky/maxHeight/overflow block is
// gated behind `docked` (see TryItPanel's `docked` prop).
const dockedContainerStyle = css({
  position: 'sticky',
  top: 'calc(var(--omnispec-offset-top, 0px) + 1.25rem)',
  [mq.desktop]: {
    // When the panel is taller than the viewport, a sticky element would pin
    // its top and push its bottom off-screen with no way to reach it (the page
    // scroll tracks the taller left column). Cap it to the viewport and let the
    // panel scroll its own overflow so every control stays reachable.
    maxHeight: 'calc(100vh - var(--omnispec-offset-top, 0px) - 2.5rem)',
    overflowY: 'auto',
    // Keep the internal scrollbar off the content edge.
    paddingRight: '0.25rem',
  },
})

const titleRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
})

const titleStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
})

const actionsStyle = css({
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
})

const fullWidthBtnStyle = css({
  width: '100%',
})

const statusRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: 'var(--omnispec-font-size-xs)',
  flex: 1,
})

const validationMsgStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  marginBottom: '0.75rem',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-warning)',
  lineHeight: 1.4,
})

const headerActionsStyle = css({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
})

// Shared style for the Reset + Authorize header buttons. Sized ~25% larger
// than the previous Reset button (padding + font-size bumped in step).
const headerBtnStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.25rem 0.625rem',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-sans)',
  color: 'var(--omnispec-fg-muted)',
  backgroundColor: 'transparent',
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: 'var(--omnispec-border-radius)',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
    backgroundColor: 'var(--omnispec-bg-secondary)',
  },
})
