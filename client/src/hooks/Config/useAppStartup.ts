import { useEffect } from 'react';
import { useAtom } from 'jotai';
import type { TStartupConfig } from '@hanzochat/data-provider';
import { cleanupTimestampedStorage } from '~/utils/timestamps';
import useSpeechSettingsInit from './useSpeechSettingsInit';
import { useMCPToolsQuery, useMCPServersQuery } from '~/data-provider';
import store from '~/store';
import { learnAppName, nameDocument } from '~/utils';

export default function useAppStartup({
  startupConfig,
  isAuthenticated,
}: {
  startupConfig?: TStartupConfig;
  /** A guest has a `user` too, and these routes refuse its bearer — so gate on the
      real session, never on the presence of a user object. */
  isAuthenticated: boolean;
}) {
  const [defaultPreset, setDefaultPreset] = useAtom(store.defaultPreset);

  useSpeechSettingsInit(isAuthenticated);
  const { data: loadedServers, isLoading: serversLoading } = useMCPServersQuery();

  useMCPToolsQuery({
    enabled:
      !serversLoading &&
      !!loadedServers &&
      Object.keys(loadedServers).length > 0 &&
      isAuthenticated,
  });

  /** Clean up old localStorage entries on startup */
  useEffect(() => {
    cleanupTimestampedStorage();
  }, []);

  /** Set the app title */
  useEffect(() => {
    learnAppName(startupConfig?.appTitle);
    nameDocument();
  }, [startupConfig]);

  /** Set the default spec's preset as default */
  useEffect(() => {
    if (defaultPreset && defaultPreset.spec != null) {
      return;
    }

    const modelSpecs = startupConfig?.modelSpecs?.list;

    if (!modelSpecs || !modelSpecs.length) {
      return;
    }

    const defaultSpec = modelSpecs.find((spec) => spec.default);

    if (!defaultSpec) {
      return;
    }

    setDefaultPreset({
      ...defaultSpec.preset,
      iconURL: defaultSpec.iconURL,
      spec: defaultSpec.name,
    });
  }, [defaultPreset, setDefaultPreset, startupConfig?.modelSpecs?.list]);
}
