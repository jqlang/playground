import "ts-node-maintained/register/esm";

const { createDatabase } = await import("../src/lib/database.ts");

createDatabase();
