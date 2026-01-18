declare module 'comlink/dist/esm/node-adapter.mjs' {
    import type { Endpoint } from 'comlink';
    import type { Worker } from 'worker_threads';
    function nodeEndpoint(worker: Worker): Endpoint;
    export default nodeEndpoint;
}

declare module 'next-openapi-gen' {
    export interface Config {
        schemaType: 'zod' | 'json-schema';
        generateSchemas?: boolean;
        outputFile?: string;
        apiDir?: string;
        [key: string]: unknown;
    }
}
