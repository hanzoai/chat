import { atom } from 'jotai';
import { atomWithLocalStorage } from '~/store/utils';
import { PromptsEditorMode } from '~/common';

// Static atoms without localStorage
const staticAtoms = {
  // `name` filter
  promptsName: atom<string>(''),
  // `category` filter
  promptsCategory: atom<string>(''),
  // `pageNumber` filter
  promptsPageNumber: atom<number>(1),
  // `pageSize` filter
  promptsPageSize: atom<number>(10),
};

// Atoms with localStorage
const localStorageAtoms = {
  autoSendPrompts: atomWithLocalStorage('autoSendPrompts', true),
  alwaysMakeProd: atomWithLocalStorage('alwaysMakeProd', true),
  // Editor mode
  promptsEditorMode: atomWithLocalStorage<PromptsEditorMode>(
    'promptsEditorMode',
    PromptsEditorMode.SIMPLE,
  ),
};

export default { ...staticAtoms, ...localStorageAtoms };
