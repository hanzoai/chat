import type { PluginAuthMethods } from '@hanzochat/data-schemas';
import type { GenericTool } from '@hanzochat/agents';
export declare function getUserMCPAuthMap({ userId, tools, servers, toolInstances, findPluginAuthsByKeys, }: {
    userId: string;
    tools?: (string | undefined)[];
    servers?: (string | undefined)[];
    toolInstances?: (GenericTool | null)[];
    findPluginAuthsByKeys: PluginAuthMethods['findPluginAuthsByKeys'];
}): Promise<Record<string, Record<string, string>>>;
//# sourceMappingURL=auth.d.ts.map