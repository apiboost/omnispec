/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export interface SchemaDiscriminator {
  propertyName: string
  mapping?: Record<string, string>
}

export interface SchemaNode {
  name: string
  type: string
  format?: string
  title?: string
  description?: string
  required: boolean
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  enum?: unknown[]
  enumDescriptions?: Record<string, string>
  default?: unknown
  example?: unknown
  pattern?: string
  nullable?: boolean
  constraints: string[]
  children?: SchemaNode[]
  compositionType?: 'allOf' | 'oneOf' | 'anyOf'
  compositionChildren?: SchemaNode[][]
  /** Human-readable label per composition branch (discriminator/title/schema name). */
  compositionBranchLabels?: string[]
  /** Discriminator metadata for a oneOf/anyOf node. */
  discriminator?: SchemaDiscriminator
  /** Name of the referenced component schema when this node is a bare `$ref`. */
  refTarget?: string
}

interface JsonSchema {
  type?: string | string[]
  format?: string
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  enum?: unknown[]
  const?: unknown
  default?: unknown
  example?: unknown
  examples?: unknown[]
  pattern?: string
  nullable?: boolean
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  minimum?: number
  maximum?: number
  // OAS 3.1 (JSON Schema 2020-12) uses numbers; OAS 3.0 uses booleans paired
  // with minimum/maximum.
  exclusiveMinimum?: number | boolean
  exclusiveMaximum?: number | boolean
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  $ref?: string
  additionalProperties?: boolean | JsonSchema
  title?: string
  discriminator?: { propertyName: string; mapping?: Record<string, string> }
  [key: string]: unknown
}

const MAX_DEPTH = 10

export function schemaToNodes(
  schema: JsonSchema,
  name = '',
  requiredFields: string[] = [],
  depth = 0,
  visited = new Set<string>(),
): SchemaNode[] {
  if (depth > MAX_DEPTH) return []

  // Handle $ref (shouldn't appear if spec is resolved, but just in case)
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() ?? schema.$ref
    if (visited.has(refName)) {
      return [{
        name: name || refName,
        type: `${refName} (circular)`,
        required: requiredFields.includes(name),
        constraints: [],
        description: 'Circular reference',
      }]
    }
    return [{
      name: name || refName,
      type: refName,
      required: requiredFields.includes(name),
      constraints: [],
      description: `Reference to ${refName}`,
      refTarget: refName,
    }]
  }

  // Handle composition (allOf, oneOf, anyOf)
  for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) {
    if (schema[keyword]) {
      return handleComposition(schema, keyword, name, requiredFields, depth, visited)
    }
  }

  const type = resolveType(schema)
  const constraints = buildConstraints(schema)
  const isRequired = requiredFields.includes(name)

  const node: SchemaNode = {
    name,
    type,
    format: schema.format,
    title: schema.title,
    description: schema.description,
    required: isRequired,
    deprecated: schema.deprecated,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
    enum: schema.enum,
    enumDescriptions: (schema['x-enumDescriptions'] ?? schema['x-enum-descriptions']) as Record<string, string> | undefined,
    default: schema.default,
    example: schema.example ?? schema.examples?.[0],
    pattern: schema.pattern,
    nullable: schema.nullable || isTypeArrayNullable(schema),
    constraints,
  }

  // Object with properties (also handle 3.1 `["object","null"]` type arrays)
  if ((type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))) && schema.properties) {
    const reqFields = schema.required ?? []
    node.children = []
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const childNodes = schemaToNodes(
        propSchema as JsonSchema,
        propName,
        reqFields,
        depth + 1,
        new Set(visited),
      )
      node.children.push(...childNodes)
    }

    // additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const addlNodes = schemaToNodes(
        schema.additionalProperties as JsonSchema,
        '<additional>',
        [],
        depth + 1,
        new Set(visited),
      )
      node.children.push(...addlNodes)
    }
  }

  // Array with items (also handle 3.1 `["array","null"]` type arrays).
  //
  // Compose the item type into the array signature inline — `array<string · uri>`,
  // `array<object>` — instead of emitting a separate "items" row (matches the
  // reference schema designs). The item's enum/enumDescriptions lift onto the
  // array node so e.g. `scopes: array<string>` shows its allowed values, and an
  // object/array item's own properties nest directly (no intermediate wrapper).
  if ((type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'))) && schema.items) {
    const [itemNode] = schemaToNodes(
      schema.items as JsonSchema,
      '',
      [],
      depth + 1,
      new Set(visited),
    )
    if (itemNode) {
      const innerFormat = itemNode.format ? ` · ${itemNode.format}` : ''
      node.type = `array<${itemNode.type}${innerFormat}>`
      if (itemNode.enum) node.enum = itemNode.enum
      if (itemNode.enumDescriptions) node.enumDescriptions = itemNode.enumDescriptions
      // A referenced item type makes the whole signature link to that schema.
      if (itemNode.refTarget) node.refTarget = itemNode.refTarget
      // Object/array items: surface their properties directly under the array.
      if (itemNode.children && itemNode.children.length > 0) {
        node.children = itemNode.children
      }
    }
  }

  return [node]
}

function handleComposition(
  schema: JsonSchema,
  keyword: 'allOf' | 'oneOf' | 'anyOf',
  name: string,
  requiredFields: string[],
  depth: number,
  visited: Set<string>,
): SchemaNode[] {
  const schemas = schema[keyword] as JsonSchema[]

  if (keyword === 'allOf') {
    // Merge allOf schemas into a single object
    const merged = mergeAllOf(schemas)
    return schemaToNodes(merged, name, requiredFields, depth, visited)
  }

  // For oneOf/anyOf, create a node with composition children
  const compositionChildren: SchemaNode[][] = schemas.map((subSchema) =>
    schemaToNodes(subSchema, '', [], depth + 1, new Set(visited)),
  )

  const discriminator = schema.discriminator
  const compositionBranchLabels = schemas.map((subSchema, idx) =>
    branchLabel(subSchema, idx, discriminator),
  )

  const node: SchemaNode = {
    name,
    type: keyword,
    description: schema.description,
    required: requiredFields.includes(name),
    constraints: [],
    compositionType: keyword,
    compositionChildren,
    compositionBranchLabels,
    discriminator: discriminator
      ? { propertyName: discriminator.propertyName, mapping: discriminator.mapping }
      : undefined,
  }

  return [node]
}

/**
 * Derives a human-readable label for a oneOf/anyOf branch. Prefers a
 * discriminator mapping key that points at the branch's `$ref`, then the
 * subschema's `$ref` name, then its `title`, and finally falls back to
 * "Option N".
 */
function branchLabel(
  subSchema: JsonSchema,
  index: number,
  discriminator?: { propertyName: string; mapping?: Record<string, string> },
): string {
  const refName = subSchema.$ref ? subSchema.$ref.split('/').pop() : undefined

  if (discriminator?.mapping) {
    for (const [value, ref] of Object.entries(discriminator.mapping)) {
      const mappedName = ref.split('/').pop()
      // Match by full $ref or by trailing schema name.
      if (subSchema.$ref === ref || (refName && mappedName === refName)) {
        return value
      }
    }
  }

  return refName ?? subSchema.title ?? `Option ${index + 1}`
}

function mergeAllOf(schemas: JsonSchema[]): JsonSchema {
  const merged: JsonSchema = { type: 'object', properties: {}, required: [] }

  for (const schema of schemas) {
    if (schema.properties) {
      merged.properties = { ...merged.properties, ...schema.properties }
    }
    if (schema.required) {
      (merged.required as string[]).push(...schema.required)
    }
    if (schema.description && !merged.description) {
      merged.description = schema.description
    }
    if (schema.type) {
      merged.type = schema.type
    }
  }

  return merged
}

/**
 * OpenAPI 3.1 / JSON Schema 2020-12 allows `type` to be an array, and models
 * nullability as `["string", "null"]`. Returns true when the schema is nullable
 * via a `"null"` entry in a `type` array (independent of the 3.0 `nullable`
 * boolean).
 */
function isTypeArrayNullable(schema: JsonSchema): boolean {
  return Array.isArray(schema.type) && schema.type.includes('null')
}

function resolveType(schema: JsonSchema): string {
  if (schema.type) {
    if (Array.isArray(schema.type)) {
      // Drop the JSON Schema 2020-12 "null" marker — nullability is surfaced
      // separately via the nullable flag — and join any remaining union members.
      const nonNull = schema.type.filter((t) => t !== 'null')
      if (nonNull.length === 0) return 'null'
      return nonNull.join(' | ')
    }
    return schema.type
  }
  if (schema.properties) return 'object'
  if (schema.items) return 'array'
  if (schema.enum) return 'enum'
  if (schema.const !== undefined) return 'const'
  return 'any'
}

export function buildConstraints(schema: JsonSchema): string[] {
  const constraints: string[] = []

  // Number constraints. OAS 3.1 expresses exclusive bounds as numbers; OAS 3.0
  // expresses them as booleans paired with minimum/maximum.
  const exclMin = schema.exclusiveMinimum
  const exclMax = schema.exclusiveMaximum
  if (typeof exclMin === 'number') {
    constraints.push(`> ${exclMin}`)
  } else if (schema.minimum !== undefined) {
    constraints.push(exclMin === true ? `> ${schema.minimum}` : `>= ${schema.minimum}`)
  }
  if (typeof exclMax === 'number') {
    constraints.push(`< ${exclMax}`)
  } else if (schema.maximum !== undefined) {
    constraints.push(exclMax === true ? `< ${schema.maximum}` : `<= ${schema.maximum}`)
  }

  // String constraints
  if (schema.minLength !== undefined) constraints.push(`minLength: ${schema.minLength}`)
  if (schema.maxLength !== undefined) constraints.push(`maxLength: ${schema.maxLength}`)
  if (schema.pattern) constraints.push(`pattern: ${schema.pattern}`)

  // Array constraints
  if (schema.minItems !== undefined) constraints.push(`minItems: ${schema.minItems}`)
  if (schema.maxItems !== undefined) constraints.push(`maxItems: ${schema.maxItems}`)
  if (schema.uniqueItems) constraints.push('uniqueItems')

  return constraints
}

export function generateExample(schema: JsonSchema, depth = 0): unknown {
  if (depth > MAX_DEPTH) return null

  if (schema.example !== undefined) return schema.example
  if (schema.examples?.[0] !== undefined) return schema.examples[0]
  if (schema.default !== undefined) return schema.default
  if (schema.const !== undefined) return schema.const
  if (schema.enum?.[0] !== undefined) return schema.enum[0]

  const type = resolveType(schema)

  switch (type) {
    case 'string':
      return generateStringExample(schema.format)
    case 'integer':
      return generateIntegerExample(schema.format, schema.minimum)
    case 'number':
      return generateNumberExample(schema.format, schema.minimum)
    case 'boolean':
      return true
    case 'array':
      if (schema.items) {
        const item = generateExample(schema.items as JsonSchema, depth + 1)
        return [item]
      }
      return []
    case 'object': {
      const obj: Record<string, unknown> = {}
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop as JsonSchema, depth + 1)
        }
      }
      return obj
    }
    default:
      return null
  }
}

/**
 * Generate example values for string formats per the OpenAPI Format Registry.
 * @see https://spec.openapis.org/registry/format/
 */
function generateStringExample(format?: string): string {
  switch (format) {
    // Date and time
    case 'date': return '2024-01-15'
    case 'date-time': return '2024-01-15T09:30:00Z'
    case 'date-time-local': return '2024-01-15T09:30:00'
    case 'time': return '09:30:00Z'
    case 'time-local': return '09:30:00'
    case 'duration': return 'P3Y6M4DT12H30M5S'
    case 'http-date': return 'Tue, 15 Jan 2024 09:30:00 GMT'

    // Identifiers
    case 'uuid': return '550e8400-e29b-41d4-a716-446655440000'
    case 'uri': return 'https://example.com/resource'
    case 'uri-reference': return '/resource/123'
    case 'uri-template': return '/users/{userId}/posts'
    case 'iri': return 'https://example.com/r\u00E9sum\u00E9'
    case 'iri-reference': return '/r\u00E9sum\u00E9/123'

    // Network
    case 'email': return 'user@example.com'
    case 'idn-email': return 'user@example.com'
    case 'hostname': return 'api.example.com'
    case 'idn-hostname': return 'api.example.com'
    case 'ipv4': return '192.168.1.1'
    case 'ipv6': return '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

    // Encoding
    case 'byte': return 'U3dhZ2dlciByb2Nrcw=='
    case 'base64url': return 'U3dhZ2dlciByb2Nrcw'
    case 'binary': return '<binary>'
    case 'password': return '********'

    // Text
    case 'commonmark': return '**bold** and _italic_'
    case 'html': return '<p>Hello</p>'
    case 'regex': return '^[a-zA-Z0-9]+$'
    case 'char': return 'A'
    case 'media-range': return 'application/json'

    // JSON pointers
    case 'json-pointer': return '/foo/bar/0'
    case 'relative-json-pointer': return '1/foo'

    // Structured fields (RFC 8941)
    case 'sf-binary': return ':cHJldGVuZCB0aGlzIGlzIGJpbmFyeSBjb250ZW50Lg==:'
    case 'sf-boolean': return '?1'
    case 'sf-string': return '"example"'
    case 'sf-token': return 'token'

    // Numeric formats that can be strings
    case 'decimal': return '123.45'
    case 'decimal128': return '123456789.0123456789'
    case 'int64': return '9007199254740992'
    case 'uint64': return '18446744073709551615'
    case 'unixtime': return '1705312200'

    default: return ''
  }
}

function generateIntegerExample(format?: string, minimum?: number): number {
  if (minimum !== undefined) return minimum
  switch (format) {
    case 'int8': return 127
    case 'uint8': return 255
    case 'int16': return 32767
    case 'uint16': return 65535
    case 'int32': return 2147483647
    case 'uint32': return 4294967295
    case 'int64': return 0
    case 'uint64': return 0
    default: return 0
  }
}

function generateNumberExample(format?: string, minimum?: number): number {
  if (minimum !== undefined) return minimum
  switch (format) {
    case 'float': return 3.14
    case 'double': return 3.141592653589793
    case 'double-int': return 42
    case 'decimal': return 123.45
    case 'decimal128': return 123456789.01
    case 'sf-decimal': return 3.14
    case 'sf-integer': return 42
    case 'unixtime': return 1705312200
    default: return 0.0
  }
}
