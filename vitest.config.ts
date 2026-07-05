import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: [
            // The browser web worker (src/workers/shared/jq.ts) imports `jq-wasm/jq.wasm`
            // as a webpack-emitted asset URL at runtime. Under vitest (Node) there is no
            // webpack asset pipeline and Node's ESM loader chokes trying to import the
            // binary as a module, so redirect that exact import to a shim exporting the
            // on-disk path. loadJq({ wasmURL }) then reads it via jq-wasm's Node build —
            // real jq still runs. Only the bare `jq-wasm/jq.wasm` asset import is affected.
            {
                find: /^jq-wasm\/jq\.wasm$/,
                replacement: fileURLToPath(new URL('./test/jq-wasm-path.mjs', import.meta.url)),
            },
        ],
    },
    test: {
        include: ['src/**/*.test.ts'],
        testTimeout: 10000,
    },
});
