/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveRefs } from './ref-resolver'
import { parseOpenApiSpec } from './openapi-parser'
import { parseAsyncApiSpec } from '../../asyncapi/parser/asyncapi-parser'

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

describe('resolveRefs externalRefOrigins normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves a cross-origin ref when the allow-list entry has a trailing slash, default port and uppercase host', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ type: 'string', title: 'Normalized' })))
    vi.stubGlobal('fetch', fetchMock)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const doc = { test: { $ref: 'https://norm-schemas.example.com/pet.json' } }
    const resolved = await resolveRefs(doc, {
      specUrl: 'https://docs.example.com/openapi.json',
      externalRefOrigins: ['HTTPS://Norm-Schemas.Example.com:443/'],
    }) as Record<string, unknown>

    expect(resolved.test).toEqual({ type: 'string', title: 'Normalized' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()
  })

  it('ignores invalid entries with one warning and still blocks the ref', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const doc = {
      a: { $ref: 'https://blocked-schemas.example.com/a.json' },
      b: { $ref: 'https://blocked-schemas.example.com/b.json' },
    }
    const resolved = await resolveRefs(doc, {
      specUrl: 'https://docs.example.com/openapi.json',
      externalRefOrigins: ['https://blocked-schemas.example.com/v1', 'https://u:p@blocked-schemas.example.com'],
    }) as Record<string, Record<string, unknown>>

    expect(resolved.a['x-blocked']).toBe(true)
    expect(resolved.b['x-blocked']).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('https://blocked-schemas.example.com/v1')
  })
})

describe('resolveRefs origin enforcement for string and object specs (no specUrl)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const stringSpec = (ref: string) => [
    'openapi: 3.0.0',
    'info: { title: T, version: "1" }',
    'paths: {}',
    'components:',
    '  schemas:',
    '    Pet:',
    `      $ref: '${ref}'`,
  ].join('\n')

  const objectSpec = (ref: string) => ({
    openapi: '3.0.0',
    info: { title: 'T', version: '1' },
    paths: {},
    components: { schemas: { Pet: { $ref: ref } } },
  })

  const pet = async (spec: string | Record<string, unknown>, options?: { externalRefOrigins?: string[] }) => {
    const parsed = await parseOpenApiSpec(spec, options)
    return parsed.components.schemas.Pet
  }

  it('blocks a cross-origin $ref in a string spec when the origin is not allowed', async () => {
    const fetchMock = vi.fn(async () => new Response('{"type":"string"}'))
    vi.stubGlobal('fetch', fetchMock)

    const schema = await pet(stringSpec('https://str-blocked.example.com/pet.json'))

    expect(schema['x-blocked']).toBe(true)
    expect(String(schema['x-error'])).toContain('https://str-blocked.example.com')
    expect(String(schema['x-error'])).toContain('externalRefOrigins')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches a cross-origin $ref in a string spec when the origin is allowed', async () => {
    const fetchMock = vi.fn(async () => new Response('{"type":"string","title":"StrAllowed"}'))
    vi.stubGlobal('fetch', fetchMock)

    const schema = await pet(stringSpec('https://str-allowed.example.com/pet.json'), {
      externalRefOrigins: ['https://str-allowed.example.com'],
    })

    expect(schema.title).toBe('StrAllowed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('blocks a cross-origin $ref in an object spec when the origin is not allowed', async () => {
    const fetchMock = vi.fn(async () => new Response('{"type":"string"}'))
    vi.stubGlobal('fetch', fetchMock)

    const schema = await pet(objectSpec('https://obj-blocked.example.com/pet.json'))

    expect(schema['x-blocked']).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches a cross-origin $ref in an object spec when the origin is allowed', async () => {
    const fetchMock = vi.fn(async () => new Response('{"type":"string","title":"ObjAllowed"}'))
    vi.stubGlobal('fetch', fetchMock)

    const schema = await pet(objectSpec('https://obj-allowed.example.com/pet.json'), {
      externalRefOrigins: ['https://obj-allowed.example.com'],
    })

    expect(schema.title).toBe('ObjAllowed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves same-origin absolute and relative refs for string and object specs in a browser', async () => {
    const origin = window.location.origin
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify({ type: 'string', title: url })))
    vi.stubGlobal('fetch', fetchMock)

    const absolute = await pet(stringSpec(`${origin}/same-origin/str-abs.json`))
    const relative = await pet(objectSpec('./same-origin/obj-rel.json'))

    expect(absolute.title).toBe(`${origin}/same-origin/str-abs.json`)
    expect(relative.title).toBe(new URL('./same-origin/obj-rel.json', window.location.href).href)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('blocks absolute refs without a window (SSR) unless the origin is allowed', async () => {
    const fetchMock = vi.fn(async () => new Response('{"type":"string","title":"SsrAllowed"}'))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', undefined)

    const blocked = await resolveRefs({ a: { $ref: 'https://ssr-blocked.example.com/a.json' } }) as Record<string, Record<string, unknown>>
    expect(blocked.a['x-blocked']).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()

    const allowed = await resolveRefs(
      { a: { $ref: 'https://ssr-allowed.example.com/a.json' } },
      { externalRefOrigins: ['https://ssr-allowed.example.com'] },
    ) as Record<string, Record<string, unknown>>
    expect(allowed.a.title).toBe('SsrAllowed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('blocks protocol-relative refs without a window (SSR)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', undefined)

    const resolved = await resolveRefs({ a: { $ref: '//ssr-protorel.example.com/a.json' } }) as Record<string, Record<string, unknown>>
    expect(resolved.a['x-blocked']).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    'http://10.0.0.5/pet.json',
    'http://127.0.0.1/pet.json',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/pet.json',
    'http://localhost.example.localhost/pet.json',
  ])('blocks a private/reserved-address $ref (%s) even when allow-listed', async (ref) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const schema = await pet(objectSpec(ref), { externalRefOrigins: [new URL(ref).origin] })

    expect(schema['x-blocked']).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('warns about invalid externalRefOrigins entries for a string spec', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await parseOpenApiSpec(stringSpec('#/components/schemas/Missing'), {
      externalRefOrigins: ['https://warn-str.example.com/with/path'],
    })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('https://warn-str.example.com/with/path')
  })
})

describe('parseAsyncApiSpec $ref origin enforcement', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const asyncSpec = (ref: string) => ({
    asyncapi: '2.6.0',
    info: { title: 'T', version: '1' },
    channels: {},
    components: { schemas: { Pet: { $ref: ref } } },
  })

  it('blocks a cross-origin $ref unless the origin is allowed', async () => {
    const fetchMock = vi.fn(async () => new Response('{"type":"string"}'))
    vi.stubGlobal('fetch', fetchMock)

    await parseAsyncApiSpec(asyncSpec('https://async-blocked.example.com/pet.json'))
    expect(fetchMock).not.toHaveBeenCalled()

    await parseAsyncApiSpec(asyncSpec('https://async-allowed.example.com/pet.json'), {
      externalRefOrigins: ['https://async-allowed.example.com'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
