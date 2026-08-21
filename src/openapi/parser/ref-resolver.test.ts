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
import { resolveRefs } from './ref-resolver'

describe('resolveRefs', () => {
  it('resolves simple $ref pointers', async () => {
    const doc = {
      components: {
        schemas: {
          Pet: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
        },
      },
    }

    const resolved = await resolveRefs(doc)
    const schema = (resolved as Record<string, unknown>).paths as Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>
    const petSchema = schema['/pets'].get.responses['200'].schema as Record<string, unknown>
    expect(petSchema.type).toBe('object')
    expect((petSchema.properties as Record<string, unknown>).name).toEqual({ type: 'string' })
  })

  it('resolves nested $ref chains', async () => {
    const doc = {
      components: {
        schemas: {
          Name: { type: 'string' },
          Pet: {
            type: 'object',
            properties: {
              name: { $ref: '#/components/schemas/Name' },
            },
          },
        },
      },
    }

    const resolved = await resolveRefs(doc) as Record<string, Record<string, Record<string, Record<string, unknown>>>>
    const pet = resolved.components.schemas.Pet as Record<string, Record<string, unknown>>
    expect(pet.properties.name).toEqual({ type: 'string' })
  })

  it('handles circular references without infinite loop', async () => {
    const doc = {
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              child: { $ref: '#/components/schemas/Node' },
            },
          },
        },
      },
    }

    const resolved = await resolveRefs(doc)
    expect(resolved).toBeDefined()
  })

  it('returns structured error for external $refs without options', async () => {
    const doc = {
      paths: {
        '/pets': {
          get: {
            schema: { $ref: 'https://example.com/schemas/Pet.json' },
          },
        },
      },
    }

    const resolved = await resolveRefs(doc) as Record<string, Record<string, Record<string, Record<string, unknown>>>>
    const schema = resolved.paths['/pets'].get.schema as Record<string, unknown>
    expect(schema['x-external-ref']).toBe('https://example.com/schemas/Pet.json')
  })

  it('leaves unresolvable $refs as-is', async () => {
    const doc = {
      paths: {
        '/pets': {
          get: {
            schema: { $ref: '#/components/schemas/DoesNotExist' },
          },
        },
      },
    }

    const resolved = await resolveRefs(doc) as Record<string, Record<string, Record<string, Record<string, unknown>>>>
    expect(resolved.paths['/pets'].get.schema).toEqual({ $ref: '#/components/schemas/DoesNotExist' })
  })

  it('handles arrays with $refs', async () => {
    const doc = {
      components: {
        schemas: {
          Tag: { type: 'string' },
        },
      },
      items: [
        { $ref: '#/components/schemas/Tag' },
        { type: 'integer' },
      ],
    }

    const resolved = await resolveRefs(doc) as Record<string, unknown>
    expect((resolved.items as unknown[])[0]).toEqual({ type: 'string' })
    expect((resolved.items as unknown[])[1]).toEqual({ type: 'integer' })
  })

  it('keeps sibling keys set alongside a $ref (parameter description wins)', async () => {
    const doc = {
      components: {
        parameters: {
          PetId: {
            name: 'petId',
            in: 'path',
            required: true,
            description: 'Canonical description',
            schema: { type: 'string' },
          },
        },
      },
      paths: {
        '/pets/{petId}': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/PetId',
                description: 'Overridden description',
              },
            ],
          },
        },
      },
    }

    const resolved = (await resolveRefs(doc)) as Record<string, Record<string, Record<string, Record<string, unknown[]>>>>
    const param = resolved.paths['/pets/{petId}'].get.parameters[0] as Record<string, unknown>
    // Sibling description overrides the target's description.
    expect(param.description).toBe('Overridden description')
    // Keys from the resolved target are preserved.
    expect(param.name).toBe('petId')
    expect(param.in).toBe('path')
    expect(param.required).toBe(true)
    expect(param.schema).toEqual({ type: 'string' })
  })

  it('keeps sibling keys on a $ref\'d schema', async () => {
    const doc = {
      components: {
        schemas: {
          Pet: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
      paths: {
        '/pets': {
          get: {
            schema: {
              $ref: '#/components/schemas/Pet',
              description: 'A single pet',
              example: { name: 'Rex' },
            },
          },
        },
      },
    }

    const resolved = (await resolveRefs(doc)) as Record<string, Record<string, Record<string, Record<string, unknown>>>>
    const schema = resolved.paths['/pets'].get.schema as Record<string, unknown>
    expect(schema.type).toBe('object')
    expect((schema.properties as Record<string, unknown>).name).toEqual({ type: 'string' })
    expect(schema.description).toBe('A single pet')
    expect(schema.example).toEqual({ name: 'Rex' })
  })

  it('does not mutate a shared cached target when merging siblings', async () => {
    const doc = {
      components: {
        schemas: {
          Pet: { type: 'object', description: 'Base pet' },
        },
      },
      a: { $ref: '#/components/schemas/Pet', description: 'A override' },
      b: { $ref: '#/components/schemas/Pet' },
    }

    const resolved = (await resolveRefs(doc)) as Record<string, Record<string, unknown>>
    expect((resolved.a as Record<string, unknown>).description).toBe('A override')
    // b resolves to the base target with its original description intact.
    expect((resolved.b as Record<string, unknown>).description).toBe('Base pet')
  })

  it('handles URL-encoded ref segments', async () => {
    const doc = {
      components: {
        schemas: {
          'my/schema': { type: 'object' },
        },
      },
      test: { $ref: '#/components/schemas/my~1schema' },
    }

    const resolved = await resolveRefs(doc) as Record<string, unknown>
    expect(resolved.test).toEqual({ type: 'object' })
  })
})
