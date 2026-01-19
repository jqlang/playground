import { raw } from 'jq-wasm';

export async function executeJq(
    json: string,
    query: string,
    options?: string[] | null
): Promise<string> {
    const { stdout, stderr } = await raw(json, query, options ?? undefined);
    return stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
}
