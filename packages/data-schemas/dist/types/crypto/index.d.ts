import 'dotenv/config';
import { SignPayloadParams } from '~/types';
export declare function signPayload({ payload, secret, expirationTime, }: SignPayloadParams): Promise<string>;
export declare function hashToken(str: string): Promise<string>;
/** --- Legacy v1/v2 Setup: AES-CBC with fixed key and IV --- */
/**
 * Encrypts a value using AES-CBC
 * @param value - The plaintext to encrypt
 * @returns The encrypted string in hex format
 */
export declare function encrypt(value: string): Promise<string>;
/**
 * Decrypts an encrypted value using AES-CBC
 * @param encryptedValue - The encrypted string in hex format
 * @returns The decrypted plaintext
 */
export declare function decrypt(encryptedValue: string): Promise<string>;
/** --- v2: AES-CBC with a random IV per encryption --- */
/**
 * Encrypts a value using AES-CBC with a random IV per encryption
 * @param value - The plaintext to encrypt
 * @returns The encrypted string with IV prepended (iv:ciphertext format)
 */
export declare function encryptV2(value: string): Promise<string>;
/**
 * Decrypts an encrypted value using AES-CBC with random IV
 * @param encryptedValue - The encrypted string in iv:ciphertext format
 * @returns The decrypted plaintext
 */
export declare function decryptV2(encryptedValue: string): Promise<string>;
/**
 * Encrypts a value using AES-256-CTR.
 * Note: AES-256 requires a 32-byte key. Ensure that process.env.CREDS_KEY is a 64-character hex string.
 * @param value - The plaintext to encrypt.
 * @returns The encrypted string with a "v3:" prefix.
 */
export declare function encryptV3(value: string): string;
/**
 * Decrypts an encrypted value using AES-256-CTR.
 * @param encryptedValue - The encrypted string with "v3:" prefix.
 * @returns The decrypted plaintext.
 */
export declare function decryptV3(encryptedValue: string): string;
/**
 * Generates random values as a hex string
 * @param length - The number of random bytes to generate
 * @returns The random values as a hex string
 */
export declare function getRandomValues(length: number): Promise<string>;
/**
 * Computes SHA-256 hash for the given input.
 * @param input - The input to hash.
 * @returns The SHA-256 hash of the input.
 */
export declare function hashBackupCode(input: string): Promise<string>;
