/**
 * The house model families — Enso and Zen — and what to call them.
 *
 * Both answers live here rather than beside a caller because they have to be
 * the same in every place the question is asked. `isEnso` was a private
 * function inside MessageEndpointIcon, so the message avatar knew Enso from Zen
 * and the model menu did not — the menu keyed on the ENDPOINT, and Enso is a
 * model ON the hanzo/zen endpoint, so every Enso row wore Zen's open ring.
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

/** A house id: `enso`, `enso-flash`, `zen-vl`, `zen5-coder`. */
const HOUSE = /^(enso|zen\d*)(-|$)/;

/** Segments that are initialisms, not words — `zen-vl` is "Zen VL", not "Zen Vl". */
const SHORT = new Set(['vl', 'tts', 'asr', 'ocr']);

/**
 * What a person reads where a model id would otherwise appear.
 *
 * The catalog (api.hanzo.ai/v1/models) serves ids and no display name — `enso`,
 * `zen-vl` — and the model menu rendered the id verbatim, so our own flagship
 * appeared in lower case beside third-party models wearing their vendors'
 * capitals.
 *
 * ONLY the house families are titled. A third-party id is written the way its
 * vendor writes it (`gpt-5.2`, `claude-opus-4-5`, `deepseek-v4`); title-casing
 * those invents a name nobody uses and reads worse than leaving them alone. So
 * anything else is returned untouched, which also makes this safe to apply to a
 * string that is already a human name — an agent's, say.
 *
 * Presentation only. Search and selection still carry the id, so filtering on
 * "enso" keeps working while the row reads "Enso".
 */
export function label(model?: string | null): string {
  const id = (model ?? '').trim();
  if (!HOUSE.test(id.toLowerCase())) {
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
