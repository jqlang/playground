import { z } from 'zod';
import { MAX_JSON_SIZE, MAX_QUERY_SIZE } from '../constants';
import { HttpRequestSchema } from './http';

export const Option = z.enum(['-c', '-n', '-R', '-r', '-s', '-S']).describe(
    'jq command-line flags:\n\n' +
    '| Flag | Description |\n' +
    '|------|-------------|\n' +
    '| `-c` | Compact output |\n' +
    '| `-n` | Null input (don\'t read any input) |\n' +
    '| `-R` | Raw input (read as strings, not JSON) |\n' +
    '| `-r` | Raw output (strings without quotes) |\n' +
    '| `-s` | Slurp (read entire input into array) |\n' +
    '| `-S` | Sort object keys |'
);
export const Options = z.array(Option);

// Field-level shape, shared by the strict write schema and the permissive
// read schema below.
const SnippetShape = z.object({
    json: z.string().max(MAX_JSON_SIZE, `JSON must be at most ${MAX_JSON_SIZE} bytes`).optional().nullable().describe('JSON input to process'),
    http: HttpRequestSchema.optional().nullable().describe('HTTP request to fetch JSON from'),
    query: z.string().min(1).max(MAX_QUERY_SIZE, `Query must be at most ${MAX_QUERY_SIZE} bytes`).describe('jq query to execute'),
    options: Options.optional().nullable().describe('jq command-line options'),
});

// Write-time input schema: at most one of json/http, and exactly one unless the
// snippet uses -n (null input), where jq ignores input so no source is required.
export const Snippet = SnippetShape.refine(data => {
    // Never both — the client would fetch the HTTP source even for a -n snippet.
    if (data.json && data.http) return false;
    // -n waives the "need a source" requirement.
    if (data.options?.includes('-n')) return true;
    // Otherwise exactly one (the both-case is already rejected above).
    return !!data.json || !!data.http;
}, {
    message: 'Either JSON or HTTP must be provided.',
    path: ['json', 'http'],
});

// Read-time schema: validates field types/sizes but NOT the json/http source
// invariant. Stored snippets are trusted and may predate the current write
// rules, so they must load on read instead of 422-ing.
export const SnippetRead = SnippetShape;

// TypeScript types
export type SnippetType = z.infer<typeof Snippet>;
export type OptionsType = z.infer<typeof Options>;
