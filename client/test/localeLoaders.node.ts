/**
 * Jest twin of `src/locales/localeLoaders.ts` (mapped in jest.config.cjs).
 *
 * The real module enumerates lazy locale loaders with `import.meta.glob`,
 * which babel-jest cannot parse. This twin builds the SAME shape —
 * `{ './<lng>/translation.json': () => Promise<{ default: bundle }> }` —
 * from the filesystem, so i18n behavior under tests (including real French /
 * Spanish lookups in Translation.spec) matches production.
 */
import fs from 'fs';
import path from 'path';

const localesDir = path.join(__dirname, '../src/locales');

export const localeLoaders: Record<string, () => Promise<{ default: Record<string, string> }>> =
  Object.fromEntries(
    fs
      .readdirSync(localesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [
        `./${entry.name}/translation.json`,
        () =>
          Promise.resolve({
            default: JSON.parse(
              fs.readFileSync(path.join(localesDir, entry.name, 'translation.json'), 'utf8'),
            ) as Record<string, string>,
          }),
      ]),
  );
