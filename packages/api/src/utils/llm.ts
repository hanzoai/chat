import { chat } from '@hanzochat/data-provider';
import type { DynamicSettingProps } from '@hanzochat/data-provider';

type ChatKeys = keyof typeof chat;

type ChatParams = {
  modelOptions: Omit<NonNullable<DynamicSettingProps['conversation']>, ChatKeys>;
  resendFiles: boolean;
  promptPrefix?: string | null;
  maxContextTokens?: number;
  modelLabel?: string | null;
};

/**
 * Separates Chat-specific parameters from model options
 * @param options - The combined options object
 */
export function extractChatParams(options?: DynamicSettingProps['conversation']): ChatParams {
  if (!options) {
    return {
      modelOptions: {} as Omit<NonNullable<DynamicSettingProps['conversation']>, ChatKeys>,
      resendFiles: chat.resendFiles.default as boolean,
    };
  }

  const modelOptions = { ...options };

  const resendFiles =
    (delete modelOptions.resendFiles, options.resendFiles) ?? (chat.resendFiles.default as boolean);
  const promptPrefix = (delete modelOptions.promptPrefix, options.promptPrefix);
  const maxContextTokens = (delete modelOptions.maxContextTokens, options.maxContextTokens);
  const modelLabel = (delete modelOptions.modelLabel, options.modelLabel);

  return {
    modelOptions: modelOptions as Omit<NonNullable<DynamicSettingProps['conversation']>, ChatKeys>,
    maxContextTokens,
    promptPrefix,
    resendFiles,
    modelLabel,
  };
}
