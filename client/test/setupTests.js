/* This file is automatically executed before running tests
 * https://create-react-app.dev/docs/running-tests/#initializing-test-environment
 */

// react-testing-library renders your components to document.body,
// this adds jest-dom's custom assertions
// https://github.com/testing-library/jest-dom#table-of-contents
import '@testing-library/jest-dom';

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock canvas when run unit test cases with jest.
// 'react-lottie' uses canvas
import 'jest-canvas-mock';

// Mock ResizeObserver
import './resizeObserver.mock';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/* jsdom marks Location [Unforgeable]: `assign`, `replace` and `reload` are own
 * properties with `writable: false, configurable: false`, so
 * `jest.spyOn(window.location, 'replace')` throws and takes the WHOLE suite down
 * with "Test suite failed to run" — zero tests reported. `window.location`
 * itself IS configurable, so swap it for a stand-in whose navigation methods are
 * plain mocks and whose URL fields read through to the real Location, keeping
 * `window.history.pushState/replaceState` authoritative for `pathname`. */
const liveLocation = document.location;
Object.defineProperty(window, 'location', {
  configurable: true,
  value: Object.defineProperties(
    {
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      toString: () => liveLocation.href,
    },
    Object.fromEntries(
      ['href', 'origin', 'protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash'].map(
        (field) => [
          field,
          {
            enumerable: true,
            configurable: true,
            get: () => liveLocation[field],
            set: (value) => {
              liveLocation[field] = value;
            },
          },
        ],
      ),
    ),
  ),
});

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => {
      const i18n = require('~/locales/i18n').default;
      return {
        t: (key, options) => i18n.t(key, options),
        i18n: {
          ...i18n,
          changeLanguage: jest.fn(),
        },
      };
    },
    initReactI18next: {
      type: '3rdParty',
      init: jest.fn(),
    },
  };
});
