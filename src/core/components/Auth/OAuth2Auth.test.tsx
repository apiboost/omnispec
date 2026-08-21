/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup, fireEvent, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ConfigProvider } from '@core/context/ConfigContext'
import { OAuth2Auth } from '@core/components/Auth/OAuth2Auth'
import { OAUTH_CALLBACK_MESSAGE_TYPE } from '@core/utils/oauth-callback-html'
import { exchangeAuthorizationCode, exchangeClientCredentials } from '@core/utils/oauth-pkce'
import type { AuthScheme, AppliedAuthValue } from '@core/types/auth.types'

const clientCredsScheme: AuthScheme = {
  id: 'petstore_auth',
  type: 'oauth2',
  displayName: 'petstore_auth',
  flows: {
    clientCredentials: {
      tokenUrl: 'https://auth.example.com/token',
      scopes: { 'read:pets': 'Read pets' },
    },
  },
}

vi.mock('@core/utils/oauth-pkce', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal()
  return { ...actual, exchangeAuthorizationCode: vi.fn(), exchangeClientCredentials: vi.fn() }
})

const scheme: AuthScheme = {
  id: 'petstore_auth',
  type: 'oauth2',
  displayName: 'petstore_auth',
  flows: {
    authorizationCode: {
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: { 'read:pets': 'Read pets' },
    },
  },
}

// The interactive flow is a Pro feature — tests render inside a config with
// the Pro capability flag on, mirroring how the Pro package wires proFeatures.
function renderWithPro(ui: ReactElement) {
  return render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>{ui}</ConfigProvider>)
}

describe('OAuth2Auth PKCE flow', () => {
  let popup: { closed: boolean; close: () => void }

  beforeEach(() => {
    popup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    vi.mocked(exchangeAuthorizationCode).mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('renders a Get Token button for the authorization-code flow', () => {
    renderWithPro(<OAuth2Auth scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /get token/i })).toBeInTheDocument()
  })

  it('disables Get Token until a client ID is entered', () => {
    renderWithPro(<OAuth2Auth scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} />)

    const button = screen.getByRole('button', { name: /get token/i })
    expect(button).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'my-client' } })
    expect(button).toBeEnabled()
  })

  it('applies the token as a Bearer Authorization header after the popup flow completes', async () => {
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue({ accessToken: 'tok-42', tokenType: 'Bearer' })
    const onApply = vi.fn()
    renderWithPro(<OAuth2Auth scheme={scheme} onApply={onApply} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'my-client' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(window.open).toHaveBeenCalled())
    const openedUrl = new URL(vi.mocked(window.open).mock.calls[0][0] as string)
    const state = openedUrl.searchParams.get('state') as string
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: OAUTH_CALLBACK_MESSAGE_TYPE, code: 'code-9', state, error: null, errorDescription: null },
        origin: window.location.origin,
      }))
    })

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      schemeId: 'petstore_auth',
      headerName: 'Authorization',
      headerValue: 'Bearer tok-42',
    })))
  })

  it('shows a themed error when the popup is blocked', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    renderWithPro(<OAuth2Auth scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'my-client' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/popup/i)
  })

  it('does not render Get Token for an authorization-code flow missing its authorization URL', () => {
    const noAuthUrl: AuthScheme = {
      ...scheme,
      // authorizationCode with only a tokenUrl — PKCE has nowhere to send the user to log in.
      flows: { authorizationCode: { tokenUrl: 'https://auth.example.com/token', scopes: {} } },
    }
    renderWithPro(<OAuth2Auth scheme={noAuthUrl} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /get token/i })).not.toBeInTheDocument()
  })

  it('omits Get Token entirely on the Free tier (no interactiveOAuthEnabled)', () => {
    render(<OAuth2Auth scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /get token/i })).not.toBeInTheDocument()
    // Manual token paste stays available.
    expect(screen.getByPlaceholderText('Access token')).toBeInTheDocument()
  })
})

describe('OAuth2Auth client-credentials Get Token', () => {
  beforeEach(() => {
    vi.mocked(exchangeClientCredentials).mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders a Get Token button for the client-credentials flow when Pro-enabled', () => {
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)
    expect(screen.getByRole('button', { name: /get token/i })).toBeInTheDocument()
  })

  it('omits Get Token for client-credentials on the Free tier', () => {
    render(<OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /get token/i })).not.toBeInTheDocument()
  })

  it('is disabled until both client id and secret are entered', () => {
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)
    const button = screen.getByRole('button', { name: /get token/i })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    expect(button).toBeEnabled()
  })

  it('applies the fetched token as a Bearer header', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'cc-77', tokenType: 'Bearer' })
    const onApply = vi.fn()
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={onApply} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      schemeId: 'petstore_auth',
      headerValue: 'Bearer cc-77',
    })))
  })

  it('shows a themed error when the exchange fails', async () => {
    vi.mocked(exchangeClientCredentials).mockRejectedValue(new Error('Token request failed — invalid_client'))
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid_client/i)
  })

  it('shows a brief success confirmation after a token is fetched', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'cc-9', tokenType: 'Bearer' })
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    expect(await screen.findByText(/token received/i)).toBeInTheDocument()
  })

  it('resolves a relative tokenUrl against the selected server before exchanging', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    const relScheme: AuthScheme = {
      id: 'petstore_auth', type: 'oauth2', displayName: 'petstore_auth',
      flows: { clientCredentials: { tokenUrl: '/oauth/token', scopes: { 'read:pets': 'Read pets' } } },
    }
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={relScheme} onApply={vi.fn()} onRemove={vi.fn()} serverUrl="https://remote.example.com" />
    </ConfigProvider>)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({
      tokenUrl: 'https://remote.example.com/oauth/token',
    })))
  })

  it('leaves an absolute tokenUrl unchanged regardless of the selected server', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} serverUrl="https://remote.example.com" />
    </ConfigProvider>)

    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({
      tokenUrl: 'https://auth.example.com/token',
    })))
  })
})

const twoScopeCcScheme: AuthScheme = {
  id: 'petstore_auth', type: 'oauth2', displayName: 'petstore_auth',
  flows: {
    clientCredentials: {
      tokenUrl: 'https://auth.example.com/token',
      scopes: { 'read:pets': 'Read pets', 'write:pets': 'Write pets' },
    },
  },
}

describe('OAuth2Auth scope selection', () => {
  beforeEach(() => {
    vi.mocked(exchangeClientCredentials).mockReset()
  })
  afterEach(() => {
    cleanup(); vi.restoreAllMocks()
  })

  it('renders each declared scope as a checked checkbox when Get Token is available', () => {
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>
      <OAuth2Auth scheme={twoScopeCcScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    boxes.forEach((b) => expect(b).toBeChecked())
  })

  it('renders scopes read-only (no checkboxes) on the Free tier', () => {
    render(<OAuth2Auth scheme={twoScopeCcScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('read:pets')).toBeInTheDocument()
  })

  it('requests only the checked scopes when Get Token is clicked', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={twoScopeCcScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.click(screen.getByRole('checkbox', { name: /write:pets/i }))
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({ scopes: ['read:pets'] }))
  })

  it('persists the scope selection in the applied value when a token is obtained', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    const onApply = vi.fn()
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={twoScopeCcScheme} onApply={onApply} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.click(screen.getByRole('checkbox', { name: /write:pets/i }))
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    const input = onApply.mock.calls.at(-1)?.[0].input
    expect(JSON.parse(input.scopeSelection)).toEqual({ clientCredentials: ['read:pets'] })
  })

  it('restores a persisted scope selection from the applied value', () => {
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>
      <OAuth2Auth
        scheme={twoScopeCcScheme}
        applied
        appliedValue={{
          schemeId: 'petstore_auth',
          headerName: 'Authorization',
          headerValue: 'Bearer x',
          input: { scopeSelection: JSON.stringify({ clientCredentials: ['read:pets'] }) },
        }}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />
    </ConfigProvider>)

    expect(screen.getByRole('checkbox', { name: /read:pets/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /write:pets/i })).not.toBeChecked()
  })
})

describe('OAuth2Auth client-authentication method select', () => {
  beforeEach(() => {
    vi.mocked(exchangeClientCredentials).mockReset()
  })
  afterEach(() => {
    cleanup(); vi.restoreAllMocks()
  })

  function renderCC(scheme: AuthScheme, appliedValue?: AppliedAuthValue) {
    return render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth
        scheme={scheme}
        applied={Boolean(appliedValue)}
        appliedValue={appliedValue}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />
    </ConfigProvider>)
  }

  const authSelect = () =>
    screen.getByRole('combobox', { name: /send client authentication in/i }) as HTMLSelectElement

  it('renders a labelled select with Authorization Header / Request Body, defaulting to header', () => {
    renderCC(clientCredsScheme)
    const select = authSelect()
    expect(select.value).toBe('header')
    expect(screen.getByRole('option', { name: /authorization header/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /request body/i })).toBeInTheDocument()
  })

  it('hides the select on the Free tier — the whole credential column is Pro-only', () => {
    // The client-authentication select lives inside the Client ID/Secret column,
    // which only exists to obtain a token interactively. On Free that column is
    // hidden entirely, so the select is too (ABOSPEC-215 Free-tier fix).
    render(<OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByRole('combobox', { name: /send client authentication in/i })).not.toBeInTheDocument()
  })

  it('does not render the select for a public PKCE client (no Client Secret input)', () => {
    // Authorization-code flow only — the credentials column renders a secret
    // field, so the select shows. A scheme with no confidential flow (only a
    // token-paste surface) must not render it.
    const noSecretScheme: AuthScheme = {
      id: 'implicit_only', type: 'oauth2', displayName: 'implicit_only',
      flows: { implicit: { authorizationUrl: 'https://auth.example.com/authorize', scopes: {} } },
    }
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>
      <OAuth2Auth scheme={noSecretScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)
    expect(screen.queryByPlaceholderText('Client Secret')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /send client authentication in/i })).not.toBeInTheDocument()
  })

  it("preselects Request Body when x-tokenEndpointAuthMethod maps to 'body'", () => {
    renderCC({ ...clientCredsScheme, tokenEndpointAuthMethod: 'body' })
    expect(authSelect().value).toBe('body')
  })

  it("preselects Authorization Header when x-tokenEndpointAuthMethod maps to 'header'", () => {
    renderCC({ ...clientCredsScheme, tokenEndpointAuthMethod: 'header' })
    expect(authSelect().value).toBe('header')
  })

  it('passes the selected method to the client-credentials exchange', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    renderCC(clientCredsScheme)

    fireEvent.change(authSelect(), { target: { value: 'body' } })
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({ clientAuth: 'body' }))
  })

  it('persists the selected method in the applied value and restores it on reopen', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    const onApply = vi.fn()
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={clientCredsScheme} onApply={onApply} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.change(authSelect(), { target: { value: 'body' } })
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    const input = onApply.mock.calls.at(-1)?.[0].input
    expect(input.clientAuth).toBe('body')

    // Reopen with the persisted input — the select rehydrates to Request Body.
    cleanup()
    renderCC(clientCredsScheme, {
      schemeId: 'petstore_auth',
      headerName: 'Authorization',
      headerValue: 'Bearer x',
      input,
    })
    expect(authSelect().value).toBe('body')
  })

  it('prefers the persisted method over the x-tokenEndpointAuthMethod default when restoring', () => {
    renderCC({ ...clientCredsScheme, tokenEndpointAuthMethod: 'header' }, {
      schemeId: 'petstore_auth',
      headerName: 'Authorization',
      headerValue: 'Bearer x',
      input: { clientAuth: 'body' },
    })
    expect(authSelect().value).toBe('body')
  })
})

const enumVarScheme: AuthScheme = {
  id: 'petstore_auth', type: 'oauth2', displayName: 'petstore_auth',
  flows: {
    clientCredentials: {
      tokenUrl: 'https://{env}.auth.example.com/oauth/token',
      scopes: { 'read:pets': 'Read pets' },
      variables: {
        env: { default: 'dev', enum: ['dev', 'staging', 'prod'], description: 'Environment' },
      },
    },
  },
}

const textVarScheme: AuthScheme = {
  id: 'petstore_auth', type: 'oauth2', displayName: 'petstore_auth',
  flows: {
    clientCredentials: {
      tokenUrl: 'https://auth.example.com/{tenant}/token',
      scopes: { 'read:pets': 'Read pets' },
      variables: {
        tenant: { default: 'acme', description: 'Tenant slug' },
      },
    },
  },
}

describe('OAuth2Auth flow URL variables (ABOSPEC-221)', () => {
  beforeEach(() => {
    vi.mocked(exchangeClientCredentials).mockReset()
  })
  afterEach(() => {
    cleanup(); vi.restoreAllMocks()
  })

  const varInput = (name: string) => screen.getByRole(
    'combobox', { name: new RegExp(`^${name}$`, 'i') },
  ) as HTMLSelectElement

  it('renders a <select> for an enum-constrained variable, defaulting to its default', () => {
    render(<OAuth2Auth scheme={enumVarScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    const select = varInput('env')
    expect(select.value).toBe('dev')
    expect(screen.getByRole('option', { name: 'staging' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'prod' })).toBeInTheDocument()
  })

  it('renders a text input for a free-text variable, defaulting to its default', () => {
    render(<OAuth2Auth scheme={textVarScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: /^tenant$/i }) as HTMLInputElement
    expect(input.value).toBe('acme')
  })

  it('substitutes the default into the displayed Token URL', () => {
    render(<OAuth2Auth scheme={enumVarScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('https://dev.auth.example.com/oauth/token')).toBeInTheDocument()
  })

  it('re-renders the displayed Token URL when a variable value changes', () => {
    render(<OAuth2Auth scheme={enumVarScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    fireEvent.change(varInput('env'), { target: { value: 'prod' } })
    expect(screen.getByText('https://prod.auth.example.com/oauth/token')).toBeInTheDocument()
  })

  it('substitutes into the Token URL before resolving it against the selected server', () => {
    // Relative templated URL + server: substitution then server-resolution compose.
    const relVarScheme: AuthScheme = {
      id: 'petstore_auth', type: 'oauth2', displayName: 'petstore_auth',
      flows: {
        clientCredentials: {
          tokenUrl: '/{tenant}/oauth/token',
          scopes: {},
          variables: { tenant: { default: 'acme' } },
        },
      },
    }
    render(<OAuth2Auth scheme={relVarScheme} onApply={vi.fn()} onRemove={vi.fn()} serverUrl="https://api.example.com" />)
    expect(screen.getByText('https://api.example.com/acme/oauth/token')).toBeInTheDocument()
  })

  it('exchanges against the substituted+resolved Token URL', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={enumVarScheme} onApply={vi.fn()} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.change(varInput('env'), { target: { value: 'staging' } })
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(exchangeClientCredentials).toHaveBeenCalledWith(expect.objectContaining({
      tokenUrl: 'https://staging.auth.example.com/oauth/token',
    })))
  })

  it('persists the selected variable values in the applied input when a token is obtained', async () => {
    vi.mocked(exchangeClientCredentials).mockResolvedValue({ accessToken: 'x', tokenType: 'Bearer' })
    const onApply = vi.fn()
    render(<ConfigProvider config={{ interactiveOAuthEnabled: true, proxyUrl: '/api/proxy' }}>
      <OAuth2Auth scheme={enumVarScheme} onApply={onApply} onRemove={vi.fn()} />
    </ConfigProvider>)

    fireEvent.change(varInput('env'), { target: { value: 'prod' } })
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'id' } })
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get token/i }))
    })

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    const input = onApply.mock.calls.at(-1)?.[0].input
    expect(JSON.parse(input.flowVariables)).toEqual({ clientCredentials: { env: 'prod' } })
  })

  it('restores persisted variable values from the applied input on reopen', () => {
    render(<OAuth2Auth
      scheme={enumVarScheme}
      applied
      appliedValue={{
        schemeId: 'petstore_auth',
        headerName: 'Authorization',
        headerValue: 'Bearer x',
        input: { flowVariables: JSON.stringify({ clientCredentials: { env: 'staging' } }) },
      }}
      onApply={vi.fn()}
      onRemove={vi.fn()}
    />)
    expect(varInput('env').value).toBe('staging')
    expect(screen.getByText('https://staging.auth.example.com/oauth/token')).toBeInTheDocument()
  })
})

describe('OAuth2Auth scheme description', () => {
  afterEach(cleanup)

  it('renders a markdown description as HTML elements, not literal characters', () => {
    const { container } = render(
      <OAuth2Auth
        scheme={{ ...scheme, description: 'Use **bold** and `code` here.' }}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(container.querySelector('strong')).toHaveTextContent('bold')
    expect(container.querySelector('code')).toHaveTextContent('code')
    // The raw markdown markers must not survive to the rendered text.
    expect(screen.queryByText(/\*\*bold\*\*/)).not.toBeInTheDocument()
  })
})

describe('OAuth2Auth manual token apply', () => {
  afterEach(cleanup)

  it('shows an inline message and does not apply when Apply is clicked with an empty token', () => {
    const onApply = vi.fn()
    render(<OAuth2Auth scheme={scheme} onApply={onApply} onRemove={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/access token/i)
  })

  it('applies the token and shows no message when a token is entered', () => {
    const onApply = vi.fn()
    render(<OAuth2Auth scheme={scheme} onApply={onApply} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Access token'), { target: { value: 'tok-123' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      schemeId: 'petstore_auth',
      headerName: 'Authorization',
      headerValue: 'Bearer tok-123',
    }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clears the inline message once the user starts typing a token', () => {
    render(<OAuth2Auth scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Access token'), { target: { value: 't' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('OAuth2Auth Free-tier credential hiding (ABOSPEC-215)', () => {
  afterEach(cleanup)

  const authCodeScheme: AuthScheme = {
    id: 'petstore_auth', type: 'oauth2', displayName: 'petstore_auth',
    flows: {
      authorizationCode: {
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: { 'read:pets': 'Read pets' },
      },
    },
  }

  for (const [flowName, flowScheme] of [
    ['client-credentials', clientCredsScheme],
    ['authorization-code', authCodeScheme],
  ] as const) {
    it(`hides Client ID/Secret and uses the standalone token label on Free (${flowName})`, () => {
      render(<OAuth2Auth scheme={flowScheme} onApply={vi.fn()} onRemove={vi.fn()} />)

      // No credential inputs — there is no interactive token retrieval on Free.
      expect(screen.queryByPlaceholderText('Client ID')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Client Secret')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /get token/i })).not.toBeInTheDocument()

      // Manual paste stays — the only way to authorize on Free — with the
      // standalone label (no "Or … directly" wording).
      expect(screen.getByPlaceholderText('Access token')).toBeInTheDocument()
      expect(screen.getByText('Enter access token:')).toBeInTheDocument()
      expect(screen.queryByText(/or enter access token directly/i)).not.toBeInTheDocument()

      // Scopes remain visible (read-only).
      expect(screen.getByText('read:pets')).toBeInTheDocument()
    })

    it(`shows Client ID/Secret and the "Or … directly" label on Pro (${flowName})`, () => {
      render(<ConfigProvider config={{ interactiveOAuthEnabled: true }}>
        <OAuth2Auth scheme={flowScheme} onApply={vi.fn()} onRemove={vi.fn()} />
      </ConfigProvider>)

      expect(screen.getByPlaceholderText('Client ID')).toBeInTheDocument()
      // The secret is optional for public-client flows (auth-code + PKCE).
      const secretPlaceholder =
        flowName === 'client-credentials' ? 'Client Secret' : 'Client Secret (optional)'
      expect(screen.getByPlaceholderText(secretPlaceholder)).toBeInTheDocument()
      expect(screen.getByText('Or enter access token directly:')).toBeInTheDocument()
      expect(screen.queryByText('Enter access token:')).not.toBeInTheDocument()
    })
  }

  it('still applies a manually pasted token on Free', () => {
    const onApply = vi.fn()
    render(<OAuth2Auth scheme={clientCredsScheme} onApply={onApply} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Access token'), { target: { value: 'free-tok' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      schemeId: 'petstore_auth',
      headerName: 'Authorization',
      headerValue: 'Bearer free-tok',
    }))
  })
})

describe('OAuth2Auth panel layout & remove behavior (ABOSPEC-218)', () => {
  afterEach(cleanup)

  it('renders the client-authentication select above the Client ID field', () => {
    renderWithPro(<OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />)

    const select = screen.getByLabelText('Send client authentication in')
    const clientId = screen.getByPlaceholderText('Client ID')

    // The select must precede the Client ID input in document order.
    expect(select.compareDocumentPosition(clientId) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('clears the access token field when Remove is clicked', () => {
    const onRemove = vi.fn()
    const appliedValue: AppliedAuthValue = {
      schemeId: clientCredsScheme.id,
      headerName: 'Authorization',
      headerValue: 'Bearer abc123',
      input: { token: 'abc123', clientId: '', clientSecret: '', scopeSelection: '{}', clientAuth: 'header' },
    }
    renderWithPro(
      <OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={onRemove} applied appliedValue={appliedValue} />,
    )

    const tokenField = screen.getByLabelText('petstore_auth access token') as HTMLInputElement
    expect(tokenField.value).toBe('abc123')

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemove).toHaveBeenCalledWith('petstore_auth')
    expect(tokenField.value).toBe('')
  })
})

describe('client secret labeling', () => {
  afterEach(() => {
    cleanup()
  })

  it('marks the secret optional for authorization-code (PKCE) flows', () => {
    renderWithPro(<OAuth2Auth scheme={scheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByPlaceholderText('Client Secret (optional)')).toBeInTheDocument()
  })

  it('keeps the secret required for client-credentials flows', () => {
    renderWithPro(<OAuth2Auth scheme={clientCredsScheme} onApply={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByPlaceholderText('Client Secret')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Client Secret (optional)')).not.toBeInTheDocument()
  })
})
