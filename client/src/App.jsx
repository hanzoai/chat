import { lazy, Suspense, useState, useEffect } from 'react';
import { Provider } from 'jotai';
import { DndProvider } from 'react-dnd';
import { RouterProvider } from 'react-router-dom';
import * as RadixToast from '@radix-ui/react-toast';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GuiProvider } from '@hanzo/gui';
import guiConfig from '@hanzo/ui/gui-config';
import { Toast, ThemeProvider, ToastProvider } from '@hanzochat/client';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ScreenshotProvider, useApiErrorBoundary } from './hooks';
import WakeLockManager from '~/components/System/WakeLockManager';
import { getThemeFromEnv } from './utils/getThemeFromEnv';
import { initializeFontSize } from '~/store/fontSize';
import { LiveAnnouncer } from '~/a11y';
import { router } from './routes';

// Dev-only: lazily loaded so the devtools bundle never ships in production builds.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null;

const App = () => {
  const { setError } = useApiErrorBoundary();

  // Stabilize the QueryClient for the app's lifetime. Creating it in the render
  // body mints a fresh, empty client on every re-render; a guest's expected 401s
  // (mcp/servers, files/config, …) fire `setError`, re-rendering App and swapping
  // in an empty client — so the lazy chat-form's `getQueryData([endpoints])`
  // resolves to a client with no `Hanzo` endpoint and submit throws
  // "Unknown endpoint: Hanzo". One client, one cache, every consumer.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Always attempt network requests, even when navigator.onLine is false
            // This is needed because localhost is reachable without WiFi
            networkMode: 'always',
          },
          mutations: {
            networkMode: 'always',
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (error?.response?.status === 401) {
              setError(error);
            }
          },
        }),
      }),
  );

  useEffect(() => {
    initializeFontSize();
  }, []);

  // Load theme from environment variables if available
  const envTheme = getThemeFromEnv();

  return (
    // Injection is off exactly where the compiler is on. `vite build` runs
    // gui's compiler, which writes that same sheet to src/gui.css (imported by
    // main.jsx) and ships it as a cacheable file — injecting it again would
    // duplicate 350KB into every document. The dev server does NOT run the
    // compiler (see vite.config.ts for why), so there it injects, as always.
    // Turning this on with nothing writing the sheet is how a page ends up with
    // no rules at all.
    <GuiProvider config={guiConfig} defaultTheme="dark" disableInjectCSS={!import.meta.env.DEV}>
      <QueryClientProvider client={queryClient}>
        <Provider>
          <LiveAnnouncer>
            <ThemeProvider
              // Only pass initialTheme and themeRGB if environment theme exists
              // This allows localStorage values to persist when no env theme is set
              {...(envTheme && { initialTheme: 'system', themeRGB: envTheme })}
            >
              {/* The ThemeProvider will automatically:
                1. Apply dark/light mode classes
                2. Apply custom theme colors if envTheme is provided
                3. Otherwise use stored theme preferences from localStorage
                4. Fall back to default theme colors if nothing is stored */}
              <RadixToast.Provider>
                <ToastProvider>
                  <DndProvider backend={HTML5Backend}>
                    <RouterProvider router={router} />
                    <WakeLockManager />
                    {import.meta.env.DEV && ReactQueryDevtools && (
                      <Suspense fallback={null}>
                        <ReactQueryDevtools initialIsOpen={false} position="top-right" />
                      </Suspense>
                    )}
                    <Toast />
                    <RadixToast.Viewport className="pointer-events-none fixed inset-0 z-[1000] mx-auto my-2 flex max-w-[560px] flex-col items-stretch justify-start md:pb-5" />
                  </DndProvider>
                </ToastProvider>
              </RadixToast.Provider>
            </ThemeProvider>
          </LiveAnnouncer>
        </Provider>
      </QueryClientProvider>
    </GuiProvider>
  );
};

export default () => (
  <ScreenshotProvider>
    <App />
    <iframe
      src="assets/silence.mp3"
      allow="autoplay"
      id="audio"
      title="audio-silence"
      style={{
        display: 'none',
      }}
    />
  </ScreenshotProvider>
);
