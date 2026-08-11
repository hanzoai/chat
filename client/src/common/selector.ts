import React from 'react';
import { TStartupConfig } from '@hanzochat/data-provider';

export interface Endpoint {
  value: string;
  label: string;
  hasModels: boolean;
  models?: Array<{ name: string; isGlobal?: boolean }>;
  icon: React.ReactNode;
  agentNames?: Record<string, string>;
  assistantNames?: Record<string, string>;
  modelIcons?: Record<string, string | undefined>;
}

export interface SelectedValues {
  endpoint: string | null;
  model: string | null;
  modelSpec: string | null;
}

export interface ModelSelectorProps {
  startupConfig: TStartupConfig | undefined;
  /**
   * `block` (default) is the standalone, full-width picker. `inline` is the
   * compact ghost chip that rides the composer's action row beside the "+", so
   * the model you are on shows and is switchable mid-conversation.
   */
  variant?: 'block' | 'inline';
}
