import { assert, test } from 'orca/testing'
import { buildSwaggerOptions } from './options.mjs'

const spec = { openapi: '3.0.3', info: { title: 'x', version: '1' }, paths: {} }
const node = { nodeType: 1 }

test('hands the spec in already parsed, so Swagger UI never fetches a URL', () => {
  const options = buildSwaggerOptions(spec, node)

  assert.equal(options.spec, spec)
  assert.equal(options.domNode, node)
})

test('switches off everything that would need the network, since the frame is closed', () => {
  const options = buildSwaggerOptions(spec, node)

  assert.equal(options.validatorUrl, null) // otherwise it would hit validator.swagger.io
  assert.deepEqual(options.supportedSubmitMethods, []) // hides "Try it out"/"Execute"
  assert.equal(options.tryItOutEnabled, false)
  assert.equal(options.withCredentials, false)
  assert.equal(options.persistAuthorization, false)
})

test('any request that escapes becomes a clear error, not a silence', () => {
  const options = buildSwaggerOptions(spec, node)

  assert.throws(() => options.requestInterceptor(), /does not make requests/)
})

test('uses the GitLab layout: operations collapsed under their tag, filter, schemas open', () => {
  const options = buildSwaggerOptions(spec, node)

  assert.equal(options.docExpansion, 'list')
  assert.equal(options.defaultModelsExpandDepth, 1)
  assert.equal(options.filter, true)
  assert.equal(options.deepLinking, true)
  assert.equal(options.layout, 'BaseLayout') // no "Explore" bar
  assert.equal(options.displayOperationId, false)
})
