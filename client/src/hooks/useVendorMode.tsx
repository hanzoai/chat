import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { QueryKeys } from '@hanzochat/data-provider';
import store from '~/store';

export interface VendorConfig {
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

const defaultVendorConfig: VendorConfig = {
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

export default function useVendorMode() {
  const setEndpointsConfig = useSetRecoilState(store.endpointsConfig);
  const setModelsConfig = useSetRecoilState(store.modelsConfig);

  const { data: vendorConfig = defaultVendorConfig, isLoading } = useQuery<VendorConfig>({
    queryKey: [QueryKeys.vendorConfig],
    queryFn: async () => {
      const response = await fetch('/api/vendor/config');
      if (!response.ok) {
        throw new Error('Failed to fetch vendor config');
      }
      return response.json();
    },
    enabled: true,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Apply vendor mode configuration to global state
  useEffect(() => {
    if (!vendorConfig.enabled || isLoading) {
      return;
    }

    // Override endpoints config for vendor mode
    setEndpointsConfig({
      [vendorConfig.name]: {
        type: 'custom',
        userProvide: false,
        userProvideURL: false,
        order: 0,
        models: vendorConfig.availableModels,
        iconURL: vendorConfig.logoUrl,
      },
    });

    // Set models config
    const modelsConfig: Record<string, string[]> = {
      [vendorConfig.name]: vendorConfig.availableModels.map(m => m.id),
    };
    setModelsConfig(modelsConfig);

    // Update app title if configured
    if (vendorConfig.appTitle && typeof document !== 'undefined') {
      document.title = vendorConfig.appTitle;
    }

    // Apply brand color as CSS variable
    if (vendorConfig.brandColor && typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-color', vendorConfig.brandColor);
    }
  }, [vendorConfig, isLoading, setEndpointsConfig, setModelsConfig]);

  return {
    vendorConfig,
    isVendorMode: vendorConfig.enabled,
    isLoading,
    vendorName: vendorConfig.name,
    hideModelSwitcher: vendorConfig.hideModelSwitcher,
    hideEndpointMenu: vendorConfig.hideEndpointMenu,
    hideApiKeyInput: vendorConfig.hideApiKeyInput,
    hideAdvancedSettings: vendorConfig.hideAdvancedSettings,
    defaultModel: vendorConfig.defaultModel,
  };
}