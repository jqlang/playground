import { z } from 'zod';
import { MAX_JSON_SIZE, MAX_QUERY_SIZE } from '../constants';
import { Options } from '../domain/snippet';

export const JqRequestSchema = z.object({
    json: z.string().max(MAX_JSON_SIZE, `JSON must be at most ${MAX_JSON_SIZE} bytes`).describe('JSON input to process'),
    query: z.string().max(MAX_QUERY_SIZE, `Query must be at most ${MAX_QUERY_SIZE} bytes`).describe('jq query to execute'),
    options: Options.optional().describe('jq command-line options'),
});
