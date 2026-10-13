/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * Normalizes non-JSON-Schema message payload formats (Avro, Protobuf) into the
 * JSON-Schema shape the shared SchemaTree already renders, so an AsyncAPI message
 * whose `schemaFormat` is Avro/Protobuf shows a real field tree instead of the
 * bare wrapper word ("record", "any").
 */

type JsonObject = Record<string, unknown>

/** Classify a message `schemaFormat` string. */
export function detectSchemaFormat(schemaFormat?: string): 'avro' | 'protobuf' | 'json' {
  if (!schemaFormat) return 'json'
  const f = schemaFormat.toLowerCase()
  if (f.includes('avro')) return 'avro'
  if (f.includes('protobuf') || f.includes('proto')) return 'protobuf'
  return 'json'
}

/**
 * Convert an Avro schema to a JSON-Schema-like object.
 * Handles records, enums, arrays, maps, fixed, logicalTypes, and unions
 * (including the `['null', T]` nullable idiom).
 */
export function avroToJsonSchema(avro: unknown): JsonObject {
  return convert(avro)
}

function convert(node: unknown): JsonObject {
  // Primitive named by a bare string, e.g. "string", "long".
  if (typeof node === 'string') return primitive(node)

  // Union — an array of alternatives. `['null', T]` is Avro's nullable idiom.
  if (Array.isArray(node)) {
    const nonNull = node.filter((n) => n !== 'null')
    const nullable = node.length !== nonNull.length
    if (nonNull.length === 1) {
      return { ...convert(nonNull[0]), nullable }
    }
    return { oneOf: nonNull.map(convert), nullable }
  }

  if (node && typeof node === 'object') {
    const obj = node as JsonObject
    const type = obj.type

    if (type === 'record') {
      const fields = (obj.fields as Array<JsonObject> | undefined) ?? []
      const properties: JsonObject = {}
      const required: string[] = []
      for (const field of fields) {
        const name = field.name as string
        const schema = convert(field.type)
        if (field.doc) schema.description = field.doc
        if (field.default !== undefined) schema.default = field.default
        properties[name] = schema
        // A field is required unless its type is nullable or it has a default.
        if (field.default === undefined && !(schema as JsonObject).nullable) required.push(name)
      }
      const result: JsonObject = { type: 'object', properties }
      if (obj.doc) result.description = obj.doc
      if (required.length > 0) result.required = required
      return result
    }

    if (type === 'enum') {
      return { type: 'string', enum: (obj.symbols as string[]) ?? [] }
    }

    if (type === 'array') {
      return { type: 'array', items: convert(obj.items) }
    }

    if (type === 'map') {
      return { type: 'object', additionalProperties: convert(obj.values) }
    }

    if (type === 'fixed') {
      return { type: 'string', format: `fixed(${obj.size ?? '?'})` }
    }

    // A nested `{ type: <primitive>, logicalType?: ... }`.
    if (typeof type === 'string') {
      const base = primitive(type)
      if (obj.logicalType) base.format = String(obj.logicalType)
      return base
    }

    // A nested complex type given directly as the `type` value.
    if (type && typeof type === 'object') return convert(type)
  }

  return { type: 'object' }
}

const AVRO_PRIMITIVES: Record<string, JsonObject> = {
  null: { type: 'null' },
  boolean: { type: 'boolean' },
  int: { type: 'integer', format: 'int32' },
  long: { type: 'integer', format: 'int64' },
  float: { type: 'number', format: 'float' },
  double: { type: 'number', format: 'double' },
  bytes: { type: 'string', format: 'byte' },
  string: { type: 'string' },
}

function primitive(name: string): JsonObject {
  return { ...(AVRO_PRIMITIVES[name] ?? { type: name }) }
}
