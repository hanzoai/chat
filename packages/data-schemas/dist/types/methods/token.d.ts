import type { QueryOptions } from 'mongoose';
import { IToken, TokenCreateData, TokenQuery, TokenUpdateData, TokenDeleteResult } from '~/types';
export declare function createTokenMethods(mongoose: typeof import('mongoose')): {
    findToken: (query: TokenQuery, options?: QueryOptions) => Promise<IToken | null>;
    createToken: (tokenData: TokenCreateData) => Promise<IToken>;
    updateToken: (query: TokenQuery, updateData: TokenUpdateData) => Promise<IToken | null>;
    deleteTokens: (query: TokenQuery) => Promise<TokenDeleteResult>;
};
export type TokenMethods = ReturnType<typeof createTokenMethods>;
