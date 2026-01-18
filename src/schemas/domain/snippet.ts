import { z } from 'zod';
import { MAX_JSON_SIZE, MAX_QUERY_SIZE } from '../constants';
import { HttpRequestSchema } from './http';

export const Option = z.enum(['-c', '-n', '-R', '-r', '-s', '-S']);
export const Options = z.array(Option);

// Main input schema
export const Snippet = z.object({
    json: z.string().max(MAX_JSON_SIZE, `JSON must be at most ${MAX_JSON_SIZE} bytes`).optional().nullable(),
    http: HttpRequestSchema.optional().nullable(),
    query: z.string().min(1).max(MAX_QUERY_SIZE, `Query must be at most ${MAX_QUERY_SIZE} bytes`),
    options: Options.optional().nullable(),
}).refine(data => (data.json ? !data.http : !!data.http), {
    message: 'Either JSON or HTTP must be provided.',
    path: ['json', 'http'],
});

// TypeScript types
export type SnippetType = z.infer<typeof Snippet>;
export type OptionsType = z.infer<typeof Options>;
