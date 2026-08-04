import './matchMedia.mock';
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContextProvider } from '~/hooks/AuthContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'jotai';
import { GuiTestProvider } from './gui-provider';

const client = new QueryClient();

function renderWithProvidersWrapper(ui, { ...options } = {}) {
  function Wrapper({ children }) {
    return (
      // GuiTestProvider is here for the same reason QueryClientProvider and
      // AuthContextProvider are: App.jsx mounts it around the whole tree, so a
      // component rendered without it is being tested in a configuration that
      // does not ship. @hanzo/ui 8.x primitives (Switch, Checkbox, …) refuse to
      // render outside it — "Missing theme." — and every Speech settings switch
      // hit exactly that the moment Switch moved off Radix.
      <GuiTestProvider>
        <QueryClientProvider client={client}>
          <Provider>
            <Router>
              <AuthContextProvider
                authConfig={{
                  loginRedirect: '',
                  test: true,
                }}
              >
                {children}
              </AuthContextProvider>
            </Router>
          </Provider>
        </QueryClientProvider>
      </GuiTestProvider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}
export * from '@testing-library/react';
export { renderWithProvidersWrapper as render };
