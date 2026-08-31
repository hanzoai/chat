import { hanzo } from '@hanzo/vite'
import react from '@vitejs/plugin-react'

/**
 * The bundler. Resolving the Hanzo runtime — `~/…`, react-native-web, web-first
 * extensions, one copy of gui — comes from `hanzo()`, so it is stated once for
 * every Hanzo app instead of copied into each. What is left is this app's own.
 *
 * There is no CSS pipeline, because there is no CSS to build: @hanzo/ui ships
 * one generated stylesheet that `<Hanzo>` imports, and the styles gui derives
 * from props at runtime it inserts itself. Nothing to generate, no config file
 * to keep in step with the components.
 *
 * The dev proxy keeps every call same-origin on localhost, which is why no
 * module outside `src/data` ever learns an API host.
 *
 * It points at api.hanzo.ai because that is where the estate's `/v1` lives.
 * Note what that does NOT buy: the addresses in `src/data/api.ts` are under
 * `/v1/chat/*`, and api.hanzo.ai answers 404 for them — the real conversation
 * surface is `/v1/agents/chat/conversations` and the real completion is
 * `/v1/chat/completions`. This target was `https://hanzo.chat`, which is a
 * 301 to the marketing site, so a proxied call came back as HTML and a JSON
 * parse failure rather than as the 404 it is.
 */
const API = 'https://api.hanzo.ai'

const config = hanzo(
  {
    plugins: [react()],
    server: {
      port: 3090,
      proxy: { '/v1': { target: API, changeOrigin: true } },
    },
    // gui reads `process.env.*` at module scope — thirty-five different keys
    // across the family — the way a bundler with a define pass is expected to
    // answer. Next answers it for hanzo.app on its own; here it is one line,
    // and it is the same line for all thirty-five, so a key added in a future
    // gui release cannot reach the browser as `process is not defined` and take
    // the first render with it. Vite's own, more specific `process.env.NODE_ENV`
    // still wins where it applies.
    define: { 'process.env': '{}' },
  },
  { root: import.meta.dirname },
)

/**
 * Dependency optimization is a SECOND resolution pass and inherits none of the
 * first, so it has to be told the same thing: on the web, a react-native
 * package's `.web.js` sibling comes first. Left out, the optimizer follows
 * react-native-svg's fabric components into react-native's Flow source and the
 * dev server dies at startup — while `vite build`, which uses the resolver
 * above, succeeds, so nothing warns you until you try to develop.
 *
 * The list is read back from the config rather than restated: two copies of an
 * extension order is how one of them silently stops matching the other.
 */
export default {
  ...config,
  optimizeDeps: {
    rollupOptions: {
      resolve: { extensions: (config.resolve as { extensions: string[] }).extensions },
    },
  },
}
