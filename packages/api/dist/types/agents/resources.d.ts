import type { AgentToolResources, TFile } from '@hanzochat/data-provider';
import type { FilterQuery, QueryOptions, ProjectionType } from 'mongoose';
import type { IMongoFile } from '@hanzochat/data-schemas';
import type { Request as ServerRequest } from 'express';
/**
 * Function type for retrieving files from the database
 * @param filter - MongoDB filter query for files
 * @param _sortOptions - Sorting options (currently unused)
 * @param selectFields - Field selection options
 * @returns Promise resolving to array of files
 */
export type TGetFiles = (filter: FilterQuery<IMongoFile>, _sortOptions: ProjectionType<IMongoFile> | null | undefined, selectFields: QueryOptions<IMongoFile> | null | undefined) => Promise<Array<TFile>>;
/**
 * Primes resources for agent execution by processing attachments and tool resources
 * This function:
 * 1. Fetches OCR files if OCR is enabled
 * 2. Processes attachment files
 * 3. Categorizes files into appropriate tool resources
 * 4. Prevents duplicate files across all sources
 *
 * @param params - Parameters object
 * @param params.req - Express request object containing app configuration
 * @param params.getFiles - Function to retrieve files from database
 * @param params.requestFileSet - Set of file IDs from the current request
 * @param params.attachments - Promise resolving to array of attachment files
 * @param params.tool_resources - Existing tool resources for the agent
 * @returns Promise resolving to processed attachments and updated tool resources
 */
export declare const primeResources: ({ req, getFiles, requestFileSet, attachments: _attachments, tool_resources: _tool_resources, }: {
    req: ServerRequest;
    requestFileSet: Set<string>;
    attachments: Promise<Array<TFile | null>> | undefined;
    tool_resources: AgentToolResources | undefined;
    getFiles: TGetFiles;
}) => Promise<{
    attachments: Array<TFile | undefined> | undefined;
    tool_resources: AgentToolResources | undefined;
}>;
