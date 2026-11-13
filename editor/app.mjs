/**
 * Wires Orca's document to Swagger UI.
 *
 * A read-only viewer: it reads the file and draws it. It never calls `doc.change`, so the tab
 * never goes dirty and nothing is written back.
 */
import { parseSpec } from './spec.mjs'
import { buildSwaggerOptions } from './options.mjs'

const banner = document.getElementById('banner')
const host = document.getElementById('mount')

/** Last text drawn: avoids remounting Swagger UI when nothing changed (losing scroll/expansion). */
let lastText = null

function setBanner(text, tone = 'error') {
  if (!text) {
    banner.hidden = true
    banner.textContent = ''
    return
  }
  banner.hidden = false
  banner.dataset.tone = tone
  banner.textContent = text
}

function render(text) {
  if (text === lastText) {
    return
  }
  lastText = text

  const result = parseSpec(text)
  host.textContent = ''

  if (!result.ok) {
    setBanner(result.line ? `${result.message} (line ${result.line})` : result.message)
    return
  }

  const { externalRefs } = result.summary
  if (externalRefs.length > 0) {
    setBanner(
      `This spec points at ${externalRefs.length} external file(s): ${externalRefs.join(', ')}. ` +
        'The preview has no filesystem access, so those parts are not resolved.',
      'warning'
    )
  } else {
    setBanner(null)
  }

  // A fresh node per render: Swagger UI has no in-place spec update.
  const mount = document.createElement('div')
  host.append(mount)
  window.SwaggerUIBundle(buildSwaggerOptions(result.spec, mount))
}

const documentApi = typeof orca === 'undefined' ? undefined : orca.document

if (!documentApi) {
  setBanner('This preview needs the Orca desktop app.')
} else {
  // Delivers the current document, then every change written from outside.
  documentApi.onDidChange((doc) => {
    if (doc.content.kind !== 'text') {
      setBanner('The OpenAPI preview only understands text files.')
      return
    }
    render(doc.content.text)
  })
}
