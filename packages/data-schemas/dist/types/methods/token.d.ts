import type { QueryOptions } from 'mongoose';
import type { DataHandle } from '~/common/dataHandle';
import { IToken, TokenCreateData, TokenQuery, TokenUpdateData, TokenDeleteResult } from '~/types';
/**
 * Factory that returns the token methods bound to a store-aware `DataHandle`
 * (same seam as the migrated domains). `handle.models.Token` resolves to the
 * backend selected by `createModels()` + `applySqliteOverrides()` (mongoose
 * `Model`, SQLite `DocModel`, or `DualWriteModel`); every method speaks only the
 * bounded Model API, never `new Token()` / `doc.save()`.
 */
export declare function createTokenMethods(handle: DataHandle): {
    findToken: (query: TokenQuery, options?: QueryOptions) => Promise<IToken | null>;
    createToken: (tokenData: TokenCreateData) => Promise<IToken>;
    updateToken: (query: TokenQuery, updateData: TokenUpdateData) => Promise<IToken | null>;
    deleteTokens: (query: TokenQuery) => Promise<TokenDeleteResult>;
};
export type TokenMethods = ReturnType<typeof createTokenMethods>;
