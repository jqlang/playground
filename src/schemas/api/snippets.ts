import { z } from 'zod';

export const SnippetPathParamsSchema = z.object({
    slug: z.string().describe('Unique snippet identifier'),
});

export const SnippetCreateResponseSchema = z.object({
    slug: z.string().describe('Unique snippet identifier'),
});

export const SnippetErrorSchema = z.object({
    error: z.string().optional().describe('Error message'),
    errors: z.array(z.string()).optional().describe('Validation errors'),
});

export type SnippetCreateResponse = z.infer<typeof SnippetCreateResponseSchema>;
export type SnippetError = z.infer<typeof SnippetErrorSchema>;
