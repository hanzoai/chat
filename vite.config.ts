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

/**
 * A single-page app has one document and many addresses, so every address that
 * is not a file has to arrive at that document. Two servers host this bundle and
 * only one of them knows that: `ghcr.io/hanzoai/spa` answers index.html for any
 * route, while the Sites plane resolves an object key and otherwise misses.
 *
 * On the Sites plane a miss is answered by the site's own `404.html` when it
 * published one (cloud `apps/sites` notFound), so emitting the document under
 * that name is the whole fix — and it is the convention every static host
 * already implements, rather than a flag this app would have to be granted.
 *
 * The status stays 404, deliberately. The browser runs the bundle regardless and
 * the router takes the address from there, while a crawler and a health check
 * still read "this is not a page I publish" — which is true of every address
 * except the ones the router invents. Answering 200 would require the server to
 * know which addresses this app claims, and it cannot.
 *
 * Without it `/auth/callback` missed, so the issuer completed a round trip into
 * a not-found page and signing in was impossible on hanzo.chat.
 */
const spaFallback = {
  name: 'spa-fallback',
  // `writeBundle` runs after the HTML has been emitted, so index.html exists to
  // be read; `closeBundle` would also work and is further from the emit.
  async writeBundle(options: { dir?: string }) {
    const { copyFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const dir = options.dir ?? 'dist'
    await copyFile(join(dir, 'index.html'), join(dir, '404.html'))
  },
}

const config = hanzo(
  {
    plugins: [react(), spaFallback],
    server: {
      port: 3090,
      // Reachable by LAN name in dev — the Spark serves this to the Mac over
      // `spark.local`, and vite 8 refuses an unlisted Host by default. Dev-only;
      // the built app is static and has no host allowlist.
      allowedHosts: true,
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
