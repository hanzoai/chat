import React from 'react';
import { renderHook } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, useSetRecoilState } from 'recoil';
import store from '../index';
import { atomWithLocalStorage } from '../utils';
import { PromptsEditorMode } from '~/common';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  key: jest.fn(),
  length: 0,
};
global.localStorage = localStorageMock as any;

describe('Prompts Atoms Runtime Safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RecoilRoot>{children}</RecoilRoot>
  );

  it('should handle undefined atoms with fallback pattern', () => {
    // Simulate undefined atom
    const undefinedAtom = undefined;
    const fallbackAtom = undefinedAtom || atomWithLocalStorage('testAtom', 'defaultValue');

    expect(fallbackAtom).toBeDefined();
    expect(fallbackAtom.key).toBe('testAtom');
  });

  it('should use alwaysMakeProd atom with fallback', () => {
    const alwaysMakeProdAtom = store.alwaysMakeProd || atomWithLocalStorage('alwaysMakeProd', true);

    const { result } = renderHook(
      () => {
        const value = useRecoilValue(alwaysMakeProdAtom);
        const setValue = useSetRecoilState(alwaysMakeProdAtom);
        return { value, setValue };
      },
      { wrapper },
    );

    expect(result.current.value).toBe(true);
    expect(typeof result.current.setValue).toBe('function');
  });

  it('should use promptsEditorMode atom with fallback', () => {
    const promptsEditorModeAtom =
      store.promptsEditorMode ||
      atomWithLocalStorage<PromptsEditorMode>('promptsEditorMode', PromptsEditorMode.SIMPLE);

    const { result } = renderHook(
      () => {
        const value = useRecoilValue(promptsEditorModeAtom);
        const setValue = useSetRecoilState(promptsEditorModeAtom);
        return { value, setValue };
      },
      { wrapper },
    );

    expect(result.current.value).toBe(PromptsEditorMode.SIMPLE);
    expect(typeof result.current.setValue).toBe('function');
  });

  it('should not throw error when using fallback pattern', () => {
    // This simulates the pattern used in components
    expect(() => {
      const atom1 = store.alwaysMakeProd || atomWithLocalStorage('alwaysMakeProd', true);
      const atom2 =
        store.promptsEditorMode ||
        atomWithLocalStorage<PromptsEditorMode>('promptsEditorMode', PromptsEditorMode.SIMPLE);

      renderHook(
        () => {
          useSetRecoilState(atom1);
          useSetRecoilState(atom2);
        },
        { wrapper },
      );
    }).not.toThrow();
  });
});
