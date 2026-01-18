import { NextResponse } from 'next/server';
import { GetSnippet } from '@/lib/prisma';
import { Snippet } from '@/schemas';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * @description Get a snippet by slug
 * @pathParams slug - The unique identifier for the snippet
 * @response 200 - Snippet - Snippet data
 * @response 404 - { error: string } - Snippet not found
 * @response 422 - { errors: ZodError[] } - Validation error
 * @response 500 - { error: string } - Server error
 */
export async function GET(_: Request, { params }: PageProps) {
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
            return NextResponse.json({ errors: error.errors }, { status: 422 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
