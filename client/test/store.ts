import { createStore } from 'jotai';

export type Store = ReturnType<typeof createStore>;

/**
 * A fresh jotai store, optionally seeded — the equivalent of the
 * `initializeState` prop tests used to hand to Recoil's root.
 *
 *   render(<Provider store={seed((s) => s.set(myAtom, 1))}>{ui}</Provider>)
 */
export function seed(init?: (store: Store) => void): Store {
  const store = createStore();
  init?.(store);
  return store;
}
