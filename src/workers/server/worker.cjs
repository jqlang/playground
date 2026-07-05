// Per-worker-thread jq instance: load once, then synchronous raw() per task.
// loadJq with an explicit require.resolve puts jq.wasm into the import graph that
// Next's standalone file tracer follows, so no jq-wasm outputFileTracingIncludes
// glob is needed (v2 had to force-include the whole package).
const { loadJq } = require('jq-wasm');
const { readFileSync } = require('node:fs');

let jqPromise;
function getJq() {
    if (!jqPromise) {
        jqPromise = loadJq({ wasmBinary: readFileSync(require.resolve('jq-wasm/jq.wasm')) });
    }
    return jqPromise;
}

module.exports = async function({ json, query, options }) {
    const jq = await getJq();
    const { stdout, stderr } = jq.raw(json, query, options ?? undefined);
    return stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
};
