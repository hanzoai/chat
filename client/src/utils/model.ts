/**
 * Two questions about a model id: which mark it wears, and how it is written.
 *
 * Both answers live here rather than beside a caller because they have to be
 * the same in every place the question is asked. `isEnso` was a private
 * function inside MessageEndpointIcon, so the message avatar knew Enso from Zen
 * and the model menu did not — the menu keyed on the ENDPOINT, and Enso is a
 * model ON the hanzo/zen endpoint, so every Enso row wore Zen's mark.
 */

/**
 * Whether a model id belongs to the Enso router family (enso, enso-flash,
 * enso-ultra).
 *
 * Prefix match, so a future `enso-*` rung is covered without another edit, and
 * anchored so a model merely CONTAINING "enso" is not caught.
 */
export function isEnso(model?: string | null): boolean {
  return typeof model === 'string' && /^enso(-|$)/.test(model.trim().toLowerCase());
}

/** An id whose spelling this app knows: `enso`, `enso-flash`, `zen-vl`, `zen5-coder`. */
const TITLED = /^(enso|zen\d*)(-|$)/;

/** Segments that are initialisms, not words — `zen-vl` is "Zen VL", not "Zen Vl". */
const SHORT = new Set(['vl', 'tts', 'asr', 'ocr']);

/**
 * What a person reads where a model id would otherwise appear.
 *
 * The catalog (api.hanzo.ai/v1/models) serves ids and no display name — `enso`,
 * `zen-vl` — and the model menu rendered the id verbatim, so Enso and Zen sat in
 * lower case beside third-party models wearing their vendors' capitals.
 *
 * The set is about SPELLING, not ownership: Enso is Hanzo's, Zen is Zoo Labs
 * Foundation's, and both are here because this app knows how their makers write
 * them. Every other id is written the way ITS vendor writes it (`gpt-5.2`,
 * `claude-opus-4-5`, `deepseek-v4`); title-casing those invents a name nobody
 * uses and reads worse than leaving them alone. So anything else is returned
 * untouched, which also makes this safe to apply to a string that is already a
 * human name — an agent's, say.
 *
 * Presentation only. Search and selection still carry the id, so filtering on
 * "enso" keeps working while the row reads "Enso".
 */
export function label(model?: string | null): string {
  const id = (model ?? '').trim();
  if (!TITLED.test(id.toLowerCase())) {
    return id;
  }
  return id
    .toLowerCase()
    .split('-')
    .map((part) =>
      SHORT.has(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
}
