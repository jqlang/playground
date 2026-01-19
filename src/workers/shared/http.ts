import type { HttpType } from '@/schemas';
import { executeJq } from './jq';

export async function executeHttp(
    http: HttpType,
    query: string,
    options?: string[] | null
): Promise<string> {
    if (!http) {
        throw new Error('HTTP input is undefined');
    }

    const u = new URL(http.url);

    const headers = new Headers();
    if (http.headers) {
        try {
            const parsedHeaders: Record<string, string> = JSON.parse(http.headers);
            for (const [key, value] of Object.entries(parsedHeaders)) {
                headers.set(key, value);
            }
        } catch {
            throw new Error('Failed to parse HTTP headers: Invalid JSON format');
        }
    }

    const resp = await fetch(u, {
        method: http.method,
        headers: headers,
        body: http.body,
    });

    if (!resp.ok) {
        throw new Error(`HTTP request failed with status ${resp.status}`);
    }

    let json;
    try {
        json = await resp.json();
    } catch {
        throw new Error('HTTP response is not valid JSON');
    }

    return executeJq(JSON.stringify(json), query, options);
}
