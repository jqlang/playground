// Per-worker-thread jq instance: load once, then synchronous raw() per task.
// require.resolve finds jq.wasm wherever jq-wasm resolves at runtime; the files
// this worker needs in the standalone build are force-included per-file via
// outputFileTracingIncludes['/api/jq'] in next.config.mjs — Next does not trace
// through files pulled in by those globs, so the closure is listed there.
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
