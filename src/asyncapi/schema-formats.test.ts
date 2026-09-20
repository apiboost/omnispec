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
import { avroToJsonSchema, detectSchemaFormat } from './schema-formats'

describe('detectSchemaFormat', () => {
  it('classifies avro, protobuf, and json', () => {
    expect(detectSchemaFormat('application/vnd.apache.avro;version=1.9.0')).toBe('avro')
    expect(detectSchemaFormat('application/vnd.google.protobuf')).toBe('protobuf')
    expect(detectSchemaFormat('application/schema+json;version=draft-07')).toBe('json')
    expect(detectSchemaFormat(undefined)).toBe('json')
  })
})

describe('avroToJsonSchema', () => {
  it('converts a record with nested record, enum, array, logicalType and nullable union', () => {
    const avro = {
      type: 'record',
      name: 'Order',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'createdAt', type: { type: 'long', logicalType: 'timestamp-millis' } },
        { name: 'status', type: { type: 'enum', name: 'Status', symbols: ['NEW', 'DONE'] } },
        { name: 'tags', type: { type: 'array', items: 'string' } },
        { name: 'note', type: ['null', 'string'] },
      ],
    }
    const schema = avroToJsonSchema(avro)

    expect(schema.type).toBe('object')
    const props = schema.properties as Record<string, Record<string, unknown>>
    expect(props.id.type).toBe('string')
    expect(props.createdAt.type).toBe('integer')
    expect(props.createdAt.format).toBe('timestamp-millis')
    expect(props.status.enum).toEqual(['NEW', 'DONE'])
    expect(props.tags.type).toBe('array')
    expect((props.tags.items as Record<string, unknown>).type).toBe('string')
    // ['null','string'] → nullable string, and not required.
    expect(props.note.type).toBe('string')
    expect(props.note.nullable).toBe(true)
    expect((schema.required as string[])).toContain('id')
    expect((schema.required as string[])).not.toContain('note')
  })
})
