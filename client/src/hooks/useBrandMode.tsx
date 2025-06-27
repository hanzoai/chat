import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { QueryKeys } from '@hanzochat/data-provider';
import store from '~/store';

export interface BrandConfig {
  enabled: boolean;
  name: string;
  models: {
    default: string;
    pro: string;
  };
  hideModelSwitcher: boolean;
  hideSidePanelParameters: boolean;
  hideEndpointMenu: boolean;
  hideApiKeyInput: boolean;
  hideAdvancedSettings: boolean;
  appTitle: string;
  brandColor?: string;
  logoUrl?: string;
  defaultModel: string;
  availableModels: Array<{
    id: string;
    name: string;
    description: string;
    maxTokens: number;
    capabilities?: string[];
  }>;
}

const defaultBrandConfig: BrandConfig = {
  enabled: false,
  name: 'Hanzo AI',
  models: {
    default: 'Hanzo Zen-1',
    pro: 'Hanzo Zen-1 Pro',
  },
  hideModelSwitcher: false,
  hideSidePanelParameters: false,
  hideEndpointMenu: false,
  hideApiKeyInput: false,
  hideAdvancedSettings: false,
  appTitle: 'Hanzo Chat',
  defaultModel: 'Hanzo Zen-1',
  availableModels: [],
};

export default function useBrandMode() {
  const setEndpointsConfig = useSetRecoilState(store.endpointsConfig);
  const setModelsConfig = useSetRecoilState(store.modelsConfig);

  const { data: brandConfig = defaultBrandConfig, isLoading } = useQuery<BrandConfig>({
    queryKey: [QueryKeys.brandConfig],
    queryFn: async () => {
      const response = await fetch('/api/brand/config');
      if (!response.ok) {
        throw new Error('Failed to fetch brand config');
      }
      return response.json();
    },
    enabled: true,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Apply brand mode configuration to global state
  useEffect(() => {
    if (!brandConfig.enabled || isLoading) {
      return;
    }

    // Override endpoints config for brand mode
    setEndpointsConfig({
      [brandConfig.name]: {
        type: 'custom',
        userProvide: false,
        userProvideURL: false,
        order: 0,
        models: brandConfig.availableModels,
        iconURL: brandConfig.logoUrl,
      },
    });

    // Set models config
    const modelsConfig: Record<string, string[]> = {
      [brandConfig.name]: brandConfig.availableModels.map((m) => m.id),
    };
    setModelsConfig(modelsConfig);

    // Update app title if configured
    if (brandConfig.appTitle && typeof document !== 'undefined') {
      document.title = brandConfig.appTitle;
    }

    // Apply brand color as CSS variable
    if (brandConfig.brandColor && typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-color', brandConfig.brandColor);
    }
  }, [brandConfig, isLoading, setEndpointsConfig, setModelsConfig]);

  return {
    brandConfig,
    isBrandMode: brandConfig.enabled,
    isLoading,
    brandName: brandConfig.name,
    hideModelSwitcher: brandConfig.hideModelSwitcher,
    hideEndpointMenu: brandConfig.hideEndpointMenu,
    hideApiKeyInput: brandConfig.hideApiKeyInput,
    hideAdvancedSettings: brandConfig.hideAdvancedSettings,
    defaultModel: brandConfig.defaultModel,
  };
}
