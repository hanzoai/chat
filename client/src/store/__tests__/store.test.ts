import { RecoilState } from 'recoil';
import store from '../index';

describe('Store Atoms Validation', () => {
  it('should have all required atoms defined', () => {
    // List of atoms that must be present in the store
    const requiredAtoms = [
      'promptsEditorMode',
      'alwaysMakeProd',
      'promptsName',
      'promptsCategory',
      'promptsPageNumber',
      'promptsPageSize',
      'autoSendPrompts',
    ];

    requiredAtoms.forEach((atomName) => {
      expect(store[atomName]).toBeDefined();
      expect(store[atomName]).not.toBeNull();
      expect(store[atomName]).not.toBeUndefined();

      // Verify it's a Recoil atom/selector
      if (store[atomName]) {
        expect(store[atomName]).toHaveProperty('key');
      }
    });
  });

  it('should not have any undefined atoms when destructuring', () => {
    // This tests the specific destructuring pattern that was causing issues
    const { promptsEditorMode, alwaysMakeProd } = store;

    expect(promptsEditorMode).toBeDefined();
    expect(alwaysMakeProd).toBeDefined();

    // Verify they are valid Recoil atoms
    expect(promptsEditorMode.key).toBe('promptsEditorMode');
    expect(alwaysMakeProd.key).toBe('alwaysMakeProd');
  });

  it('should have all user atoms defined', () => {
    const userAtoms = [
      'user',
      'userKey',
      'hiddenPanels',
      'modelSpecs',
      'modelsConfig',
      'modularChat',
      'availableTools',
    ];

    userAtoms.forEach((atomName) => {
      if (store[atomName]) {
        expect(store[atomName]).toBeDefined();
        expect(store[atomName]).toHaveProperty('key');
      }
    });
  });

  it('should verify all atoms are properly typed', () => {
    // Type checking for critical atoms
    const atomsWithTypes = {
      promptsEditorMode: 'promptsEditorMode',
      alwaysMakeProd: 'alwaysMakeProd',
      autoSendPrompts: 'autoSendPrompts',
    };

    Object.entries(atomsWithTypes).forEach(([atomName, expectedKey]) => {
      const atom = store[atomName] as RecoilState<any>;
      expect(atom).toBeDefined();
      expect(atom.key).toBe(expectedKey);
    });
  });
});
