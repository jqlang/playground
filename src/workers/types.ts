import type { HttpType } from '@/schemas';

export interface JqResult {
    stdout: string;
    stderr: string;
}

export interface JqWorkerApi {
    jq(json: string, query: string, options?: string[] | null): Promise<string>;
}

export interface HttpWorkerApi extends JqWorkerApi {
    http(http: HttpType, query: string, options?: string[] | null): Promise<string>;
}
