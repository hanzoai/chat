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
export declare function extractChatParams(options?: DynamicSettingProps['conversation']): ChatParams;
export {};
