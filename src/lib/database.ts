import crypto from "crypto";
import { SnippetType } from "@/workers/model";
import { DatabaseSync } from "node:sqlite";

const database = new DatabaseSync("db.sqlite3");

export function createDatabase() {
  const { user_version } = database
    .prepare(`PRAGMA user_version;`)
    .get() as Record<string, number>;

  if (user_version == 0) {
    database.exec(`
    CREATE TABLE snippets (
        slug TEXT NOT NULL PRIMARY KEY,
        json TEXT,
        http TEXT,
        query TEXT NOT NULL,
        options TEXT,
        created_at TEXT NOT NULL DEFAULT current_timestamp
    );

    PRAGMA user_version = 1;
`);
  }
}

createDatabase();

const getBySlug = database.prepare(`SELECT * FROM snippets WHERE slug = ?;`);

const upsert = database.prepare(`
  INSERT INTO snippets(slug,json,http,query,options)
  VALUES(?,?,?,?,?)
  ON CONFLICT(slug) 
  DO UPDATE SET json=excluded.json, http=excluded.http, query=excluded.query, options=excluded.options;
`);

export const validSlug = /^([a-zA-Z0-9_-]+)$/;

function SnippetFromDb(
  row: unknown
): (SnippetType & { slug: string }) | undefined {
  if (typeof row !== "object") {
    return undefined;
  }

  const result = row as SnippetType & {
    http: string;
    options: string;
    slug: string;
  };

  return {
    slug: result.slug,
    json: result.json,
    http: result.http == "" ? null : safeParse(result.http, {}),
    query: result.query,
    options: safeParse(result.options, []),
  };
}

function safeParse(str: string, defaultValue: any) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

export async function GetSnippet(
  slug: string
): Promise<SnippetType | undefined> {
  if (validSlug.test(slug)) {
    return SnippetFromDb(getBySlug.get(slug));
  } else {
    console.error(`Unknown Snippet: ${slug}`);
    return undefined;
  }
}

// The way this is used never actually results in an update, always a new snippet
export async function UpsertSnippet(
  snippet: SnippetType
): Promise<{ slug: string }> {
  const slug = generateSlug(snippet);

  upsert.run(
    slug,
    snippet.json ?? "",
    JSON.stringify(snippet.http) ?? "",
    snippet.query,
    JSON.stringify(snippet.options ?? {})
  );

  return { slug };
}

function generateSlug(snippet: SnippetType, hashLen: number = 15): string {
  const hash = crypto.createHash("sha256");

  // Hash the provided fields in the snippet
  if (snippet.json) {
    hash.update(snippet.json);
  }
  if (snippet.http) {
    hash.update(JSON.stringify(snippet.http));
  }
  hash.update(snippet.query);
  if (snippet.options) {
    hash.update(snippet.options.sort().join(""));
  }

  // Convert the hash to a base64 URL-safe string
  const sum = hash.digest();
  let base64Encoded = sum.toString("base64url");

  // Ensure the slug does not end with an underscore by adjusting the length
  while (
    hashLen <= base64Encoded.length &&
    base64Encoded[hashLen - 1] === "_"
  ) {
    hashLen++;
  }

  return base64Encoded.substring(0, hashLen);
}
