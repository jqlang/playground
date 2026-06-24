import { ZodError } from "zod";
import type { HttpType } from "@/schemas";

export const currentUnixTimestamp = () => Math.floor(new Date().getTime() / 1000);

// A snippet can run if it has the -n (null input) flag — where jq generates its
// own data and needs no input — or an actual JSON/HTTP input source.
export function hasInputSource(
    json: string | undefined | null,
    http: HttpType | undefined | null,
    options: string[],
): boolean {
    if (options.includes('-n')) return true;
    return !!json || !!http;
}

export const generateMessageId = () => Math.random().toString(36).substring(2, 9);

export function normalizeLineBreaks(text: string | undefined | null) {
    if (!text) {
        return '';
    }

    return text.replace(/\r\n|\r/g, '\n');
}

export function prettifyZodError(error: ZodError) {
    return error.issues.map(e => `${e.path.join(', ')} ${e.message}`.toLowerCase()).join(', ');
}
