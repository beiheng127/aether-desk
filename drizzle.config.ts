import { defineConfig } from "drizzle-kit";

/** 可选：npx drizzle-kit generate 产出 SQL 草案。运行时仍以 src/lib/db/index.ts 为准。 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/aether.db",
  },
});
