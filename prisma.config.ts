import { defineConfig } from 'prisma/config';

// Prisma 7 moves the connection URL out of schema.prisma. The CLI (migrate,
// db) reads it from here; the runtime client connects via a driver adapter
// (see src/lib/prisma.ts). This project has no .env file (DATABASE_URL is
// provided by the environment), so read it directly and tolerate an unset
// value — that lets `prisma generate` run at build time without a database.
export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL ?? '',
    },
});
