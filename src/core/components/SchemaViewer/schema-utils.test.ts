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
import { schemaToNodes, generateExample, buildConstraints } from './schema-utils'

describe('schemaToNodes', () => {
  it('handles simple string property', () => {
    const nodes = schemaToNodes({ type: 'string', description: 'A name' }, 'name', ['name'])
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('string')
    expect(nodes[0].name).toBe('name')
    expect(nodes[0].required).toBe(true)
    expect(nodes[0].description).toBe('A name')
  })

  it('handles object with properties', () => {
    const nodes = schemaToNodes({
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', description: 'The ID' },
        name: { type: 'string' },
      },
    })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('object')
    expect(nodes[0].children).toHaveLength(2)
    expect(nodes[0].children![0].name).toBe('id')
    expect(nodes[0].children![0].required).toBe(true)
    expect(nodes[0].children![1].name).toBe('name')
    expect(nodes[0].children![1].required).toBe(false)
  })

  it('composes an array of primitives inline as array<item> with no items row', () => {
    const nodes = schemaToNodes({
      type: 'array',
      items: { type: 'string' },
    })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('array<string>')
    expect(nodes[0].children).toBeUndefined()
  })

  it('composes the item format into the array signature (array<string · uri>)', () => {
    const nodes = schemaToNodes({
      type: 'array',
      items: { type: 'string', format: 'uri' },
    })
    expect(nodes[0].type).toBe('array<string · uri>')
    expect(nodes[0].children).toBeUndefined()
  })

  it('lifts the item enum onto the array node', () => {
    const nodes = schemaToNodes({
      type: 'array',
      items: { type: 'string', enum: ['app:read', 'app:write'] },
    })
    expect(nodes[0].type).toBe('array<string>')
    expect(nodes[0].enum).toEqual(['app:read', 'app:write'])
    expect(nodes[0].children).toBeUndefined()
  })

  it('composes an array of objects as array<object> and nests the object properties directly', () => {
    const nodes = schemaToNodes({
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' } } },
    })
    expect(nodes[0].type).toBe('array<object>')
    expect(nodes[0].children).toHaveLength(1)
    expect(nodes[0].children![0].name).toBe('id')
  })

  it('handles enum', () => {
    const nodes = schemaToNodes({
      type: 'string',
      enum: ['active', 'inactive', 'pending'],
    })
    expect(nodes[0].enum).toEqual(['active', 'inactive', 'pending'])
  })

  it('handles nullable type', () => {
    const nodes = schemaToNodes({ type: 'string', nullable: true })
    expect(nodes[0].nullable).toBe(true)
  })

  it('handles number constraints', () => {
    const nodes = schemaToNodes({
      type: 'integer',
      minimum: 1,
      maximum: 100,
    })
    expect(nodes[0].constraints).toContain('>= 1')
    expect(nodes[0].constraints).toContain('<= 100')
  })

  it('handles string constraints', () => {
    const nodes = schemaToNodes({
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-z]+$',
    })
    expect(nodes[0].constraints).toContain('minLength: 1')
    expect(nodes[0].constraints).toContain('maxLength: 255')
    expect(nodes[0].constraints).toContain('pattern: ^[a-z]+$')
  })

  it('handles allOf by merging properties', () => {
    const nodes = schemaToNodes({
      allOf: [
        { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        { properties: { name: { type: 'string' } } },
      ],
    })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('object')
    expect(nodes[0].children).toHaveLength(2)
  })

  it('handles oneOf with composition children', () => {
    const nodes = schemaToNodes({
      oneOf: [
        { type: 'object', properties: { cat: { type: 'string' } } },
        { type: 'object', properties: { dog: { type: 'string' } } },
      ],
    })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].compositionType).toBe('oneOf')
    expect(nodes[0].compositionChildren).toHaveLength(2)
  })

  it('labels oneOf branches by discriminator mapping', () => {
    const nodes = schemaToNodes({
      oneOf: [
        { $ref: '#/components/schemas/Cat' },
        { $ref: '#/components/schemas/Dog' },
      ],
      discriminator: {
        propertyName: 'petType',
        mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' },
      },
    })
    expect(nodes[0].discriminator?.propertyName).toBe('petType')
    expect(nodes[0].compositionBranchLabels).toEqual(['cat', 'dog'])
  })

  it('labels oneOf branches by $ref name when no discriminator', () => {
    const nodes = schemaToNodes({
      oneOf: [{ $ref: '#/components/schemas/Cat' }, { title: 'DogType', type: 'object' }],
    })
    expect(nodes[0].compositionBranchLabels).toEqual(['Cat', 'DogType'])
  })

  it('falls back to Option N for anonymous branches', () => {
    const nodes = schemaToNodes({
      anyOf: [{ type: 'string' }, { type: 'integer' }],
    })
    expect(nodes[0].compositionBranchLabels).toEqual(['Option 1', 'Option 2'])
  })

  it('records refTarget for a bare $ref node', () => {
    const nodes = schemaToNodes({ $ref: '#/components/schemas/Pet' }, 'pet')
    expect(nodes[0].refTarget).toBe('Pet')
    expect(nodes[0].type).toBe('Pet')
  })

  it('captures schema title', () => {
    const nodes = schemaToNodes({ type: 'object', title: 'Widget', properties: {} })
    expect(nodes[0].title).toBe('Widget')
  })

  it('handles circular $ref gracefully', () => {
    const nodes = schemaToNodes({ $ref: '#/components/schemas/Node' }, 'node', [], 0, new Set(['Node']))
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toContain('circular')
  })

  it('handles deeply nested objects within depth limit', () => {
    // Create a 5-level deep schema
    const schema = {
      type: 'object' as const,
      properties: {
        level1: {
          type: 'object' as const,
          properties: {
            level2: {
              type: 'object' as const,
              properties: {
                level3: { type: 'string' as const },
              },
            },
          },
        },
      },
    }
    const nodes = schemaToNodes(schema)
    expect(nodes[0].children![0].children![0].children![0].type).toBe('string')
  })

  it('handles deprecated and readOnly flags', () => {
    const nodes = schemaToNodes({
      type: 'string',
      deprecated: true,
      readOnly: true,
    })
    expect(nodes[0].deprecated).toBe(true)
    expect(nodes[0].readOnly).toBe(true)
  })

  it('handles empty schema as any', () => {
    const nodes = schemaToNodes({})
    expect(nodes[0].type).toBe('any')
  })
})

describe('generateExample', () => {
  it('uses provided example', () => {
    expect(generateExample({ type: 'string', example: 'hello' })).toBe('hello')
  })

  it('uses default value', () => {
    expect(generateExample({ type: 'string', default: 'world' })).toBe('world')
  })

  it('uses first enum value', () => {
    expect(generateExample({ type: 'string', enum: ['a', 'b'] })).toBe('a')
  })

  it('generates string examples for common formats', () => {
    expect(generateExample({ type: 'string' })).toBe('')
    expect(generateExample({ type: 'string', format: 'email' })).toBe('user@example.com')
    expect(generateExample({ type: 'string', format: 'date' })).toBe('2024-01-15')
    expect(generateExample({ type: 'string', format: 'date-time' })).toBe('2024-01-15T09:30:00Z')
    expect(generateExample({ type: 'string', format: 'uri' })).toBe('https://example.com/resource')
    expect(generateExample({ type: 'string', format: 'uuid' })).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(generateExample({ type: 'string', format: 'ipv4' })).toBe('192.168.1.1')
    expect(generateExample({ type: 'string', format: 'ipv6' })).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
    expect(generateExample({ type: 'string', format: 'hostname' })).toBe('api.example.com')
    expect(generateExample({ type: 'string', format: 'byte' })).toBe('U3dhZ2dlciByb2Nrcw==')
    expect(generateExample({ type: 'string', format: 'binary' })).toBe('<binary>')
    expect(generateExample({ type: 'string', format: 'password' })).toBe('********')
  })

  it('generates string examples for date/time formats', () => {
    expect(generateExample({ type: 'string', format: 'time' })).toBe('09:30:00Z')
    expect(generateExample({ type: 'string', format: 'time-local' })).toBe('09:30:00')
    expect(generateExample({ type: 'string', format: 'date-time-local' })).toBe('2024-01-15T09:30:00')
    expect(generateExample({ type: 'string', format: 'duration' })).toBe('P3Y6M4DT12H30M5S')
    expect(generateExample({ type: 'string', format: 'http-date' })).toBe('Tue, 15 Jan 2024 09:30:00 GMT')
  })

  it('generates string examples for URI/IRI formats', () => {
    expect(generateExample({ type: 'string', format: 'uri-reference' })).toBe('/resource/123')
    expect(generateExample({ type: 'string', format: 'uri-template' })).toBe('/users/{userId}/posts')
    expect(generateExample({ type: 'string', format: 'json-pointer' })).toBe('/foo/bar/0')
  })

  it('generates string examples for text/encoding formats', () => {
    expect(generateExample({ type: 'string', format: 'commonmark' })).toBe('**bold** and _italic_')
    expect(generateExample({ type: 'string', format: 'html' })).toBe('<p>Hello</p>')
    expect(generateExample({ type: 'string', format: 'regex' })).toBe('^[a-zA-Z0-9]+$')
    expect(generateExample({ type: 'string', format: 'media-range' })).toBe('application/json')
    expect(generateExample({ type: 'string', format: 'base64url' })).toBe('U3dhZ2dlciByb2Nrcw')
  })

  it('generates string examples for numeric string formats', () => {
    expect(generateExample({ type: 'string', format: 'int64' })).toBe('9007199254740992')
    expect(generateExample({ type: 'string', format: 'uint64' })).toBe('18446744073709551615')
    expect(generateExample({ type: 'string', format: 'decimal' })).toBe('123.45')
    expect(generateExample({ type: 'string', format: 'unixtime' })).toBe('1705312200')
  })

  it('generates integer examples with formats', () => {
    expect(generateExample({ type: 'integer' })).toBe(0)
    expect(generateExample({ type: 'integer', minimum: 5 })).toBe(5)
    expect(generateExample({ type: 'integer', format: 'int8' })).toBe(127)
    expect(generateExample({ type: 'integer', format: 'int16' })).toBe(32767)
    expect(generateExample({ type: 'integer', format: 'int32' })).toBe(2147483647)
    expect(generateExample({ type: 'integer', format: 'uint8' })).toBe(255)
    expect(generateExample({ type: 'integer', format: 'uint16' })).toBe(65535)
    expect(generateExample({ type: 'integer', format: 'uint32' })).toBe(4294967295)
  })

  it('generates number examples with formats', () => {
    expect(generateExample({ type: 'number' })).toBe(0.0)
    expect(generateExample({ type: 'number', format: 'float' })).toBe(3.14)
    expect(generateExample({ type: 'number', format: 'double' })).toBe(3.141592653589793)
    expect(generateExample({ type: 'number', format: 'decimal' })).toBe(123.45)
    expect(generateExample({ type: 'number', format: 'unixtime' })).toBe(1705312200)
  })

  it('generates boolean example', () => {
    expect(generateExample({ type: 'boolean' })).toBe(true)
  })

  it('generates array example', () => {
    const result = generateExample({ type: 'array', items: { type: 'string' } })
    expect(result).toEqual([''])
  })

  it('generates object example', () => {
    const result = generateExample({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    })
    expect(result).toEqual({ id: 0, name: '' })
  })
})

describe('buildConstraints', () => {
  it('is exported and builds numeric + string + array constraints', () => {
    const c = buildConstraints({
      minimum: 1,
      maximum: 10,
      minLength: 2,
      pattern: '^x$',
      minItems: 1,
      uniqueItems: true,
    })
    expect(c).toContain('>= 1')
    expect(c).toContain('<= 10')
    expect(c).toContain('minLength: 2')
    expect(c).toContain('pattern: ^x$')
    expect(c).toContain('minItems: 1')
    expect(c).toContain('uniqueItems')
  })

  it('returns an empty array when there are no constraints', () => {
    expect(buildConstraints({ type: 'string' })).toEqual([])
  })
})

describe('exclusive bounds (3.0 boolean vs 3.1 numeric)', () => {
  it('handles OAS 3.0 boolean exclusive bounds paired with minimum/maximum', () => {
    const c = buildConstraints({
      minimum: 0,
      exclusiveMinimum: true,
      maximum: 100,
      exclusiveMaximum: true,
    })
    expect(c).toContain('> 0')
    expect(c).toContain('< 100')
  })

  it('handles OAS 3.1 numeric exclusive bounds', () => {
    const c = buildConstraints({ exclusiveMinimum: 0, exclusiveMaximum: 1000 })
    expect(c).toContain('> 0')
    expect(c).toContain('< 1000')
  })
})

describe('OpenAPI 3.1 type arrays', () => {
  it('renders ["string","null"] as nullable string', () => {
    const nodes = schemaToNodes({ type: ['string', 'null'] })
    expect(nodes[0].type).toBe('string')
    expect(nodes[0].nullable).toBe(true)
  })

  it('renders multi-member unions without the null marker', () => {
    const nodes = schemaToNodes({ type: ['string', 'integer', 'null'] })
    expect(nodes[0].type).toBe('string | integer')
    expect(nodes[0].nullable).toBe(true)
  })

  it('recurses into nullable object type arrays', () => {
    const nodes = schemaToNodes({
      type: ['object', 'null'],
      properties: { id: { type: 'string' } },
    })
    expect(nodes[0].nullable).toBe(true)
    expect(nodes[0].children).toHaveLength(1)
    expect(nodes[0].children![0].name).toBe('id')
  })
})
