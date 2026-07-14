import type { AuthType } from '@hanzochat/data-provider';

export type ApiKeyFormData = {
  apiKey: string;
  authType?: string | AuthType;
};
