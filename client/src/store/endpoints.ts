import { atom } from 'jotai';
import { EModelEndpoint } from '@hanzochat/data-provider';
import type { TEndpointsConfig } from '@hanzochat/data-provider';

const defaultConfig: TEndpointsConfig = {
  [EModelEndpoint.azureOpenAI]: null,
  [EModelEndpoint.azureAssistants]: null,
  [EModelEndpoint.assistants]: null,
  [EModelEndpoint.agents]: null,
  [EModelEndpoint.openAI]: null,
  [EModelEndpoint.google]: null,
  [EModelEndpoint.anthropic]: null,
  [EModelEndpoint.custom]: null,
};

const endpointsConfig = atom<TEndpointsConfig>(defaultConfig);

const endpointsQueryEnabled = atom<boolean>(true);

const endpointsFilter = atom((get) => {
  const config = get(endpointsConfig) || {};

  const filter = {};
  for (const key of Object.keys(config)) {
    filter[key] = !!config[key];
  }
  return filter;
});

export default {
  endpointsConfig,
  endpointsFilter,
  defaultConfig,
  endpointsQueryEnabled,
};
