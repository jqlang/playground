import path from 'path';
import Piscina from 'piscina';

export class TimeoutError extends Error {
    constructor(message: string = 'Query execution timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}

// Lazy-initialize pool to avoid webpack bundling issues
let pool: Piscina | null = null;

// Build path in a way webpack can't statically analyze
const workerFile = ['src', 'workers', 'server', 'worker.cjs'].join(path.sep);

function getPool(): Piscina {
    if (!pool) {
        pool = new Piscina({
            filename: path.join(process.cwd(), workerFile),
            minThreads: 2,
            maxThreads: 4,
            idleTimeout: 30000,
        });
    }
    return pool;
}

export async function runJqWithTimeout(
    json: string,
    query: string,
    options: string[] | undefined,
    timeoutMs: number
): Promise<string> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
        const result = await getPool().run(
            { json, query, options },
            { signal: abortController.signal }
        );
        return result;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new TimeoutError();
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
