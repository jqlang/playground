import { z } from 'zod';
import { MAX_JSON_SIZE, MAX_QUERY_SIZE } from '../constants';
import { Options } from '../domain/snippet';

// Query parameters for GET /api/jq
export const JqQueryParamsSchema = z.object({
    json: z.string().describe('JSON input to process (URL-encoded)'),
    query: z.string().describe('jq query to execute (URL-encoded if it contains special characters like |, +, &)'),
    options: z.string().optional().describe('Comma-separated jq options: -c (compact), -n (null input), -R (raw input), -r (raw output), -s (slurp), -S (sort keys)'),
});

// Request body for POST /api/jq
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
