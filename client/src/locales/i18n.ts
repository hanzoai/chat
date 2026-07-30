import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English is the fallback language and the source of truth for translation-key
// TYPES (`@types/i18next.d.ts` and `useLocalize` both read `resources.en`), so
// it stays bundled in the entry. Every other locale is a lazy chunk: eagerly
// importing all 41 made the `locales` chunk 572KB gzip of entry-blocking JS,
// ~98% of it in languages the visitor will never switch to.
import translationEn from './en/translation.json';

// One dynamic-import loader per locale directory (Vite code-splits each
// translation.json; the network fetch happens only when i18next asks for that
// language). The enumeration lives in `./localeLoaders` because it uses
// `import.meta.glob` — Vite syntax jest maps to an fs-backed twin.
import { localeLoaders } from './localeLoaders';

export const defaultNS = 'translation';

export const resources = {
  en: { translation: translationEn },
} as const;

const lazyBackend = {
  type: 'backend' as const,
  init() {
    /* no-op */
  },
  read(
    language: string,
    _namespace: string,
    callback: (err: unknown, data: Record<string, string> | null) => void,
  ) {
    const loader = language === 'en' ? undefined : localeLoaders[`./${language}/translation.json`];
    if (!loader) {
      // `en` is already bundled — never re-fetch it as a chunk.
      // Unknown locale (e.g. a regional tag like en-US): report an empty
      // bundle so lookup falls through i18next's fallback chain to `en`.
      callback(null, {});
      return;
    }
    loader().then(
      (mod) => callback(null, mod.default),
      (err) => callback(err, null),
    );
  },
};

i18n
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      'zh-TW': ['zh-Hant', 'en'],
      'zh-HK': ['zh-Hant', 'en'],
      zh: ['zh-Hans', 'en'],
      default: ['en'],
    },
    fallbackNS: 'translation',
    ns: ['translation'],
    debug: false,
    defaultNS,
    resources,
    // `resources` above bundles ONLY `en`; this flag tells i18next to still
    // consult the backend for everything else instead of assuming the bundle
    // is complete.
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
  });

export default i18n;
