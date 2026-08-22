/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseOpenApiSpec } from './openapi-parser'
import petstoreSpec from '../../__fixtures__/petstore-minimal.json'
import oas31Spec from '../../__fixtures__/openapi-3.1.json'

const oauthFlowVariablesSpec = readFileSync(
  resolve(__dirname, '../../__fixtures__/oauth-flow-variables.yaml'),
  'utf-8',
)

describe('parseOpenApiSpec', () => {
  it('parses a valid OpenAPI 3.0 spec', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    expect(result.title).toBe('Petstore')
    expect(result.version).toBe('1.0.0')
    expect(result.specVersion).toBe('3.0.3')
    expect(result.description).toBe('A minimal petstore API')
  })

  it('extracts servers', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    expect(result.servers).toHaveLength(2)
    expect(result.servers[0].url).toBe('https://api.petstore.example.com/v1')
    expect(result.servers[0].description).toBe('Production')
    expect(result.servers[1].url).toBe('https://staging.petstore.example.com/v1')
  })

  it('extracts security schemes', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    expect(result.securitySchemes).toHaveLength(2)
    const bearer = result.securitySchemes.find((s) => s.id === 'bearerAuth')
    expect(bearer).toBeDefined()
    expect(bearer!.type).toBe('http-bearer')

    const apiKey = result.securitySchemes.find((s) => s.id === 'apiKey')
    expect(apiKey).toBeDefined()
    expect(apiKey!.type).toBe('apiKey')
    expect(apiKey!.in).toBe('header')
    expect(apiKey!.name).toBe('X-API-Key')
  })

  it('maps x-tokenEndpointAuthMethod on an OAuth2 scheme to a token-endpoint auth default', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      paths: {},
      components: {
        securitySchemes: {
          basicAuthScheme: {
            type: 'oauth2',
            'x-tokenEndpointAuthMethod': 'client_secret_basic',
            flows: { clientCredentials: { tokenUrl: 'https://a/token', scopes: {} } },
          },
          postAuthScheme: {
            type: 'oauth2',
            'x-tokenEndpointAuthMethod': 'client_secret_post',
            flows: { clientCredentials: { tokenUrl: 'https://a/token', scopes: {} } },
          },
          noneScheme: {
            type: 'oauth2',
            flows: { clientCredentials: { tokenUrl: 'https://a/token', scopes: {} } },
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const basic = result.securitySchemes.find((s) => s.id === 'basicAuthScheme')!
    const post = result.securitySchemes.find((s) => s.id === 'postAuthScheme')!
    const none = result.securitySchemes.find((s) => s.id === 'noneScheme')!

    expect(basic.tokenEndpointAuthMethod).toBe('header')
    expect(post.tokenEndpointAuthMethod).toBe('body')
    // Absent extension → left undefined; OAuth2Auth applies the Authorization-Header default.
    expect(none.tokenEndpointAuthMethod).toBeUndefined()
  })

  it('carries raw oauth x-* extensions generically at scheme and flow level', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      paths: {},
      components: {
        securitySchemes: {
          envAuth: {
            type: 'oauth2',
            'x-tokenEndpointAuthMethod': 'client_secret_basic',
            flows: {
              clientCredentials: {
                tokenUrl: 'https://{env}.auth.example.com/oauth/token',
                scopes: {},
                'x-flowVariables': { env: { default: 'dev', enum: ['dev', 'prod'] } },
              },
            },
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const scheme = result.securitySchemes.find((s) => s.id === 'envAuth')!
    // Scheme-level raw passthrough (interpretation happens in Pro).
    expect(scheme.extensions?.['x-tokenEndpointAuthMethod']).toBe('client_secret_basic')
    // Flow-level raw passthrough (per-flow x-flowVariables cannot live in a scheme map).
    expect(scheme.flows!.clientCredentials!.extensions?.['x-flowVariables']).toEqual({
      env: { default: 'dev', enum: ['dev', 'prod'] },
    })
    // Additive: the existing typed fields remain populated until Phase C.
    expect(scheme.tokenEndpointAuthMethod).toBe('header')
    expect(scheme.flows!.clientCredentials!.variables).toBeDefined()
  })

  it('reads x-flowVariables off an OAuth2 flow into the flow model (ABOSPEC-221)', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      paths: {},
      components: {
        securitySchemes: {
          envAuth: {
            type: 'oauth2',
            flows: {
              clientCredentials: {
                tokenUrl: 'https://{env}.auth.example.com/oauth/token',
                scopes: {},
                'x-flowVariables': {
                  env: { default: 'dev', enum: ['dev', 'staging', 'prod'], description: 'Environment' },
                },
              },
            },
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const scheme = result.securitySchemes.find((s) => s.id === 'envAuth')!
    const flow = scheme.flows!.clientCredentials!
    expect(flow.tokenUrl).toBe('https://{env}.auth.example.com/oauth/token')
    expect(flow.variables).toEqual({
      env: { default: 'dev', enum: ['dev', 'staging', 'prod'], description: 'Environment' },
    })
  })

  it('parses x-flowVariables from the oauth-flow-variables fixture (ABOSPEC-221)', async () => {
    const result = await parseOpenApiSpec(oauthFlowVariablesSpec)

    const envAuth = result.securitySchemes.find((s) => s.id === 'envAuth')!
    const cc = envAuth.flows!.clientCredentials!
    expect(cc.tokenUrl).toBe('https://{env}.auth.example.com/oauth/token')
    expect(cc.variables!.env).toEqual({
      default: 'dev', enum: ['dev', 'staging', 'prod'], description: 'Deployment environment',
    })

    // Relative templated token URL with two variables.
    const tenantAuth = result.securitySchemes.find((s) => s.id === 'tenantAuth')!
    const ac = tenantAuth.flows!.authorizationCode!
    expect(ac.tokenUrl).toBe('/{tenant}/oauth/token')
    expect(Object.keys(ac.variables!)).toEqual(['env', 'tenant'])
    expect(ac.variables!.tenant.default).toBe('acme')
  })

  it('leaves flow.variables undefined when x-flowVariables is absent (ABOSPEC-221)', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      paths: {},
      components: {
        securitySchemes: {
          plain: {
            type: 'oauth2',
            flows: { clientCredentials: { tokenUrl: 'https://a/token', scopes: {} } },
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const flow = result.securitySchemes.find((s) => s.id === 'plain')!.flows!.clientCredentials!
    expect(flow.variables).toBeUndefined()
  })

  it('converts an openIdConnect security scheme (ABOSPEC-215)', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      paths: {},
      components: {
        securitySchemes: {
          oidc: {
            type: 'openIdConnect',
            description: 'Sign in with the corporate IdP',
            openIdConnectUrl: 'https://idp.example.com/.well-known/openid-configuration',
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const oidc = result.securitySchemes.find((s) => s.id === 'oidc')
    expect(oidc).toBeDefined()
    expect(oidc!.type).toBe('openIdConnect')
    expect(oidc!.openIdConnectUrl).toBe('https://idp.example.com/.well-known/openid-configuration')
    expect(oidc!.description).toBe('Sign in with the corporate IdP')
    // Flows are discovered at Try-It time, not statically declared.
    expect(oidc!.flows).toBeUndefined()
  })

  it('extracts tagged operations', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    expect(result.tags).toHaveLength(1)
    expect(result.tags[0].name).toBe('pets')
    expect(result.tags[0].operations).toHaveLength(3)

    const listPets = result.tags[0].operations.find((o) => o.operationId === 'listPets')
    expect(listPets).toBeDefined()
    expect(listPets!.method).toBe('get')
    expect(listPets!.path).toBe('/pets')
    expect(listPets!.parameters).toHaveLength(1)
    expect(listPets!.parameters[0].name).toBe('limit')
    expect(listPets!.parameters[0].in).toBe('query')
  })

  it('extracts request bodies', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    const createPet = result.tags[0].operations.find((o) => o.operationId === 'createPet')
    expect(createPet).toBeDefined()
    expect(createPet!.requestBody).toBeDefined()
    expect(createPet!.requestBody!.required).toBe(true)
    expect(createPet!.requestBody!.content['application/json']).toBeDefined()
  })

  it('extracts responses', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    const getPet = result.tags[0].operations.find((o) => o.operationId === 'getPet')
    expect(getPet).toBeDefined()
    expect(getPet!.responses).toHaveLength(2)
    expect(getPet!.responses[0].statusCode).toBe('200')
    expect(getPet!.responses[1].statusCode).toBe('404')
  })

  it('extracts component schemas', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    expect(Object.keys(result.components.schemas)).toContain('Pet')
    expect(Object.keys(result.components.schemas)).toContain('NewPet')
  })

  it('extracts contact and license info', async () => {
    const result = await parseOpenApiSpec(petstoreSpec)

    expect(result.contact?.name).toBe('API Team')
    expect(result.contact?.email).toBe('api@example.com')
    expect(result.license?.name).toBe('MIT')
  })

  it('handles JSON string input', async () => {
    const result = await parseOpenApiSpec(JSON.stringify(petstoreSpec))

    expect(result.title).toBe('Petstore')
    expect(result.tags).toHaveLength(1)
  })

  it('parses named examples (plural) on parameters', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            operationId: 'listItems',
            tags: ['items'],
            parameters: [
              {
                name: 'status',
                in: 'query',
                schema: { type: 'string' },
                examples: {
                  active: { summary: 'Active items', value: 'active' },
                  archived: { summary: 'Archived items', value: 'archived' },
                },
              },
            ],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const op = result.tags[0].operations[0]
    expect(op.parameters[0].examples).toBeDefined()
    expect(Object.keys(op.parameters[0].examples!)).toEqual(['active', 'archived'])
    expect(op.parameters[0].examples!.active.value).toBe('active')
  })

  it('applies global security to operations without their own (explicit [] disables)', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1.0.0' },
      security: [{ apiKey: [] }],
      components: {
        securitySchemes: {
          apiKey: { type: 'apiKey', name: 'X-Key', in: 'header' },
        },
      },
      paths: {
        '/a': {
          get: { operationId: 'a', tags: ['t'], responses: { '200': { description: 'ok' } } },
        },
        '/b': {
          get: {
            operationId: 'b',
            tags: ['t'],
            security: [],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    }
    const result = await parseOpenApiSpec(spec)
    const ops = result.tags[0].operations
    const a = ops.find((o) => o.operationId === 'a')!
    const b = ops.find((o) => o.operationId === 'b')!
    expect(a.security).toEqual([['apiKey']])
    expect(b.security).toEqual([])
  })

  describe('OpenAPI 3.1', () => {
    it('accepts a 3.1 spec and reports its version', async () => {
      const result = await parseOpenApiSpec(oas31Spec)
      expect(result.specVersion).toBe('3.1.0')
      expect(result.title).toBe('OpenAPI 3.1 Sample')
    })

    it('parses top-level webhooks into operations', async () => {
      const result = await parseOpenApiSpec(oas31Spec)
      expect(result.webhooks).toBeDefined()
      expect(result.webhooks).toHaveLength(1)
      expect(result.webhooks![0].operationId).toBe('widgetCreatedWebhook')
      expect(result.webhooks![0].method).toBe('post')
      expect(result.webhooks![0].path).toBe('widgetCreated')
    })
  })
})
