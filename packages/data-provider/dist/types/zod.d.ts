import { z } from 'zod';
export type JsonSchemaType = {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    enum?: string[];
    items?: JsonSchemaType;
    properties?: Record<string, JsonSchemaType>;
    required?: string[];
    description?: string;
    additionalProperties?: boolean | JsonSchemaType;
};
type ConvertJsonSchemaToZodOptions = {
    allowEmptyObject?: boolean;
    dropFields?: string[];
    transformOneOfAnyOf?: boolean;
};
export declare function convertJsonSchemaToZod(schema: JsonSchemaType & Record<string, unknown>, options?: ConvertJsonSchemaToZodOptions): z.ZodType | undefined;
export {};
