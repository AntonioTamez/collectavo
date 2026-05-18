// apps/core-api/prisma.config.ts
// Prisma 7 configuration file — replaces package.json "prisma" field (breaking change from v6)
// Location: root of core-api app (alongside package.json), NOT inside prisma/ subdirectory
// Source: https://www.prisma.io/docs/orm/reference/prisma-config-reference
//         https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
