import { NextResponse } from 'next/server';
import { UpsertSnippet } from '@/lib/prisma';
import { ZodError } from 'zod';
import { Snippet } from '@/workers/model';
import * as Sentry from '@sentry/node';

export interface CreateSnippetResponse {
    slug?: string;
    errors?: string[];
}

export async function POST(req: Request): Promise<NextResponse<CreateSnippetResponse>> {
    try {
        // Parse the request body
        const json = await req.json();
        const snippet = Snippet.parse(json);

        // Upsert the snippet and return the slug
        const newSnippet = await UpsertSnippet(snippet);
        return NextResponse.json({ slug: newSnippet.slug }, { status: 200 });
    } catch (error: unknown) {
        // Log the error and capture it in Sentry
        console.error(`Failed to save snippet: ${error instanceof Error ? error.message : String(error)}`);
        Sentry.captureException(error, { extra: { body: req.body } });

        // Handle Zod validation errors
        if (error instanceof ZodError) {
            const errorMessages = error.errors.map(e => e.message);
            return NextResponse.json({ errors: errorMessages }, { status: 422 });
        }

        // Handle unexpected errors
        return NextResponse.json({ errors: ['An unexpected error occurred while saving the snippet.'] }, { status: 500 });
    }
}
