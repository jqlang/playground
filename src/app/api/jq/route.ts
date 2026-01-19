import { ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { JqRequestSchema, JqResponse, JqError } from '@/schemas/api';
import { runJqWithTimeout, TimeoutError } from '@/workers/server';

const TIMEOUT_MS = 5000; // 5 seconds

function jsonResponse<T>(data: T, status: number): Response {
    return Response.json(data, { status });
}

function handleError(e: unknown): Response {
    if (e instanceof ZodError) {
        const error: JqError = { error: e.errors };
        return jsonResponse(error, 422);
    }

    if (e instanceof TimeoutError) {
        const error: JqError = { error: e.message };
        return jsonResponse(error, 408);
    }

    if (e instanceof SyntaxError) {
        const error: JqError = { error: 'Invalid JSON in request body' };
        return jsonResponse(error, 400);
    }

    Sentry.captureException(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    const error: JqError = { error: errorMessage };
    return jsonResponse(error, 500);
}

/**
 * Execute a jq query via query parameters
 * @description Execute a jq query against JSON input via query parameters
 * @response 200:JqResponseSchema
 * @response 400:JqErrorSchema
 * @response 408:JqErrorSchema
 * @response 422:JqErrorSchema
 * @response 500:JqErrorSchema
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const json = searchParams.get('json');
        const query = searchParams.get('query');
        const optionsParam = searchParams.get('options');

        if (!json || !query) {
            const error: JqError = { error: 'Missing required parameters: json and query' };
            return jsonResponse(error, 400);
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

        const response: JqResponse = { result };
        return jsonResponse(response, 200);
    } catch (e: unknown) {
        return handleError(e);
    }
}

/**
 * Execute a jq query
 * @description Execute a jq query against JSON input
 * @body JqRequestSchema
 * @response 200:JqResponseSchema
 * @response 400:JqErrorSchema
 * @response 408:JqErrorSchema
 * @response 422:JqErrorSchema
 * @response 500:JqErrorSchema
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

        const response: JqResponse = { result };
        return jsonResponse(response, 200);
    } catch (e: unknown) {
        return handleError(e);
    }
}
