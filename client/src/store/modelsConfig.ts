import { atom } from 'recoil';

// The structure is a mapping from brand name (string) to an array of model IDs (string[])
// This matches usage in useBrandMode.tsx for setModelsConfig
export type ModelsConfig = Record<string, string[]>;

const modelsConfig = atom<ModelsConfig>({
  key: 'modelsConfig',
  default: {},
});

export default {
  modelsConfig,
};
