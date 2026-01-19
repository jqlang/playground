import { z } from 'zod';
import { MAX_JSON_SIZE } from '../constants';

// Schema for HTTP methods
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']).describe('HTTP method');

// Schema for HTTP headers as a JSON string
export const HttpHeadersSchema = z
    .string()
    .describe('HTTP headers as JSON object string (e.g., {"Authorization": "Bearer token"})')
    .refine((value) => {
        // Allow empty or undefined strings, else validate as JSON
        if (!value) return true;
        try {
            const parsed = JSON.parse(value);
            // Ensure the parsed object is a plain object with string keys and string values
            return typeof parsed === 'object' && !Array.isArray(parsed) && Object.entries(parsed).every(
                ([key, val]) => typeof key === 'string' && typeof val === 'string'
            );
        } catch {
            return false; // Return false if JSON parsing fails
        }
    }, {
        message: "HTTP headers must be a valid JSON string representing key-value pairs.",
        path: ['http', 'headers'], // Specific path for error reporting
    });

// Schema for HTTP URL
export const HttpUrlSchema = z.string().url().describe('URL to fetch JSON from');

// Full HTTP request schema
export const HttpRequestSchema = z.object({
    method: HttpMethodSchema,
    url: HttpUrlSchema,
    headers: HttpHeadersSchema.optional(),
    body: z.string().max(MAX_JSON_SIZE, `HTTP body must be at most ${MAX_JSON_SIZE} bytes`).optional().describe('HTTP request body'),
});

// TypeScript types
export type HttpMethodType = z.infer<typeof HttpMethodSchema>;
export type HttpType = z.infer<typeof HttpRequestSchema>;
