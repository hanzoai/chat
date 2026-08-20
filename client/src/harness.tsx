/**
 * Measuring instrument for the Nav conversion pilot — NOT shipped code.
 *
 * The app itself paints nothing without a backend (it blocks on the startup
 * config fetch), so the sidebar cannot be measured in place. This mounts the
 * REAL components in the REAL cascade instead: the same CSS chain main.jsx
 * loads, the same GuiProvider App.jsx mounts, the same `dark` class index.html
 * stamps on <html>. Before/after computed styles are therefore measured in one
 * identical context, which is what makes a pixel diff mean something.
 */
import 'regenerator-runtime/runtime';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai';
import { GuiProvider } from '@hanzo/gui';
import guiConfig from '@hanzo/ui/gui-config';
import './locales/i18n';
import './gui.css';
import './style.css';
import './mobile.css';

import Rail from './components/Nav/Rail';
import Signature from './components/Nav/Signature';

// Signature's atom reads localStorage at init, the way the browser would have.
localStorage.setItem('signature', JSON.stringify('— The Zoo Queen, keeper of the long tail'));

const root = createRoot(document.getElementById('root')!);

root.render(
  <JotaiProvider>
    <GuiProvider config={guiConfig} defaultTheme="dark">
      <MemoryRouter initialEntries={['/sites']}>
        {/* The sidebar's real geometry: a 260px column on the app's own ground.
            The width is an inline style on purpose — an arbitrary Tailwind value
            used nowhere else in the app would not be in the generated sheet, so
            the instrument would silently measure a full-width column. */}
        <div
          id="harness-column"
          style={{ width: 260 }}
          className="flex h-screen flex-col bg-surface-primary-alt"
        >
          <Rail toggleNav={() => undefined} />
          <div className="mt-auto">
            <Signature />
          </div>
        </div>
      </MemoryRouter>
    </GuiProvider>
  </JotaiProvider>,
);
