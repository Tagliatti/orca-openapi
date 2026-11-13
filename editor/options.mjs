/**
 * Builds the Swagger UI configuration.
 *
 * Pure and testable. The options do two things: reproduce the GitLab layout (operations collapsed
 * under their tag, colour-coded method badges, schemas open, filter box) and switch off everything
 * that would need the network, because the editor frame runs with the network closed.
 */
export function buildSwaggerOptions(spec, domNode) {
  return {
    // The spec goes in already parsed, so Swagger UI never tries to fetch a URL.
    spec,
    domNode,

    // GitLab layout.
    deepLinking: true, // an anchor per operation, so one can be linked directly
    docExpansion: 'list', // operations collapsed, with a chevron to open one
    defaultModelsExpandDepth: 1, // the Schemas section shows
    defaultModelExpandDepth: 1,
    displayOperationId: false,
    filter: true, // search box at the top
    layout: 'BaseLayout', // no standalone "Explore" bar

    // Switched off for lack of network.
    tryItOutEnabled: false,
    supportedSubmitMethods: [], // hides "Try it out"/"Execute"
    validatorUrl: null, // otherwise it would try to validate against validator.swagger.io
    syntaxHighlight: false,
    persistAuthorization: false,
    withCredentials: false,

    // Network closed: any attempt becomes a clear error instead of a confusing silence.
    // Only reachable through an external `$ref`, which the preview cannot resolve.
    requestInterceptor: () => {
      throw new Error('The OpenAPI preview does not make requests.')
    }
  }
}
