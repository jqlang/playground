// Use the inline entry point so the wasm binary is embedded in the bundle.
// This module runs in a webpack-bundled browser web worker; the default
// `jq-wasm` browser build loads `jq.wasm` via `new URL(..., import.meta.url)`,
// which webpack can't reliably emit from inside a nested worker chunk. The
// server worker (workers/server/worker.cjs) keeps the default require for the
// lighter, file-based wasm load.
import { raw } from 'jq-wasm/inline';

export async function executeJq(
    json: string,
    query: string,
    options?: string[] | null
): Promise<string> {
    const { stdout, stderr } = await raw(json, query, options ?? undefined);
    return stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
}
