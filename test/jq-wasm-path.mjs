import { fileURLToPath } from 'node:url';

// vitest-only shim. At runtime the browser web worker imports `jq-wasm/jq.wasm`
// as a webpack-emitted asset URL; under vitest (Node) there is no webpack asset
// pipeline, so this stands in for that URL with the on-disk path to the wasm.
// loadJq({ wasmURL }) reads it via jq-wasm's Node build, so real jq runs in tests.
export default fileURLToPath(
    new URL('../node_modules/jq-wasm/dist/build/jq.wasm', import.meta.url),
);
