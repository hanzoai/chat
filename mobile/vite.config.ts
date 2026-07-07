import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// @hanzo/gui is a Tamagui fork: its web build reaches for `react-native`
// primitives, so we alias them to `react-native-web` (the same wiring the
// hanzoai/status Vite app uses). No Tamagui compiler plugin — runtime config
// via GuiProvider is enough for a mobile webview and keeps the build simple.
//
// Tauri: the dev server must stay on a fixed host/port so the Rust shell can
// point its WebView at it (see src-tauri/tauri.conf.json `devUrl`).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  define: {
    // Tamagui reads this to pick the web output at bundle time.
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Match tsconfig (ES2022); esbuild refuses to downlevel some dependency
    // syntax to vite's legacy baseline. Mobile webviews are modern.
    target: 'es2022',
  },
  server: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
  },
})
