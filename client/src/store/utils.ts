import { atom } from 'jotai';
import { atomFamily, atomWithReset, atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/**
 * An atom persisted to localStorage: read on first access, written on every
 * set. Changes reach other tabs through the browser `storage` event.
 *
 * `sane` runs on everything that comes OUT of storage — the first read and
 * every cross-tab update — and returns a value of the shape the app promises.
 * Reach for it whenever code downstream would be hurt by a value it did not
 * write, because a validator on the write path alone does not survive a reload:
 * the bytes in localStorage are not ours. A previous release wrote a different
 * shape; an extension or a devtools console can write anything at all. Storage
 * already yields the default for a key that is missing or is not JSON — `sane`
 * is what covers valid JSON of the WRONG SHAPE, which is the case that reaches
 * a component and throws there.
 *
 * Omit it when any JSON at all is harmless (a boolean, a string).
 */
export function atomWithLocalStorage<T>(
  key: string,
  defaultValue: T,
  sane: (value: unknown) => T = (value) => value as T,
) {
  const json = createJSONStorage<T>();
  return atomWithStorage<T>(
    key,
    defaultValue,
    {
      ...json,
      getItem: (name, initial) => sane(json.getItem(name, initial)),
      subscribe: (name, notify, initial) =>
        json.subscribe?.(name, (value) => notify(sane(value)), initial),
    },
    { getOnInit: true },
  );
}

/**
 * localStorage that deliberately does not subscribe to the `storage` event, so
 * each tab keeps its own value. For per-tab working state — which MCP servers
 * this tab has selected — rather than for a user preference.
 */
export function tabStorage<T>(): SyncStorage<T> {
  return {
    getItem(key: string, initialValue: T): T {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      try {
        const stored = localStorage.getItem(key);
        return stored === null ? initialValue : (JSON.parse(stored) as T);
      } catch {
        return initialValue;
      }
    },
    setItem(key: string, newValue: T): void {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch {
        /* quota exceeded or storage denied — the value simply is not persisted */
      }
    },
    removeItem(key: string): void {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        localStorage.removeItem(key);
      } catch {
        /* as above */
      }
    },
    // `subscribe` is intentionally absent — that absence is what isolates the tab.
  };
}

/** An atom persisted to localStorage that does not sync across tabs. */
export function atomWithTabStorage<T>(key: string, defaultValue: T) {
  return atomWithStorage<T>(key, defaultValue, tabStorage<T>(), { getOnInit: true });
}

/**
 * A parameterised atom: one independent, resettable atom per key.
 *
 * `defaultValue` is shared by reference across every member, so pass an
 * immutable value or treat each member as copy-on-write.
 */
export function family<P, T>(defaultValue: T) {
  return atomFamily((_param: P) => atomWithReset<T>(defaultValue));
}

/**
 * Read a persisted value before React mounts, for a setting that must reach the
 * DOM on the first paint (font size) rather than one render later.
 */
export function readStorage<T>(key: string, defaultValue: T, apply?: (value: T) => void): T {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return defaultValue;
  }

  let value = defaultValue;
  try {
    const saved = localStorage.getItem(key);
    if (saved != null) {
      value = JSON.parse(saved) as T;
    }
  } catch (error) {
    console.error(`Error reading ${key} from localStorage, using default. Error:`, error);
    try {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    } catch (resetError) {
      console.error(`Error resetting corrupted ${key} in localStorage:`, resetError);
    }
  }

  apply?.(value);
  return value;
}

/**
 * An atom persisted to localStorage that also pushes each new value somewhere
 * outside React — the DOM, in practice.
 */
export function atomWithLocalStorageEffect<T>(
  key: string,
  defaultValue: T,
  apply: (value: T) => void,
) {
  const stored = atomWithLocalStorage<T>(key, defaultValue);

  return atom(
    (get) => get(stored),
    (_get, set, value: T) => {
      set(stored, value);
      if (typeof window !== 'undefined') {
        apply(value);
      }
    },
  );
}
