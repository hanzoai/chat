/**
 * Whether a model id belongs to the Enso router family (enso, enso-flash,
 * enso-ultra).
 *
 * Prefix match, so a future `enso-*` rung is covered without another edit, and
 * anchored so a model merely CONTAINING "enso" is not caught.
 *
 * It lives here rather than beside one of its callers because the ANSWER has to
 * be the same in every place the question is asked. It was a private function
 * inside MessageEndpointIcon, so the message avatar knew Enso from Zen and the
 * model menu did not — the menu keyed on the ENDPOINT, and Enso is a model ON
 * the hanzo/zen endpoint, so every Enso row wore Zen's open ring.
 */
export function isEnso(model?: string | null): boolean {
  return typeof model === 'string' && /^enso(-|$)/.test(model.trim().toLowerCase());
}
