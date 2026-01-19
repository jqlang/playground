import { z } from 'zod';
import { MAX_JSON_SIZE, MAX_QUERY_SIZE } from '../constants';
import { Options } from '../domain/snippet';

export const JqRequestSchema = z.object({
    json: z.string().max(MAX_JSON_SIZE, `JSON must be at most ${MAX_JSON_SIZE} bytes`).describe('JSON input to process'),
    query: z.string().max(MAX_QUERY_SIZE, `Query must be at most ${MAX_QUERY_SIZE} bytes`).describe('jq query to execute'),
    options: Options.optional().describe('jq command-line options'),
});

export const JqResponseSchema = z.object({
    result: z.string().describe('The jq query result'),
});

export const JqErrorSchema = z.object({
    error: z.union([z.string(), z.array(z.any())]).describe('Error message or validation errors'),
});

export type JqRequest = z.infer<typeof JqRequestSchema>;
export type JqResponse = z.infer<typeof JqResponseSchema>;
export type JqError = z.infer<typeof JqErrorSchema>;
