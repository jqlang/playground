import { ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { JqRequestSchema } from '@/schemas/api';
import { runJqWithTimeout, TimeoutError } from '@/workers/server';

const TIMEOUT_MS = 5000; // 5 seconds

function handleError(e: unknown): Response {
    if (e instanceof ZodError) {
        return Response.json({ error: e.errors }, { status: 422 });
    }

    if (e instanceof TimeoutError) {
        return Response.json({ error: e.message }, { status: 408 });
    }

    if (e instanceof SyntaxError) {
        return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    Sentry.captureException(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return Response.json({ error: errorMessage }, { status: 500 });
}

/**
 * @description Execute a jq query against JSON input via query parameters
 * @queryParams json - JSON input to process
 * @queryParams query - jq query to execute
 * @queryParams options - Comma-separated jq options (e.g., "-r,-c")
 * @response 200 - { result: string } - Query executed successfully
 * @response 400 - { error: string } - Missing required parameters
 * @response 408 - { error: string } - Query execution timed out
 * @response 422 - { error: ZodError[] } - Validation error
 * @response 500 - { error: string } - Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const json = searchParams.get('json');
        const query = searchParams.get('query');
        const optionsParam = searchParams.get('options');

        if (!json || !query) {
            return Response.json(
                { error: 'Missing required parameters: json and query' },
                { status: 400 }
            );
        }

        // Parse comma-separated options (e.g., "-r,-c" or "-r, -c")
        const options = optionsParam
            ? optionsParam.split(',').map(o => o.trim()).filter(Boolean)
            : undefined;

        const validated = JqRequestSchema.parse({ json, query, options });

        const result = await runJqWithTimeout(
            validated.json,
            validated.query,
            validated.options ?? undefined,
            TIMEOUT_MS
        );

        return Response.json({ result }, { status: 200 });
    } catch (e: unknown) {
        return handleError(e);
    }
}

/**
 * @description Execute a jq query against JSON input
 * @response 200 - { result: string } - Query executed successfully
 * @response 400 - { error: string } - Invalid JSON in request body
 * @response 408 - { error: string } - Query execution timed out
 * @response 422 - { error: ZodError[] } - Validation error
 * @response 500 - { error: string } - Server error
 * @body JqRequestSchema
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { json, query, options } = JqRequestSchema.parse(body);

        const result = await runJqWithTimeout(
            json,
            query,
            options ?? undefined,
            TIMEOUT_MS
        );

        return Response.json({ result }, { status: 200 });
    } catch (e: unknown) {
        return handleError(e);
    }
}
