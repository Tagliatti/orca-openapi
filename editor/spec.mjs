/**
 * Parses the text of an OpenAPI/Swagger file.
 *
 * No I/O, no DOM and no Orca: this is the testable part of the editor. The YAML parser is
 * vendored because the editor frame has no network and cannot fetch anything outside the
 * plugin folder.
 */
import { load } from './vendor/js-yaml.mjs'

/** Walks the document collecting `$ref`s that point outside it (internal ones start with `#`). */
function collectExternalRefs(value, found = new Set(), seen = new Set()) {
  if (value === null || typeof value !== 'object') {
    return found
  }
  if (seen.has(value)) {
    return found
  }
  seen.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      collectExternalRefs(item, found, seen)
    }
    return found
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string' && !child.startsWith('#')) {
      found.add(child)
    } else {
      collectExternalRefs(child, found, seen)
    }
  }
  return found
}

/**
 * @returns `{ ok: true, spec, summary }` or `{ ok: false, code, message, line? }`, with `code`
 *   one of `empty | yaml | not-a-spec`.
 */
export function parseSpec(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, code: 'empty', message: 'The file is empty.' }
  }

  let spec
  try {
    spec = load(text)
  } catch (error) {
    const line = typeof error?.mark?.line === 'number' ? error.mark.line + 1 : undefined
    return {
      ok: false,
      code: 'yaml',
      message: `Invalid YAML: ${error?.reason ?? error?.message ?? error}`,
      line
    }
  }

  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    return { ok: false, code: 'not-a-spec', message: 'The file does not contain an object document.' }
  }

  const kind = typeof spec.openapi === 'string' ? 'openapi' : typeof spec.swagger === 'string' ? 'swagger' : null
  if (kind === null) {
    return {
      ok: false,
      code: 'not-a-spec',
      message: 'This does not look like an OpenAPI spec: the `openapi:` or `swagger:` key is missing.'
    }
  }

  const info = spec.info ?? {}
  return {
    ok: true,
    spec,
    summary: {
      kind,
      version: kind === 'openapi' ? spec.openapi : spec.swagger,
      title: typeof info.title === 'string' && info.title !== '' ? info.title : 'Untitled',
      infoVersion: typeof info.version === 'string' ? info.version : '',
      description: typeof info.description === 'string' ? info.description : '',
      externalRefs: [...collectExternalRefs(spec)].sort()
    }
  }
}
