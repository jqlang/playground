import * as jq from 'jq-wasm';

export async function GET(req: Request) {
    try {
        const { stdout, stderr } = await jq.raw('{"foo":"bar"}', ".");
        const result = stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
        return new Response(result, { status: 200 });
    } catch (e: any) {
        const errorMessage = e?.message || 'An unknown error occurred';
        return new Response(errorMessage, { status: 200 });
    }
}
