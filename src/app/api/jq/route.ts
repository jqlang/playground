import { ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { JqRequestSchema, JqError } from '@/schemas/api';
import { runJqWithTimeout, TimeoutError, PoolOverloadError } from '@/workers/server';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

const TIMEOUT_MS = 5000; // 5 seconds

// Per-IP rate limit for the public, unauthenticated jq API. Bounds how fast a
// single client can push work onto the jq worker pool (memory/CPU protection).
// In-memory, so the limit is enforced per server instance.
const jqRateLimiter = new RateLimiterMemory({ points: 60, duration: 60 });

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse<T>(data: T, status: number, headers?: Record<string, string>): Response {
    return Response.json(data, {
        status,
        headers: { ...CORS_HEADERS, ...headers },
    });
}

function textResponse(text: string, status: number, headers?: Record<string, string>): Response {
    return new Response(text, {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...headers },
    });
}

function clientKey(request: Request): string {
    const headers = request.headers;
    // Fly sets fly-client-ip; fall back to the first x-forwarded-for hop.
    return (
        headers.get('fly-client-ip') ||
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        'unknown'
    );
}

// Returns a 429 Response if the caller is over the rate limit, else null.
async function rateLimited(request: Request): Promise<Response | null> {
    try {
        await jqRateLimiter.consume(`jq:${clientKey(request)}`);
        return null;
    } catch (rejection) {
        // rate-limiter-flexible rejects with a RateLimiterRes when over the limit,
        // or with an Error on an internal store failure — fail open on the latter.
        if (rejection instanceof Error) return null;
        const { msBeforeNext } = rejection as RateLimiterRes;
        const retryAfterSec = Math.max(1, Math.ceil(msBeforeNext / 1000));
        const error: JqError = { error: 'Rate limit exceeded. Please retry shortly.' };
        return jsonResponse(error, 429, { 'Retry-After': String(retryAfterSec) });
    }
}

function handleError(e: unknown): Response {
    if (e instanceof ZodError) {
        const error: JqError = { error: e.issues };
        return jsonResponse(error, 422);
    }

    if (e instanceof TimeoutError) {
        const error: JqError = { error: e.message };
        return jsonResponse(error, 408);
    }

    if (e instanceof PoolOverloadError) {
        const error: JqError = { error: 'Server is busy. Please retry shortly.' };
        return jsonResponse(error, 429, { 'Retry-After': '1' });
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
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

/**
 * Execute a jq query via query parameters
 * @description Execute a jq query against JSON input via query parameters. Great for simple queries and quick testing.
 * @params JqQueryParamsSchema
 * @response 200:JqResponseSchema
 * @response 400:JqErrorSchema
 * @response 408:JqErrorSchema
 * @response 422:JqErrorSchema
 * @response 500:JqErrorSchema
 */
export async function GET(request: Request) {
    const limited = await rateLimited(request);
    if (limited) return limited;

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

        const startTime = performance.now();
        const result = await runJqWithTimeout(
            validated.json,
            validated.query,
            validated.options ?? undefined,
            TIMEOUT_MS
        );
        const executionTime = Math.round(performance.now() - startTime);

        return textResponse(result, 200, {
            'X-Execution-Time': `${executionTime}ms`,
        });
    } catch (e: unknown) {
        return handleError(e);
    }
}

/**
 * Execute a jq query
 * @description Execute a jq query against JSON input. Use this for complex queries or large JSON payloads.
 * @body JqRequestSchema
 * @response 200:JqResponseSchema
 * @response 400:JqErrorSchema
 * @response 408:JqErrorSchema
 * @response 422:JqErrorSchema
 * @response 500:JqErrorSchema
 */
export async function POST(request: Request) {
    const limited = await rateLimited(request);
    if (limited) return limited;

    try {
        const body = await request.json();
        const { json, query, options } = JqRequestSchema.parse(body);

        const startTime = performance.now();
        const result = await runJqWithTimeout(
            json,
            query,
            options ?? undefined,
            TIMEOUT_MS
        );
        const executionTime = Math.round(performance.now() - startTime);

        return textResponse(result, 200, {
            'X-Execution-Time': `${executionTime}ms`,
        });
    } catch (e: unknown) {
        return handleError(e);
    }
}
