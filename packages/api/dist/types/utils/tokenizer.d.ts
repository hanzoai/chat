import type { Tiktoken, TiktokenModel, TiktokenEncoding } from 'tiktoken';
declare class Tokenizer {
    tokenizersCache: Record<string, Tiktoken>;
    tokenizerCallsCount: number;
    private options?;
    constructor();
    getTokenizer(encoding: TiktokenModel | TiktokenEncoding, isModelName?: boolean, extendSpecialTokens?: Record<string, number>): Tiktoken;
    freeAndResetAllEncoders(): void;
    resetTokenizersIfNecessary(): void;
    getTokenCount(text: string, encoding?: TiktokenModel | TiktokenEncoding): number;
}
declare const TokenizerSingleton: Tokenizer;
/**
 * Counts the number of tokens in a given text using tiktoken.
 * This is an async wrapper around Tokenizer.getTokenCount for compatibility.
 * @param text - The text to be tokenized. Defaults to an empty string if not provided.
 * @returns The number of tokens in the provided text.
 */
export declare function countTokens(text?: string): Promise<number>;
export default TokenizerSingleton;
//# sourceMappingURL=tokenizer.d.ts.map