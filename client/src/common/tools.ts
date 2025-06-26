import type { AuthType } from 'chat-data-provider';

export type ApiKeyFormData = {
  apiKey: string;
  authType?: string | AuthType;
};
