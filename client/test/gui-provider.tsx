import React from 'react';
import { GuiProvider } from '@hanzo/gui';
import guiConfig from '@hanzo/ui/gui-config';

/**
 * The one place tests say "components live inside GuiProvider".
 *
 * App.jsx mounts it around the whole tree, so a component rendered without it is
 * being tested in a configuration that does not ship. @hanzo/ui 8.x primitives
 * enforce this at runtime: outside a provider they throw `Missing theme.`, and
 * the stack points at the test's `render(...)` line rather than at the primitive,
 * so the cause is not obvious from the failure.
 *
 * Prefer `renderWithProviders` (test/layout-test-utils) when a test also needs
 * the query client, router and auth context. Reach for this directly when a spec
 * builds its own wrapper or renders a component bare.
 */
export const GuiTestProvider = ({ children }: { children: React.ReactNode }) => (
  <GuiProvider config={guiConfig} defaultTheme="dark">
    {children}
  </GuiProvider>
);

export default GuiTestProvider;
