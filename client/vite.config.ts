import react from '@vitejs/plugin-react';
// @ts-ignore
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { hanzoguiPlugin } from '@hanzogui/vite-plugin';
import { compression } from 'vite-plugin-compression2';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * react-native-web's module-substitution convention: a `.web.*` sibling replaces
 * the native module. Vite and esbuild each resolve with their own extension list
 * and neither knows this convention, so BOTH have to be told — one list, read
 * twice (resolve.extensions + optimizeDeps.esbuildOptions.resolveExtensions).
 */
const webFirstExtensions = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.js',
  '.mjs',
  '.js',
  '.mts',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
];

// https://vitejs.dev/config/
// When VITE_HANZO_API_URL is set, the frontend talks directly to the cloud gateway
// and no local backend proxy is needed (static SPA mode).
const hanzoApiUrl = process.env.VITE_HANZO_API_URL;
const backendPort = process.env.BACKEND_PORT && Number(process.env.BACKEND_PORT) || 3080;
const backendURL = process.env.HOST ? `http://${process.env.HOST}:${backendPort}` : `http://localhost:${backendPort}`;

// Only proxy to local backend if not using cloud gateway directly
const devProxy = hanzoApiUrl ? {} : {
  '/v1/chat': {
    target: backendURL,
    changeOrigin: true,
  },
  '/oauth': {
    target: backendURL,
    changeOrigin: true,
  },
};

export default defineConfig(({ command }) => ({
  base: '',
  server: {
    allowedHosts: process.env.VITE_ALLOWED_HOSTS && process.env.VITE_ALLOWED_HOSTS.split(',') || [],
    host: process.env.HOST || 'localhost',
    port: process.env.PORT && Number(process.env.PORT) || 3090,
    strictPort: false,
    proxy: devProxy,
  },
  // Set the directory where environment variables are loaded from and restrict prefixes
  envDir: '../',
  envPrefix: ['VITE_', 'SCRIPT_', 'DOMAIN_', 'ALLOW_', 'HANZO_'],
  plugins: [
    /**
     * gui's compiler. It resolves the same config the app mounts (gui.config.ts
     * re-exports it) and writes gui's theme + base CSS to `src/gui.css`, which
     * `main.jsx` imports — so that sheet ships as a hashed, cacheable file in
     * `dist/assets` instead of a `<style>` the runtime rebuilds on every boot.
     * `GuiProvider disableInjectCSS` in App.jsx is the other half; neither half
     * works alone. It also extracts atomic styles out of gui JSX at build time.
     *
     * BUILD ONLY, and that is not a preference. The plugin's `config()` adds
     * `define: { 'process.env.NODE_ENV': … }`, and that single define is enough
     * to kill this app's dev server: with it, the pre-bundled `process` shim
     * stops reaching ripemd160 → readable-stream, `_stream_writable` reads
     * `process.version.slice` off undefined, and the page renders blank with one
     * pageerror. Measured by adding ONLY that define to this config with no
     * plugin at all — same blank page, same stack — so it is a property of this
     * app's node-polyfill graph, not of the extraction. Dev therefore keeps
     * gui's runtime injection (App.jsx), which is what it has always used.
     */
    ...(command === 'build'
      ? [
          hanzoguiPlugin({
            components: ['@hanzo/gui'],
            // absolute: the extractor copies the config into a .hanzogui/ temp dir
            config: path.resolve(__dirname, 'gui.config.ts'),
            outputCSS: path.resolve(__dirname, 'src/gui.css'),
          }),
        ]
      : []),
    react(),
    nodePolyfills(),
    VitePWA({
      injectRegister: 'auto',
      // The worker self-destructs, by decision, not accident. This is an
      // online AI chat: a precache worker only ever serves the PREVIOUS
      // build's shell after a deploy (black page, missing lazy chunks, 401s
      // until the user clears it by hand — observed on every release). The
      // generated sw.js now replaces any installed worker on its next visit,
      // clears its caches and unregisters. Deleting the file instead would
      // strand installed workers forever: the SPA catch-all answers /sw.js
      // with HTML, which is a failed update, not a 404. The manifest below
      // keeps the app installable.
      selfDestroying: true,
      devOptions: {
        enabled: false,
      },
      useCredentials: true,
      includeManifestIcons: false,
      includeAssets: [],
      manifest: {
        name: 'Hanzo Chat',
        short_name: 'Hanzo Chat',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#171717',
        icons: [
          {
            src: 'assets/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: 'assets/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: 'assets/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: 'assets/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'assets/maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
    sourcemapExclude({ excludeNodeModules: true }),
    compression({
      threshold: 10240,
    }),
  ],
  publicDir: command === 'serve' ? './public' : false,
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    outDir: './dist',
    minify: 'terser',
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      output: {
        manualChunks(id: string) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('node_modules')) {
            // High-impact chunking for large libraries

            // IMPORTANT: mermaid and ALL its dependencies must be in the same chunk
            // to avoid initialization order issues. This includes chevrotain, langium,
            // dagre-d3-es, and their nested lodash-es dependencies.
            if (
              normalizedId.includes('mermaid') ||
              normalizedId.includes('dagre-d3-es') ||
              normalizedId.includes('chevrotain') ||
              normalizedId.includes('langium') ||
              normalizedId.includes('lodash-es')
            ) {
              return 'mermaid';
            }

            if (normalizedId.includes('@codesandbox/sandpack')) {
              return 'sandpack';
            }
            if (normalizedId.includes('react-virtualized')) {
              return 'virtualization';
            }
            if (normalizedId.includes('i18next') || normalizedId.includes('react-i18next')) {
              return 'i18n';
            }
            // Only regular lodash (not lodash-es which goes to mermaid chunk)
            if (normalizedId.includes('/lodash/')) {
              return 'utilities';
            }
            if (normalizedId.includes('date-fns')) {
              return 'date-utils';
            }
            if (normalizedId.includes('@dicebear')) {
              return 'avatars';
            }
            if (normalizedId.includes('react-dnd') || normalizedId.includes('react-flip-toolkit')) {
              return 'react-interactions';
            }
            if (normalizedId.includes('react-hook-form')) {
              return 'forms';
            }
            if (normalizedId.includes('react-router-dom')) {
              return 'routing';
            }
            if (
              normalizedId.includes('qrcode.react') ||
              normalizedId.includes('@marsidev/react-turnstile')
            ) {
              return 'security-ui';
            }

            if (normalizedId.includes('@codemirror/view')) {
              return 'codemirror-view';
            }
            if (normalizedId.includes('@codemirror/state')) {
              return 'codemirror-state';
            }
            if (normalizedId.includes('@codemirror/language')) {
              return 'codemirror-language';
            }
            if (normalizedId.includes('@codemirror')) {
              return 'codemirror-core';
            }

            if (
              normalizedId.includes('react-markdown') ||
              normalizedId.includes('remark-') ||
              normalizedId.includes('rehype-')
            ) {
              return 'markdown-processing';
            }
            if (normalizedId.includes('monaco-editor') || normalizedId.includes('@monaco-editor')) {
              return 'code-editor';
            }
            if (normalizedId.includes('react-window') || normalizedId.includes('react-virtual')) {
              return 'virtualization';
            }
            if (
              normalizedId.includes('zod') ||
              normalizedId.includes('yup') ||
              normalizedId.includes('joi')
            ) {
              return 'validation';
            }
            if (
              normalizedId.includes('axios') ||
              normalizedId.includes('ky') ||
              normalizedId.includes('fetch')
            ) {
              return 'http-client';
            }
            if (
              normalizedId.includes('react-spring') ||
              normalizedId.includes('react-transition-group')
            ) {
              return 'animations';
            }
            if (normalizedId.includes('react-select') || normalizedId.includes('downshift')) {
              return 'advanced-inputs';
            }
            if (normalizedId.includes('heic-to')) {
              return 'heic-converter';
            }

            // Existing chunks
            if (normalizedId.includes('@radix-ui')) {
              return 'radix-ui';
            }
            if (normalizedId.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (normalizedId.includes('node_modules/highlight.js')) {
              return 'markdown_highlight';
            }
            if (normalizedId.includes('katex') || normalizedId.includes('node_modules/katex')) {
              return 'math-katex';
            }
            if (normalizedId.includes('node_modules/hast-util-raw')) {
              return 'markdown_large';
            }
            if (normalizedId.includes('@tanstack')) {
              return 'tanstack-vendor';
            }
            if (normalizedId.includes('@headlessui')) {
              return 'headlessui';
            }

            // Everything else falls into a generic vendor chunk.
            return 'vendor';
          }
          // Locales: NO manual chunk. i18n.ts statically bundles only `en` and
          // lazy-imports the rest via import.meta.glob; forcing them all into
          // one 'locales' chunk would weld the 40 lazy locales to the eagerly
          // imported `en` module and drag 572KB gzip back into the entry graph.
          // Left to Rollup, `en` folds into the entry and each other locale
          // becomes its own on-demand chunk.
          // Let Rollup decide automatically for any other files.
          return null;
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0] && /\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.names[0])) {
            return 'assets/fonts/[name][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
      },
      /**
       * Ignore "use client" warning since we are not using SSR
       * @see {@link https://github.com/TanStack/query/pull/5161#issuecomment-1477389761 Preserve 'use client' directives TanStack/query#5161}
       */
      onwarn(warning, warn) {
        if (warning.message.includes('Error when using sourcemap')) {
          return;
        }
        warn(warning);
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  resolve: {
    // One axios for the whole page, no matter how many module copies import
    // it. The data-provider ships two entrypoints that each inline their own
    // copy of the request layer; without dedupe the bundle carries two axios
    // instances, setTokenHeader writes defaults on one, and any request that
    // fires through the other goes out with NO Authorization — measured as
    // the guest send 401ing seconds after a bootstrap call carried the
    // bearer fine.
    dedupe: ['axios'],
    alias: {
      '~': path.join(__dirname, 'src/'),
      $fonts: path.resolve(__dirname, 'public/fonts'),
      'micromark-extension-math': 'micromark-extension-llm-math',
      // @hanzo/ui's primitives are backed by @hanzo/gui, which is authored
      // against the react-native API. On web that API IS react-native-web.
      // Prefix-safe: @rollup/plugin-alias only matches `react-native` exactly
      // or `react-native/…`, so `react-native-svg` and `react-native-web`
      // resolve to themselves.
      'react-native': 'react-native-web',
    },
    // react-native-web's convention is a `.web.*` sibling that replaces the
    // native module. Vite has no built-in knowledge of it, so without this
    // `react-native-svg` resolves to its Fabric (native) build and reaches for
    // `react-native-web/Libraries/Utilities/codegenNativeComponent`, which does
    // not exist. Listing `.web.*` first makes the web sibling win.
    extensions: webFirstExtensions,
  },
  optimizeDeps: {
    include: [
      // Pre-bundle the compiled-ESM shell so the dev server resolves it cleanly.
      '@hanzogui/shell',
      // `@hanzo/gui` is excluded below, so nothing pre-bundles the react-native
      // graph it pulls in. Two modules in it are CommonJS and are imported BY NAME:
      // react-native-web's `@react-native/normalize-colors` (as `default`) and
      // react-native-svg's PEG.js-generated `lib/extract/transform.js` (as `parse`).
      // Vite's dev ESM pipeline cannot synthesise named exports from CJS, so the
      // page dies on ONE pageerror ("does not provide an export named …"), React
      // never mounts, and the whole app renders blank. `vite build` is unaffected —
      // Rollup's commonjs plugin does the interop — so this is INVISIBLE to the
      // build and fatal to `npm run frontend:dev`. Pre-bundling is the fix, and it
      // only works together with the esbuildOptions below.
      'react-native-web',
      '@react-native/normalize-colors',
      'react-native-svg',
      // Reached only through the excluded `@hanzo/gui` (via @hanzogui/normalize-css-color).
      // Plain CJS, no exports map, no `type` — served raw it throws
      // `module is not defined` at load. Note this is `normalize-color`, SINGULAR;
      // `normalize-colors` above is a different package and both are installed.
      '@react-native/normalize-color',
    ],
    // @hanzo/gui ships as source-shaped ESM across ~60 @hanzogui/* packages.
    // Pre-bundling it flattens that graph for the dev server.
    exclude: ['@hanzo/gui', '@hanzo/ui'],
    esbuildOptions: {
      // `resolve.extensions` above governs Vite/Rollup, NOT the esbuild dep
      // optimizer — esbuild resolves with its own defaults. Without this the
      // optimizer ignores the `.web.js` siblings, walks into react-native-svg's
      // Fabric build, and fails on `codegenNativeComponent`. Both resolvers must
      // agree, so they read the same list.
      resolveExtensions: webFirstExtensions,
    },
  },
}));

interface SourcemapExclude {
  excludeNodeModules?: boolean;
}

export function sourcemapExclude(opts?: SourcemapExclude): Plugin {
  return {
    name: 'sourcemap-exclude',
    transform(code: string, id: string) {
      if (opts?.excludeNodeModules && id.includes('node_modules')) {
        return {
          code,
          // https://github.com/rollup/rollup/blob/master/docs/plugin-development/index.md#source-code-transformations
          map: { mappings: '' },
        };
      }
    },
  };
}
