import { PrismaClient } from '@prisma/client';
import { version as uuidVersion, validate as uuidValidate } from 'uuid';
import crypto from 'crypto';
import { SnippetType } from '@/schemas';

declare global {
    var prisma: PrismaClient | undefined;
}

// Use a single PrismaClient instance in development and production environments.
const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;

export async function GetSnippet(slug: string) {
    const whereClause = uuidValidateV4(slug)
        ? { id: slug } // If valid UUID v4, search by ID
        : { slug: slug }; // Otherwise, search by slug

    return prisma.snippets.findFirst({
        where: whereClause,
    });
}

export async function UpsertSnippet(snippet: SnippetType) {
    const slug = generateSlug(snippet);
    return prisma.snippets.upsert({
        where: { slug },
        update: {
            json: snippet.json ?? undefined,
            http: snippet.http ?? undefined,
            query: snippet.query,
            options: snippet.options ?? undefined,
        },
        create: {
            json: snippet.json ?? undefined,
            http: snippet.http ?? undefined,
            query: snippet.query,
            options: snippet.options ?? undefined,
            slug,
        },
    });
}

function generateSlug(snippet: SnippetType, hashLen: number = 15): string {
    const hash = crypto.createHash('sha256');

    // Hash the provided fields in the snippet
    if (snippet.json) {
        hash.update(snippet.json);
    }
    if (snippet.http) {
        hash.update(JSON.stringify(snippet.http));
    }
    hash.update(snippet.query);
    if (snippet.options) {
        hash.update(snippet.options.sort().join(''));
    }

    // Convert the hash to a base64 URL-safe string
    const sum = hash.digest();
    let base64Encoded = sum.toString('base64url');

    // Ensure the slug does not end with an underscore by adjusting the length
    while (hashLen <= base64Encoded.length && base64Encoded[hashLen - 1] === '_') {
        hashLen++;
    }

    return base64Encoded.substring(0, hashLen);
}

function uuidValidateV4(uuid: string) {
    return uuidValidate(uuid) && uuidVersion(uuid) === 4;
}
