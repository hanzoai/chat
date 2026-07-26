/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_LOGGER: string;
  readonly VITE_LOGGER_FILTER: string;
  readonly VITE_HANZO_ANALYTICS_HOST: string;
  /** Publishable ingest key (pk_…) — write-only, safe in the bundle. */
  readonly VITE_HANZO_INGEST_KEY: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
