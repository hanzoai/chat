/**
 * Vite-only enumeration of the lazy locale loaders.
 *
 * Lives in its own module because `import.meta.glob` is Vite syntax that
 * babel-jest cannot parse; jest maps the `./localeLoaders` specifier to
 * `test/localeLoaders.node.ts`, an fs-backed twin with the same shape, so the
 * REAL `i18n.ts` (and everything importing it, by any specifier) runs under
 * tests unchanged.
 *
 * Each entry is a dynamic import — Vite code-splits every translation.json
 * into its own chunk, fetched only when i18next asks for that language.
 */
export const localeLoaders = import.meta.glob<{ default: Record<string, string> }>(
  './*/translation.json',
);
