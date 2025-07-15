import type { PluginAuthMethods } from '@hanzochat/data-schemas';
import type { GenericTool } from '@hanzochat/agents';
export declare function getUserMCPAuthMap({ userId, tools, appTools, findPluginAuthsByKeys, }: {
    userId: string;
    tools: GenericTool[] | undefined;
    appTools: Record<string, unknown>;
    findPluginAuthsByKeys: PluginAuthMethods['findPluginAuthsByKeys'];
}): Promise<Record<string, Record<string, string>>>;
