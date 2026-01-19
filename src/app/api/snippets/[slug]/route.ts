import { NextResponse } from 'next/server';
import { GetSnippet } from '@/lib/prisma';
import { Snippet, SnippetType } from '@/schemas';
import { SnippetError } from '@/schemas/api';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Get a snippet by slug
 * @description Get a snippet by slug
 * @pathParams SnippetPathParamsSchema
 * @response 200:Snippet
 * @response 404:SnippetErrorSchema
 * @response 422:SnippetErrorSchema
 * @response 500:SnippetErrorSchema
 */
export async function GET(_: Request, { params }: PageProps): Promise<NextResponse<SnippetType | SnippetError>> {
    const slug = (await params).slug;
    if (!slug) {
        return NextResponse.json({ error: 'No slug provided' }, { status: 404 });
    }

    try {
        const snippet = await GetSnippet(slug);
        if (!snippet) {
            return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
        }

        const resp = Snippet.parse(snippet);
        return NextResponse.json(resp);
    } catch (error: any) {
        console.error(`Failed to load snippet: ${error.message}`);
        Sentry.captureException(error, { extra: { slug } });

        if (error instanceof ZodError) {
            const errorMessages = error.errors.map(e => e.message);
            return NextResponse.json({ errors: errorMessages }, { status: 422 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
