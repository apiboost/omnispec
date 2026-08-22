/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { parse as parseYaml } from 'yaml'
import { resolveRefs } from './ref-resolver'
import type { ResolveRefsOptions } from './ref-resolver'
import type {
  ParsedOpenApiSpec,
  OpenApiServer,
  OpenApiTag,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,
  OpenApiComponents,
} from '../types/openapi.types'
import type { AuthScheme } from '../../core/types/auth.types'

interface OpenAPIDocument {
  openapi?: string
  swagger?: string
  info: { title: string; description?: string; version: string; contact?: Record<string, string>; license?: Record<string, string>; termsOfService?: string }
  servers?: Array<{ url: string; description?: string; variables?: Record<string, { default: string; description?: string; enum?: string[] }> }>
  host?: string
  basePath?: string
  schemes?: string[]
  paths: Record<string, Record<string, OperationObject>>
  // OpenAPI 3.1 top-level webhooks (path-item shaped, keyed by webhook name).
  webhooks?: Record<string, Record<string, OperationObject>>
  tags?: Array<{ name: string; description?: string }>
  components?: { schemas?: Record<string, unknown>; securitySchemes?: Record<string, SecuritySchemeObject>; responses?: Record<string, unknown>; parameters?: Record<string, unknown>; requestBodies?: Record<string, unknown> }
  securityDefinitions?: Record<string, SecuritySchemeObject>
  // Root-level security requirements (apply to all operations unless overridden).
  security?: Array<Record<string, string[]>>
  externalDocs?: { description?: string; url: string }
}

interface OperationObject {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: ParameterObject[]
  requestBody?: RequestBodyObject
  responses?: Record<string, ResponseObject>
  security?: Array<Record<string, string[]>>
  callbacks?: Record<string, unknown>
  externalDocs?: { description?: string; url: string }
}

interface ParameterObject {
  name: string
  in: string
  required?: boolean
  description?: string
  deprecated?: boolean
  schema?: Record<string, unknown>
  type?: string
  format?: string
  enum?: unknown[]
  example?: unknown
  examples?: Record<string, { summary?: string; value: unknown }>
  style?: string
  explode?: boolean
}

interface RequestBodyObject {
  description?: string
  required?: boolean
  content: Record<string, { schema?: Record<string, unknown>; example?: unknown; examples?: Record<string, { summary?: string; value: unknown }> }>
}

interface ResponseObject {
  description?: string
  content?: Record<string, { schema?: Record<string, unknown>; example?: unknown; examples?: Record<string, { summary?: string; value: unknown }> }>
  headers?: Record<string, { description?: string; schema?: Record<string, unknown> }>
}

interface SecuritySchemeObject {
  type: string
  description?: string
  name?: string
  in?: string
  scheme?: string
  flows?: Record<string, {
    authorizationUrl?: string
    tokenUrl?: string
    refreshUrl?: string
    scopes?: Record<string, string>
    /** OmniSpec `x-flowVariables` — URL templating variables for this flow (ABOSPEC-221). */
    'x-flowVariables'?: Record<string, { default: string; enum?: string[]; description?: string }>
  }>
  /** Preselects the token-endpoint client-authentication method for confidential clients. */
  'x-tokenEndpointAuthMethod'?: string
  /** OpenID Connect discovery document URL (an `openIdConnect` security scheme). */
  openIdConnectUrl?: string
  // Swagger 2.0 fields
  flow?: string
  authorizationUrl?: string
  tokenUrl?: string
  scopes?: Record<string, string>
}

export async function parseOpenApiSpec(
  specInput: string | Record<string, unknown>,
  refOptions?: ResolveRefsOptions,
): Promise<ParsedOpenApiSpec> {
  // Parse and resolve $refs using our lightweight browser-compatible resolver
  const raw = typeof specInput === 'string' ? parseSpecString(specInput) : specInput
  const api = await resolveRefs(raw as Record<string, unknown>, refOptions) as unknown as OpenAPIDocument

  const isSwagger2 = !!api.swagger
  const specVersion = api.openapi ?? api.swagger ?? 'unknown'

  // Extract servers
  const servers = extractServers(api, isSwagger2)

  // Extract security schemes
  const securitySchemes = extractSecuritySchemes(api, isSwagger2)

  // Extract operations grouped by tags
  const tags = extractTaggedOperations(api, isSwagger2)

  // Extract components/schemas
  const components = extractComponents(api, isSwagger2)

  // Extract OpenAPI 3.1 top-level webhooks (normalized to operations)
  const webhooks = extractWebhooks(api, isSwagger2)

  const root = api as unknown as Record<string, unknown>

  return {
    title: api.info.title,
    description: api.info.description,
    version: api.info.version,
    specVersion,
    servers,
    tags,
    tagGroups: root['x-tagGroups'] as ParsedOpenApiSpec['tagGroups'],
    securitySchemes,
    components,
    externalDocs: api.externalDocs,
    contact: api.info.contact as ParsedOpenApiSpec['contact'],
    license: api.info.license as ParsedOpenApiSpec['license'],
    termsOfService: api.info.termsOfService,
    logo: (api.info as Record<string, unknown>)['x-logo'] as ParsedOpenApiSpec['logo'],
    webhooks,
  }
}

/**
 * Extracts OpenAPI 3.1 top-level `webhooks` into normalized operations. Each
 * webhook is a path-item keyed by name; its methods become operations whose
 * `path` is the webhook name. Returns undefined when there are no webhooks.
 */
function extractWebhooks(api: OpenAPIDocument, isSwagger2: boolean): OpenApiOperation[] | undefined {
  if (!api.webhooks) return undefined
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const
  const operations: OpenApiOperation[] = []

  for (const [name, pathItem] of Object.entries(api.webhooks)) {
    const pathLevelParams = (pathItem as Record<string, unknown>).parameters as ParameterObject[] | undefined
    for (const method of methods) {
      const operation = pathItem[method] as OperationObject | undefined
      if (!operation) continue
      const op = convertOperation(method, name, operation, isSwagger2, pathLevelParams)
      if (op.xInternal) continue
      operations.push(op)
    }
  }

  return operations.length > 0 ? operations : undefined
}

function extractServers(api: OpenAPIDocument, isSwagger2: boolean): OpenApiServer[] {
  if (!isSwagger2 && api.servers) {
    return api.servers.map((s) => ({
      url: s.url,
      description: s.description,
      variables: s.variables,
    }))
  }

  // Swagger 2.0: construct from host + basePath + schemes
  if (isSwagger2 && api.host) {
    const schemes = api.schemes ?? ['https']
    return schemes.map((scheme) => ({
      url: `${scheme}://${api.host}${api.basePath ?? ''}`,
    }))
  }

  return [{ url: '/' }]
}

function extractSecuritySchemes(api: OpenAPIDocument, isSwagger2: boolean): AuthScheme[] {
  const schemes: AuthScheme[] = []
  const defs = isSwagger2
    ? api.securityDefinitions
    : api.components?.securitySchemes

  if (!defs) return schemes

  for (const [id, def] of Object.entries(defs)) {
    const scheme = convertSecurityScheme(id, def)
    if (scheme) schemes.push(scheme)
  }

  return schemes
}

/**
 * Collects every `x-*` vendor-extension key from a raw object, verbatim. Returns
 * undefined when there are none so the model field stays absent. The free core
 * does not interpret these; Pro reads them for the interactive OAuth flow.
 */
function pickXExtensions(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('x-')) out[key] = value
  }
  return Object.keys(out).length ? out : undefined
}

function convertSecurityScheme(id: string, def: SecuritySchemeObject): AuthScheme | null {
  switch (def.type) {
    case 'apiKey':
      return {
        id,
        type: 'apiKey',
        displayName: id,
        description: def.description,
        in: def.in as 'header' | 'query' | 'cookie',
        name: def.name,
      }
    case 'http':
      return {
        id,
        type: def.scheme === 'basic' ? 'http-basic' : 'http-bearer',
        displayName: id,
        description: def.description,
        scheme: def.scheme as 'basic' | 'bearer',
      }
    case 'oauth2':
      return {
        id,
        type: 'oauth2',
        displayName: id,
        description: def.description,
        // Raw scheme-level x-* passthrough (Pro interprets; free core does not).
        extensions: pickXExtensions(def as unknown as Record<string, unknown>),
        flows: def.flows ? Object.fromEntries(
          Object.entries(def.flows).map(([flowType, flow]) => [
            flowType,
            {
              authorizationUrl: flow.authorizationUrl,
              tokenUrl: flow.tokenUrl,
              refreshUrl: flow.refreshUrl,
              scopes: flow.scopes ?? {},
              // Raw flow-level x-* passthrough (Pro interprets; free core does not).
              extensions: pickXExtensions(flow as unknown as Record<string, unknown>),
            },
          ]),
        ) : undefined,
      }
    case 'openIdConnect':
      // The flows are not known statically — they come from the OpenID
      // configuration fetched at Try-It time from `openIdConnectUrl`. The
      // Authorize panel discovers and maps them into the OAuth2 flow model.
      return {
        id,
        type: 'openIdConnect',
        displayName: id,
        description: def.description,
        openIdConnectUrl: def.openIdConnectUrl,
      }
    case 'basic':
      // Swagger 2.0
      return {
        id,
        type: 'http-basic',
        displayName: id,
        description: def.description,
        scheme: 'basic',
      }
    default:
      return null
  }
}

function extractTaggedOperations(api: OpenAPIDocument, isSwagger2: boolean): OpenApiTag[] {
  const tagMap = new Map<string, OpenApiOperation[]>()
  const definedTags = new Map<string, { description?: string; displayName?: string; externalDocs?: { description?: string; url: string }; xInternal?: boolean }>()

  // Register defined tags
  if (api.tags) {
    for (const tag of api.tags) {
      const raw = tag as Record<string, unknown>
      definedTags.set(tag.name, {
        description: tag.description,
        displayName: raw['x-displayName'] as string | undefined,
        externalDocs: raw.externalDocs as OpenApiTag['externalDocs'],
        xInternal: raw['x-internal'] as boolean | undefined,
      })
      tagMap.set(tag.name, [])
    }
  }

  // Root-level security applies to every operation unless the operation
  // declares its own `security` (including an explicit empty array).
  const globalSecurity = api.security?.map((s) => Object.keys(s))

  // Process all paths and operations
  for (const [path, pathItem] of Object.entries(api.paths)) {
    // Path-level parameters are inherited by all operations on this path
    const pathLevelParams = (pathItem as Record<string, unknown>).parameters as ParameterObject[] | undefined
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const
    for (const method of methods) {
      const operation = pathItem[method] as OperationObject | undefined
      if (!operation) continue

      const op = convertOperation(method, path, operation, isSwagger2, pathLevelParams, globalSecurity)
      if (op.xInternal) continue
      const opTags = op.tags.length > 0 ? op.tags : ['default']

      for (const tagName of opTags) {
        if (!tagMap.has(tagName)) {
          tagMap.set(tagName, [])
        }
        tagMap.get(tagName)!.push(op)
      }
    }
  }

  return Array.from(tagMap.entries())
    .filter(([name, ops]) => ops.length > 0 && !definedTags.get(name)?.xInternal)
    .map(([name, operations]) => ({
      name,
      displayName: definedTags.get(name)?.displayName,
      description: definedTags.get(name)?.description,
      externalDocs: definedTags.get(name)?.externalDocs,
      operations,
    }))
}

function convertOperation(
  method: string,
  path: string,
  op: OperationObject,
  isSwagger2: boolean,
  pathLevelParams?: ParameterObject[],
  globalSecurity?: string[][],
): OpenApiOperation {
  // Merge path-level params with operation params; operation-level overrides by name+in
  const mergedRawParams = mergeParameters(pathLevelParams, op.parameters)
  const parameters: OpenApiParameter[] = mergedRawParams.map((p) => ({
    name: p.name,
    in: p.in as OpenApiParameter['in'],
    required: p.required ?? p.in === 'path',
    description: p.description,
    deprecated: p.deprecated,
    schema: p.schema ?? (isSwagger2 ? { type: p.type, format: p.format, enum: p.enum } : undefined),
    example: p.example,
    examples: p.examples,
    style: p.style,
    explode: p.explode,
  }))

  let requestBody: OpenApiRequestBody | undefined
  if (op.requestBody) {
    requestBody = {
      description: op.requestBody.description,
      required: op.requestBody.required,
      content: op.requestBody.content,
    }
  }

  const responses: OpenApiResponse[] = op.responses
    ? Object.entries(op.responses).map(([code, resp]) => ({
      statusCode: code,
      description: resp.description ?? '',
      content: resp.content,
      headers: resp.headers,
    }))
    : []

  // Operation-level security overrides global (an explicit [] disables auth).
  const security = op.security
    ? op.security.map((s) => Object.keys(s))
    : globalSecurity

  return {
    operationId: op.operationId,
    summary: op.summary,
    description: op.description,
    method,
    path,
    tags: op.tags ?? [],
    deprecated: op.deprecated,
    parameters,
    requestBody,
    responses,
    security: security?.flat() ? security.map((s) => s) : undefined,
    callbacks: op.callbacks,
    externalDocs: op.externalDocs,
    xCodeSamples: ((op as Record<string, unknown>)['x-codeSamples']
      ?? (op as Record<string, unknown>)['x-code-samples']) as OpenApiOperation['xCodeSamples'],
    xBadges: (op as Record<string, unknown>)['x-badges'] as OpenApiOperation['xBadges'],
    xInternal: (op as Record<string, unknown>)['x-internal'] as boolean | undefined,
  }
}

function extractComponents(api: OpenAPIDocument, isSwagger2: boolean): OpenApiComponents {
  if (!isSwagger2 && api.components) {
    return {
      schemas: (api.components.schemas ?? {}) as Record<string, Record<string, unknown>>,
      responses: api.components.responses,
      parameters: api.components.parameters,
      requestBodies: api.components.requestBodies,
    }
  }

  // Swagger 2.0: definitions -> schemas
  const rawApi = api as unknown as Record<string, unknown>
  return {
    schemas: (rawApi.definitions ?? {}) as Record<string, Record<string, unknown>>,
  }
}

function mergeParameters(
  pathLevel?: ParameterObject[],
  operationLevel?: ParameterObject[],
): ParameterObject[] {
  if (!pathLevel?.length) return operationLevel ?? []
  if (!operationLevel?.length) return pathLevel

  // Operation-level params override path-level params with same name+in
  const opKeys = new Set(operationLevel.map((p) => `${p.in}:${p.name}`))
  const inherited = pathLevel.filter((p) => !opKeys.has(`${p.in}:${p.name}`))
  return [...operationLevel, ...inherited]
}

function parseSpecString(input: string): Record<string, unknown> {
  const trimmed = input.trim()
  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Fall through to YAML
    }
  }
  // Parse as YAML (also handles JSON)
  return parseYaml(trimmed) as Record<string, unknown>
}
