// Lean browser path: load the separate jq.wasm asset (no embedded base64).
// webpack emits jq-wasm/jq.wasm as an asset/resource URL (see next.config.mjs),
// which crosses the nested-worker-chunk boundary that new URL(import.meta.url)
// does not. loadJq fetches that URL once; raw() is then synchronous.
import { loadJq, type Jq } from 'jq-wasm';
import wasmUrl from 'jq-wasm/jq.wasm';

let jqPromise: Promise<Jq> | null = null;
function getJq(): Promise<Jq> {
    if (!jqPromise) jqPromise = loadJq({ wasmURL: wasmUrl });
    return jqPromise;
}

export async function executeJq(
    json: string,
    query: string,
    options?: string[] | null
): Promise<string> {
    const jq = await getJq();
    const { stdout, stderr } = jq.raw(json, query, options ?? undefined);
    return stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
}
