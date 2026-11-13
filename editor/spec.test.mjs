import { assert, test } from 'orca/testing'
import { parseSpec } from './spec.mjs'

const OPENAPI_3 = `openapi: 3.0.3
info:
  title: Dine-In Rewards
  version: 1.0.0
  description: API for managing campaigns
paths:
  /v1/merchants/{id}/campaigns:
    get:
      summary: List the campaigns of a merchant
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Campaign'
`

const SWAGGER_2 = `swagger: '2.0'
info:
  title: Legacy
  version: 0.9.0
paths: {}
`

test('recognises an OpenAPI 3 spec and summarises its header', () => {
  const result = parseSpec(OPENAPI_3)

  assert.equal(result.ok, true)
  assert.equal(result.summary.kind, 'openapi')
  assert.equal(result.summary.version, '3.0.3')
  assert.equal(result.summary.title, 'Dine-In Rewards')
  assert.equal(result.summary.infoVersion, '1.0.0')
  assert.equal(result.summary.description, 'API for managing campaigns')
  assert.equal(result.spec.paths['/v1/merchants/{id}/campaigns'].get.summary, 'List the campaigns of a merchant')
})

test('recognises a Swagger 2.0 spec', () => {
  const result = parseSpec(SWAGGER_2)

  assert.equal(result.ok, true)
  assert.equal(result.summary.kind, 'swagger')
  assert.equal(result.summary.version, '2.0')
})

test('an internal $ref is not reported', () => {
  assert.deepEqual(parseSpec(OPENAPI_3).summary.externalRefs, [])
})

test('a $ref to another file is reported, because the frame has no filesystem', () => {
  const result = parseSpec(`openapi: 3.0.3
info:
  title: With refs
  version: 1.0.0
paths:
  /a:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: './shared.yaml#/components/schemas/Thing'
  /b:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: dp.yaml#/Thing
`)

  assert.equal(result.ok, true)
  assert.deepEqual(result.summary.externalRefs, ['./shared.yaml#/components/schemas/Thing', 'dp.yaml#/Thing'])
})

test('invalid YAML reports the reason and the line, so the preview can point at it', () => {
  const result = parseSpec('openapi: 3.0.3\npaths: {\n')

  assert.equal(result.ok, false)
  assert.equal(result.code, 'yaml')
  assert.match(result.message, /Invalid YAML/)
  assert.ok(Number.isInteger(result.line) && result.line >= 1)
})

test('valid YAML that is not a spec is refused, hinting at the keys', () => {
  const result = parseSpec('servers:\n  - url: http://localhost\n')

  assert.equal(result.ok, false)
  assert.equal(result.code, 'not-a-spec')
  assert.match(result.message, /openapi:/)
  assert.match(result.message, /swagger:/)
})

test('an empty file is refused before parsing', () => {
  for (const text of ['', '   \n\n']) {
    const result = parseSpec(text)
    assert.equal(result.ok, false)
    assert.equal(result.code, 'empty')
  }
})

test('a list at the root is not a spec', () => {
  const result = parseSpec('- a\n- b\n')

  assert.equal(result.ok, false)
  assert.equal(result.code, 'not-a-spec')
})

test('without info.title the summary still has a title', () => {
  const result = parseSpec('openapi: 3.1.0\ninfo: {}\npaths: {}\n')

  assert.equal(result.ok, true)
  assert.equal(result.summary.title, 'Untitled')
  assert.equal(result.summary.version, '3.1.0')
})

test('repeated anchors do not hang the $ref walk', () => {
  const result = parseSpec(`openapi: 3.0.3
info: { title: Anchors, version: 1.0.0 }
components:
  schemas:
    A: &base
      type: object
      properties:
        next: *base
paths: {}
`)

  assert.equal(result.ok, true)
  assert.deepEqual(result.summary.externalRefs, [])
})
