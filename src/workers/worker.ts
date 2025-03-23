import { HttpType } from './model';

export const worker = {
    async jq(json: string, query: string, options?: Array<string> | null): Promise<string> {
        const jqModule = await import("jq-wasm");
        const { stdout, stderr } = await jqModule.raw(json, query, options ?? undefined);
        return stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
    },

    async http(
        http: HttpType,
        query: string,
        options?: Array<string> | null,
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
            } catch (error) {
                throw new Error('Failed to parse HTTP headers: Invalid JSON format');
            }
        }

        const resp = await fetch(u.toString(), {
            method: http.method,
            headers: headers,
            body: http.body,
        });

        if (!resp.ok) {
            throw new Error(`HTTP request failed with status ${resp.status}`);
        }

        const json = await resp.json();
        return this.jq(JSON.stringify(json), query, options);
    }
};
