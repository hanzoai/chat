import type { TCustomConfig, TWebSearchConfig } from './config';
import { SearchCategories } from './config';
import { AuthType } from './schemas';
export declare function loadWebSearchConfig(config: TCustomConfig['webSearch']): TCustomConfig['webSearch'];
export type TWebSearchKeys = 'serperApiKey' | 'firecrawlApiKey' | 'firecrawlApiUrl' | 'jinaApiKey' | 'cohereApiKey';
export type TWebSearchCategories = SearchCategories.PROVIDERS | SearchCategories.SCRAPERS | SearchCategories.RERANKERS;
export declare const webSearchAuth: {
    providers: {
        serper: {
            serperApiKey: 1;
        };
    };
    scrapers: {
        firecrawl: {
            firecrawlApiKey: 1;
            /** Optional (0) */
            firecrawlApiUrl: 0;
        };
    };
    rerankers: {
        jina: {
            jinaApiKey: 1;
        };
        cohere: {
            cohereApiKey: 1;
        };
    };
};
/**
 * Extracts all API keys from the webSearchAuth configuration object
 */
export declare function getWebSearchKeys(): TWebSearchKeys[];
export declare const webSearchKeys: TWebSearchKeys[];
export declare function extractWebSearchEnvVars({ keys, config, }: {
    keys: TWebSearchKeys[];
    config: TCustomConfig['webSearch'] | undefined;
}): string[];
/**
 * Type for web search authentication result
 */
export interface WebSearchAuthResult {
    /** Whether all required categories have at least one authenticated service */
    authenticated: boolean;
    /** Authentication type (user_provided or system_defined) by category */
    authTypes: [TWebSearchCategories, AuthType][];
    /** Original authentication values mapped to their respective keys */
    authResult: Partial<TWebSearchConfig>;
}
/**
 * Loads and verifies web search authentication values
 * @param params - Authentication parameters
 * @returns Authentication result
 */
export declare function loadWebSearchAuth({ userId, webSearchConfig, loadAuthValues, throwError, }: {
    userId: string;
    webSearchConfig: TCustomConfig['webSearch'];
    loadAuthValues: (params: {
        userId: string;
        authFields: string[];
        optional?: Set<string>;
        throwError?: boolean;
    }) => Promise<Record<string, string>>;
    throwError?: boolean;
}): Promise<WebSearchAuthResult>;
