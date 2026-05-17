# Phase 1: Infrastructure Foundation - Research

**Researched:** 2026-05-17
**Domain:** Docker Compose multi-service setup, Prisma 7 schema + migrations, NestJS infrastructure, PostgreSQL full-text search indexes, seed data patterns
**Confidence:** HIGH (core stack verified via npm registry and official docs; Prisma 7 breaking changes verified via official upgrade guide and multiple corroborating sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Directory Layout**
- D-01: `apps/` subdirectory structure — `apps/frontend`, `apps/bff`, `apps/core-api`
- D-02: Each app fully independent — own `package.json`, `node_modules`, install lifecycle. No npm workspaces at root.
- D-03: Root contains only: `docker-compose.yml`, `.env`, `.env.example`, `.gitignore`, `README.md`. No Makefile.
- D-04: Prisma schema at `apps/core-api/prisma/schema.prisma`. Only Core API touches the database.

**Seed Data**
- D-05: 3–5 sample listings per category (18–30 total across 6 categories)
- D-06: Realistic collectibles data — actual product names and plausible prices
- D-07: Each seeded listing includes `ProductImage` records using `https://picsum.photos/seed/{slug}/800/800`
- D-08: Seeds create one Buyer account and one Seller account with known credentials

**Docker Compose**
- D-09: All 4 services inside Docker Compose. Frontend uses `ng serve` with `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true`
- D-10: Single `docker-compose.yml` at repo root. No base + override split for v1.
- D-11: One `Dockerfile.dev` per app directory
- D-12: `prisma migrate dev` is a **manual step** after `docker compose up`. Developer runs: `docker compose exec core-api npx prisma migrate dev`

**Prisma Schema Enums**
- D-13: `Condition` enum: `MINT`, `NEAR_MINT`, `EXCELLENT`, `GOOD`, `FAIR`, `POOR`
- D-14: `ListingType` enum: `DIRECT_SALE` only in v1
- D-15: `ProductStatus` enum: `ACTIVE`, `INACTIVE`, `DRAFT`
- D-16: Soft delete on `Product` via `deletedAt DateTime?`

**Carried Forward**
- D-17: `Category` as DB table (not enum)
- D-18: Per-category metadata as `metadata Json` (JSONB) on `Product`
- D-19: `RefreshToken` as separate table
- D-20: BFF: 3000, Core API: 3001, Frontend: 4200, PostgreSQL: 5432

### Claude's Discretion

None specified for this phase.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | All services run via Docker Compose for local development (Angular frontend + NestJS BFF + NestJS Core API + PostgreSQL) | Docker Compose multi-service patterns with healthchecks, anonymous volumes, Windows polling — fully covered in Architecture Patterns section |
| INFRA-04 | Database seeds for all 6 product categories and representative sample listings | Prisma 7 seed via `prisma.config.ts` + `tsx`, idempotent upsert pattern, realistic data examples — covered in Seed Patterns section |
</phase_requirements>

---

## Summary

Phase 1 establishes everything downstream phases depend on: four services running together, the complete Prisma schema with all models and indexes, and seed data that makes the platform immediately demable. This is a greenfield setup phase — no existing code to adapt.

The most significant discovery during research is that **Prisma 7.8.0 has breaking changes compared to Prisma 6** that the existing project STACK.md does not reflect. Specifically: (1) `PrismaClient` now requires a driver adapter (`@prisma/adapter-pg` + `pg`) — direct instantiation without an adapter no longer works; (2) the generator provider changes from `"prisma-client-js"` to `"prisma-client"` and `output` is now mandatory; (3) seed configuration moves from `package.json` to a `prisma.config.ts` file at the project root; (4) automatic seeding on `prisma migrate dev` is removed — seeds must now be run explicitly with `npx prisma db seed`.

The Docker Compose setup is well-established for this stack. Windows-specific polling (`CHOKIDAR_USEPOLLING`, `WATCHPACK_POLLING`) and anonymous `node_modules` volumes are mandatory for hot reload. The PostgreSQL GIN index for full-text search cannot be expressed natively in Prisma schema — it requires a raw SQL migration file and the `Unsupported("tsvector")` type workaround.

**Primary recommendation:** Build the Prisma 7 infrastructure layer first (schema + prisma.config.ts + PrismaService with adapter-pg), then layer Docker Compose on top, then wire seed data. The generator and adapter setup must be correct before any migration can run.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Database schema definition | Core API (Prisma schema) | — | D-04: only Core API touches the database |
| Database migrations | Core API (prisma migrate dev) | — | Manual step in container, developer-controlled |
| Seed data execution | Core API (prisma db seed) | — | Seed script lives with schema at `apps/core-api/prisma/` |
| Service orchestration | Docker Compose (host-level) | — | Single `docker-compose.yml` at repo root |
| Frontend hot reload | Docker (Angular ng serve) | Host filesystem | CHOKIDAR/WATCHPACK polling bridging Windows FS events |
| NestJS hot reload | Docker (nest start --watch) | Host filesystem | Polling env vars for file change detection |
| PostgreSQL persistence | Docker volume (postgres_data) | — | Named volume survives `docker compose down` |
| Internal network routing | Docker (collectavo_net bridge) | — | Services communicate by container name, not localhost |
| Full-text search index | PostgreSQL (GIN on tsvector) | Prisma raw SQL migration | Prisma schema cannot express function-based indexes natively |

---

## Standard Stack

### Core (Phase 1 — Infrastructure Only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `prisma` | 7.8.0 | CLI, schema management, migration runner | Project-locked; TypeScript engine eliminates Rust binary issues in Docker |
| `@prisma/client` | 7.8.0 | Generated typed database client | Required with `prisma` |
| `@prisma/adapter-pg` | 7.8.0 | PostgreSQL driver adapter (NEW in Prisma 7) | **Required** — Prisma 7 will not connect without a driver adapter |
| `pg` | 8.20.0 | Node.js PostgreSQL driver | Peer dependency of `@prisma/adapter-pg` |
| `@types/pg` | 8.20.0 | TypeScript types for `pg` | Dev dependency for type safety |
| `tsx` | 4.22.1 | TypeScript runner for seed scripts | Recommended by Prisma docs for running `.ts` seeds; esbuild-based, no config |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | (bundled via `@nestjs/config`) | Load `.env` in seed script | Seed script runs outside NestJS DI — needs explicit dotenv import |
| `postgres:17-alpine` | Docker image | PostgreSQL database | Alpine reduces image size; v17 is current stable |
| `node:22-alpine` | Docker image | NestJS runtime | Node 22 LTS; Alpine keeps image small |
| `node:22-alpine` | Docker image | Angular dev server | Matches NestJS base for consistency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@prisma/adapter-pg` + `pg` | `@prisma/adapter-pg-worker` | pg-worker targets edge/workers; pg is standard Node.js — use pg |
| `tsx` for seed | `ts-node` | ts-node requires more ESM config and is slower; tsx uses esbuild and just works |
| `postgres:17-alpine` | `postgres:17` (Debian) | Alpine is smaller; Debian has broader tooling if debugging needed — Alpine preferred |

### Installation (Core API)

```bash
# Runtime deps
npm install @prisma/client@7.8.0 @prisma/adapter-pg@7.8.0 pg@8.20.0

# Dev deps
npm install -D prisma@7.8.0 @types/pg@8.20.0 tsx@4.22.1
```

---

## Package Legitimacy Audit

> Note: slopcheck runs against PyPI (Python). This is a Node.js project. Scoped npm packages (`@prisma/adapter-pg`, `@prisma/client`, `@types/pg`) are correctly absent from PyPI and were flagged as [SLOP] by the tool — this is a false positive. All packages have been independently verified on npm with `npm view` and confirmed via official source repositories.

| Package | Registry | Age | Source Repo | npm verify | Disposition |
|---------|----------|-----|-------------|------------|-------------|
| `prisma` | npm | 2019 (5+ yrs) | github.com/prisma/prisma | `npm view prisma version` → 7.8.0 | Approved |
| `@prisma/client` | npm | 2019 (5+ yrs) | github.com/prisma/prisma | `npm view @prisma/client version` → 7.8.0 | Approved |
| `@prisma/adapter-pg` | npm | 2023 (2+ yrs) | github.com/prisma/prisma | `npm view @prisma/adapter-pg version` → 7.8.0 | Approved |
| `pg` | npm | 2010 (14+ yrs) | github.com/brianc/node-postgres | `npm view pg version` → 8.20.0 | Approved |
| `@types/pg` | npm | 2016 (8+ yrs) | github.com/DefinitelyTyped/DefinitelyTyped | `npm view @types/pg version` → 8.20.0 | Approved |
| `tsx` | npm | 2015 (9+ yrs) | github.com/privatenumber/tsx | `npm view tsx version` → 4.22.1 | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck false positives for Node.js packages on PyPI registry — independently verified on npm)
**Packages flagged as suspicious [SUS]:** none

*slopcheck was available but checked PyPI, not npm. All packages verified independently on npm registry with `npm view`. No postinstall scripts detected on any package.*

---

## Architecture Patterns

### System Architecture Diagram

```
Host machine (Windows)
│
├── docker compose up
│   │
│   ├── frontend (port 4200) ──────────────── Angular ng serve
│   │   └── volumes: ./apps/frontend → /app, /app/node_modules (anon)
│   │   └── env: CHOKIDAR_USEPOLLING=true, WATCHPACK_POLLING=true
│   │
│   ├── bff (port 3000) ────────────────────── NestJS nest start --watch
│   │   └── volumes: ./apps/bff → /app, /app/node_modules (anon)
│   │   └── env: CORE_API_URL=http://core-api:3001
│   │   └── depends_on: core-api (no health condition required)
│   │
│   ├── core-api (port 3001) ───────────────── NestJS nest start --watch
│   │   └── volumes: ./apps/core-api → /app, /app/node_modules (anon)
│   │   └── env: DATABASE_URL=postgresql://...@postgres:5432/...
│   │   └── depends_on: postgres (condition: service_healthy)
│   │   └── MANUAL: docker compose exec core-api npx prisma migrate dev
│   │   └── MANUAL: docker compose exec core-api npx prisma db seed
│   │
│   └── postgres (port 5432) ───────────────── postgres:17-alpine
│       └── volumes: postgres_data → /var/lib/postgresql/data (named)
│       └── healthcheck: pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}
│
└── Internal network: collectavo_net (bridge)
    Services communicate by container name (core-api, postgres, bff)
```

### Recommended Project Structure

```
collectavo/                          # repo root
├── docker-compose.yml               # all 4 services
├── .env                             # gitignored — real credentials
├── .env.example                     # committed — placeholder values
├── .gitignore
├── README.md
│
└── apps/
    ├── frontend/                    # Angular 20
    │   ├── Dockerfile.dev
    │   ├── package.json
    │   ├── angular.json
    │   └── src/
    │
    ├── bff/                         # NestJS BFF
    │   ├── Dockerfile.dev
    │   ├── package.json
    │   └── src/
    │
    └── core-api/                    # NestJS Core API
        ├── Dockerfile.dev
        ├── package.json
        ├── prisma.config.ts         # Prisma 7 config (root of core-api app)
        ├── prisma/
        │   ├── schema.prisma
        │   ├── seed.ts
        │   └── migrations/
        └── src/
            ├── generated/
            │   └── prisma/          # generated client output (gitignored)
            └── infrastructure/
                └── database/
                    ├── prisma.service.ts
                    └── database.module.ts
```

### Pattern 1: Prisma 7 Generator Block (BREAKING CHANGE from v6)

**What:** Prisma 7 requires `provider = "prisma-client"` (not `prisma-client-js`), mandatory `output`, and `moduleFormat = "cjs"` for NestJS CommonJS compatibility. The `datasource.url` moves from `schema.prisma` to `prisma.config.ts`.

**When to use:** This is the only valid generator configuration for Prisma 7 + NestJS 11.

```prisma
// apps/core-api/prisma/schema.prisma
// Source: https://www.prisma.io/docs/guides/frameworks/nestjs
//         https://mgregersen.dk/upgrading-prisma-to-rust-free-client-in-nestjs/

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
  // URL now lives in prisma.config.ts — NOT here
}
```

### Pattern 2: prisma.config.ts (NEW in Prisma 7)

**What:** Replaces `package.json` `prisma.seed` configuration. Lives at the root of the `core-api` app directory (alongside `package.json`). Centralizes schema path, DATABASE_URL, migrations path, and seed command.

**When to use:** Required for all Prisma 7 projects.

```typescript
// apps/core-api/prisma.config.ts
// Source: https://www.prisma.io/docs/orm/reference/prisma-config-reference
//         https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",        // explicit seed command
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

### Pattern 3: PrismaService with Driver Adapter (BREAKING CHANGE from v6)

**What:** Prisma 7 requires a driver adapter. `PrismaClient` without adapter will throw at startup. The generated client is imported from `src/generated/prisma` not from `@prisma/client`. The `@Global()` decorator makes PrismaService available everywhere without re-importing DatabaseModule.

**When to use:** Core API infrastructure module. `onModuleDestroy` is optional given the TypeScript engine handles cleanup, but included for explicitness.

```typescript
// apps/core-api/src/infrastructure/database/prisma.service.ts
// Source: https://www.prisma.io/docs/guides/frameworks/nestjs
//         https://dev.to/robson_idongesitsamuel_b/a-complete-guide-to-using-prisma-7-with-docker-and-docker-compose-in-nestjs-80i

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';  // NOT @prisma/client

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// apps/core-api/src/infrastructure/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()   // <-- makes PrismaService available everywhere without importing DatabaseModule
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

### Pattern 4: Complete Prisma Schema for Collectavo

**What:** Full marketplace schema with all models from CONTEXT.md decisions. Key differences from the research STACK.md template: Category is a table (not enum), RefreshToken is a separate table, Product has `deletedAt` for soft delete, tsvector uses `Unsupported` type for GIN index.

```prisma
// apps/core-api/prisma/schema.prisma
// Source: Decisions D-13 through D-20 from CONTEXT.md
//         https://www.prisma.io/docs/orm/prisma-schema/data-model/models

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
  // url configured via prisma.config.ts
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  BUYER
  SELLER
}

enum Condition {
  MINT
  NEAR_MINT
  EXCELLENT
  GOOD
  FAIR
  POOR
}

enum ListingType {
  DIRECT_SALE
  // AUCTION added in Milestone 2 via migration
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  DRAFT
}

// ─── Models ───────────────────────────────────────────────────────────────────

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(BUYER)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  refreshTokens RefreshToken[]
  sellerProfile SellerProfile?
  products      Product[]

  @@index([email])
  @@map("users")
}

model RefreshToken {
  id          String   @id @default(uuid())
  userId      String
  hashedToken String
  tokenFamily String   // for token family reuse detection
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([hashedToken])
  @@map("refresh_tokens")
}

model SellerProfile {
  id          String  @id @default(uuid())
  userId      String  @unique
  displayName String
  bio         String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("seller_profiles")
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  slug      String    @unique
  createdAt DateTime  @default(now())

  products  Product[]

  @@map("categories")
}

model Product {
  id          String        @id @default(uuid())
  sellerId    String
  categoryId  String
  title       String
  description String
  price       Decimal       @db.Decimal(10, 2)
  condition   Condition
  listingType ListingType   @default(DIRECT_SALE)
  status      ProductStatus @default(DRAFT)
  metadata    Json          @default("{}")  // per-category flexible fields
  deletedAt   DateTime?                     // soft delete (D-16)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // tsvector column for full-text search — managed via raw SQL migration
  // Prisma cannot natively express generated tsvector columns or function-based GIN indexes
  searchVector Unsupported("tsvector")?

  seller      User          @relation(fields: [sellerId], references: [id])
  category    Category      @relation(fields: [categoryId], references: [id])
  images      ProductImage[]

  @@index([categoryId])
  @@index([sellerId])
  @@index([status])
  @@index([listingType])
  @@index([deletedAt])
  @@index([createdAt])
  @@index([status, categoryId])    // composite for browse page
  @@index([searchVector], type: Gin)  // GIN on tsvector column
  @@map("products")
}

model ProductImage {
  id        String  @id @default(uuid())
  productId String
  url       String
  isPrimary Boolean @default(false)
  sortOrder Int     @default(0)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@map("product_images")
}
```

### Pattern 5: Raw SQL Migration for tsvector GIN Index

**What:** After `prisma migrate dev` generates the initial migration SQL, manually edit the migration file to add the tsvector trigger and GIN index. Prisma cannot auto-generate function-based indexes.

**When to use:** Required in the same migration that creates the `products` table. Do this in the first migration — retrofit is harder.

```sql
-- Added AFTER prisma migrate dev generates the base table DDL
-- apps/core-api/prisma/migrations/{timestamp}_init/migration.sql (appended)
-- Source: https://medium.com/@chauhananubhav16/bulletproof-full-text-search-fts-in-prisma-with-postgresql-tsvector-without-migration-drift-c421f63aaab3

-- Trigger function to maintain searchVector automatically
CREATE OR REPLACE FUNCTION products_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector(
    'english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fires on INSERT and UPDATE
CREATE TRIGGER products_search_vector_trigger
BEFORE INSERT OR UPDATE ON "products"
FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- GIN index on the tsvector column
-- The @@index([searchVector], type: Gin) in schema.prisma creates this via Prisma
-- Alternatively add explicitly if Prisma does not emit it:
-- CREATE INDEX "products_searchVector_idx" ON "products" USING GIN ("searchVector");
```

> **Migration drift prevention:** The `Unsupported("tsvector")?` type prevents Prisma from regenerating the column on subsequent migrations. Do NOT use a generated column expression in schema.prisma — Prisma will try to recreate it on every migrate. Use the trigger approach instead.

### Pattern 6: Dockerfile.dev — NestJS (BFF and Core API)

```dockerfile
# apps/core-api/Dockerfile.dev (identical pattern for apps/bff/Dockerfile.dev)
# Source: https://dev.to/robson_idongesitsamuel_b/a-complete-guide-to-using-prisma-7-with-docker-and-docker-compose-in-nestjs-80i

FROM node:22-alpine

WORKDIR /app

# Copy package files first — Docker layer cache: npm ci only reruns when package-lock.json changes
COPY package*.json ./
RUN npm ci

# Source code is volume-mounted at runtime
# node_modules is NOT volume-mounted (anonymous volume in docker-compose.yml prevents override)

EXPOSE 3001  # (or 3000 for BFF)

CMD ["npm", "run", "start:dev"]
```

> `package.json` must have `"start:dev": "nest start --watch"` in scripts.

### Pattern 7: Dockerfile.dev — Angular Frontend

```dockerfile
# apps/frontend/Dockerfile.dev
# Source: https://docs.docker.com/guides/angular/develop/

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Source code volume-mounted at runtime
# node_modules protected by anonymous volume in docker-compose.yml

EXPOSE 4200

CMD ["npm", "start", "--", "--host=0.0.0.0", "--poll=500"]
```

> `package.json` must have `"start": "ng serve"` in scripts (Angular CLI default).
> The `--poll=500` flag enables polling-based file watch within the Docker Linux VM.
> `CHOKIDAR_USEPOLLING` and `WATCHPACK_POLLING` in docker-compose.yml are belt-and-suspenders for the Webpack/chokidar layer.

### Pattern 8: docker-compose.yml

```yaml
# docker-compose.yml (repo root)
# Source: CLAUDE.md §Docker Compose Multi-Service Setup
#         https://dev.to/robson_idongesitsamuel_b/a-complete-guide-to-using-prisma-7-with-docker-and-docker-compose-in-nestjs-80i

services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - collectavo_net

  core-api:
    build:
      context: ./apps/core-api
      dockerfile: Dockerfile.dev
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./apps/core-api:/app           # source code bind mount
      - /app/node_modules              # anonymous volume: protect container node_modules
    environment:
      NODE_ENV: development
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    depends_on:
      postgres:
        condition: service_healthy     # wait for pg_isready before starting
    networks:
      - collectavo_net

  bff:
    build:
      context: ./apps/bff
      dockerfile: Dockerfile.dev
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./apps/bff:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      PORT: 3000
      CORE_API_URL: http://core-api:3001
      FRONTEND_URL: http://localhost:4200
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      - core-api
    networks:
      - collectavo_net

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile.dev
    restart: unless-stopped
    ports:
      - "4200:4200"
    volumes:
      - ./apps/frontend:/app
      - /app/node_modules
    environment:
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
    depends_on:
      - bff
    networks:
      - collectavo_net

volumes:
  postgres_data:

networks:
  collectavo_net:
    driver: bridge
```

### Pattern 9: Seed Script (Prisma 7)

**What:** Prisma 7 seed scripts must instantiate PrismaClient with a driver adapter (same requirement as PrismaService). Seed is triggered by `npx prisma db seed` — automatic seeding on `migrate dev` is removed in v7.

```typescript
// apps/core-api/prisma/seed.ts
// Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";  // generated output path

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Idempotent: upsert categories
  const categories = [
    { name: "Funko Pop", slug: "funko-pop" },
    { name: "Trading Card Game", slug: "tcg" },
    { name: "Anime Figure", slug: "anime-figure" },
    { name: "Manga", slug: "manga" },
    { name: "Limited Edition", slug: "limited-edition" },
    { name: "Retro Game", slug: "retro-game" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Upsert accounts (email is unique key)
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@collectavo.dev" },
    update: {},
    create: {
      email: "buyer@collectavo.dev",
      passwordHash: "$2b$10$...",  // bcrypt hash of "Buyer123!" — pre-computed
      role: "BUYER",
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@collectavo.dev" },
    update: {},
    create: {
      email: "seller@collectavo.dev",
      passwordHash: "$2b$10$...",  // bcrypt hash of "Seller123!" — pre-computed
      role: "SELLER",
      sellerProfile: {
        create: {
          displayName: "Demo Seller",
          bio: "Official Collectavo demo account.",
        },
      },
    },
  });

  // Seed listings per category (example: TCG)
  const tcgCategory = await prisma.category.findUnique({ where: { slug: "tcg" } });
  // ... create 3-5 products with ProductImage records per category
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
```

> **Idempotency rule:** Use `upsert` with a stable unique key (email for users, slug for categories) so seeds can be re-run safely. Never `deleteMany` + `create` in dev — it destroys data from other test sessions.

### Anti-Patterns to Avoid

- **Importing from `@prisma/client` in Prisma 7:** The generated client is no longer in `node_modules/@prisma/client`. Import from `src/generated/prisma/client` (the configured `output` path). `@prisma/client` in v7 is a re-export shim that may not contain types.
- **Omitting the driver adapter:** `new PrismaClient()` without `{ adapter }` will throw `Error: PrismaClient requires a driver adapter`. This applies to both PrismaService AND the seed script.
- **Using `prisma db push`:** Bypasses migration history. Forbidden by CLAUDE.md and CONTEXT.md.
- **Using `prisma-client-js` as generator provider:** Deprecated in v7; use `prisma-client`.
- **Omitting `moduleFormat = "cjs"` in generator:** Prisma 7 defaults to ESM; NestJS uses CommonJS. Without `cjs`, imports fail at runtime.
- **Seed in `package.json` prisma.seed field:** This configuration approach is deprecated in Prisma 7. Use `prisma.config.ts` `migrations.seed`.
- **Expecting automatic seeding on `migrate dev`:** Removed in Prisma 7. Must run `npx prisma db seed` explicitly.
- **Using `localhost` as DB host inside Docker:** Inside the container, `localhost` refers to the container itself. Use the service name: `postgres` (as defined in docker-compose.yml).
- **Omitting anonymous volume for `node_modules`:** On Windows, bind-mounting the project root overwrites the container's `node_modules` with the host's Windows-path binaries. The `/app/node_modules` anonymous volume prevents this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostgreSQL connection pooling | Custom connection manager | `pg` Pool + `@prisma/adapter-pg` | Prisma 7 manages the pool via the adapter; manual pool = double-pooling bug |
| Full-text search ranking | Custom LIKE matching | PostgreSQL `tsvector` + `to_tsquery` + `ts_rank` | GIN indexes + ts_rank are orders of magnitude faster; LIKE '%term%' cannot use indexes |
| Migration history | Manual DDL scripts | `prisma migrate dev` | Prisma tracks migration state, generates reversible SQL, handles shadow DB for safety |
| Docker healthchecks | Sleep delays | `pg_isready` with `condition: service_healthy` | Sleep is fragile; pg_isready accurately reports readiness at the protocol level |
| Seed idempotency | deleteMany + create | `prisma.*.upsert` | deleteMany cascades FK deletes unpredictably; upsert is re-runnable and safe |
| TypeScript runner for seeds | Custom babel/tsc pipeline | `tsx` | tsx uses esbuild, handles ESM/CJS automatically, zero config |

**Key insight:** Prisma 7's TypeScript engine already eliminates the biggest Docker pain point (Rust binary platform mismatch). Don't add complexity — lean on Prisma's managed connection pool via the adapter pattern.

---

## Common Pitfalls

### Pitfall 1: Prisma 7 — Missing Driver Adapter

**What goes wrong:** `PrismaService` extends `PrismaClient` and calls `super()` without `{ adapter }`. App starts, first query throws `Error: Using engine type "client" requires either "adapter" or "accelerateUrl"`.

**Why it happens:** Every Prisma 5/6 tutorial shows `super()` with no arguments. The breaking change is only documented in the v7 upgrade guide.

**How to avoid:** Always instantiate `PrismaPg` with the `DATABASE_URL` and pass it as `super({ adapter })`. This applies to PrismaService AND the seed script.

**Warning signs:** `PrismaClient requires a driver adapter` error at startup or `engine type "client" requires adapter` error message.

---

### Pitfall 2: Importing from `@prisma/client` instead of generated path

**What goes wrong:** `import { User } from '@prisma/client'` compiles fine but types are empty stubs. Runtime works but TypeScript types don't match the actual generated client.

**Why it happens:** Pre-Prisma 7, `@prisma/client` contained the generated types. In v7, types are only in the configured `output` path.

**How to avoid:** Import from `'../../generated/prisma/client'` (relative to the file), or set up a path alias in `tsconfig.json` for `@db/*`.

**Warning signs:** `Module '"@prisma/client"' has no exported member 'PrismaClient'` TypeScript error.

---

### Pitfall 3: `prisma migrate dev` fails because postgres isn't ready

**What goes wrong:** Developer runs `docker compose exec core-api npx prisma migrate dev` immediately after `docker compose up`. PostgreSQL hasn't completed initialization. Migration fails with connection refused.

**Why it happens:** `docker compose up` returns when containers start, not when services are ready. Even with `depends_on: service_healthy`, the `migrate dev` is a manual step run afterward.

**How to avoid:** Wait for the `core-api` container logs to show `Nest application successfully started` before running migrate. Alternatively, check `docker compose ps` to confirm postgres health shows `healthy`.

**Warning signs:** `Can't reach database server at postgres:5432` during migrate dev.

---

### Pitfall 4: GIN index lost on subsequent migrations (migration drift)

**What goes wrong:** After adding the tsvector trigger and GIN index to a migration file manually, a subsequent `prisma migrate dev` sees the `searchVector Unsupported("tsvector")?` column and tries to re-create it, generating a migration that drops and recreates the column — losing the GIN index.

**Why it happens:** Prisma compares its schema model against the actual DB state. When the DB has a tsvector column with a trigger expression and Prisma's schema just says `Unsupported("tsvector")?`, the diff is unstable.

**How to avoid:** After the first migration with the tsvector column is applied, mark that column as handled. The `Unsupported` type prevents Prisma from modifying the column — but verify on the first `migrate dev` after the initial schema that Prisma does not detect drift. If it does, the trigger approach (separate from the column definition) is the safest pattern — the column is just `tsvector`, the trigger populates it.

**Warning signs:** New empty migration file generated with no schema changes made — inspect its contents for dropped/recreated tsvector operations.

---

### Pitfall 5: Windows hot reload broken (silent — files change, container doesn't reload)

**What goes wrong:** Source file changes are not detected by `nest start --watch` or `ng serve` inside Docker on Windows. The developer edits a file and nothing happens.

**Why it happens:** Windows uses NTFS filesystem events that do not propagate through Docker's filesystem virtualization layer into the Linux VM's inotify mechanism.

**How to avoid:** Set all three environment variables in docker-compose.yml for the affected services:
- `CHOKIDAR_USEPOLLING: "true"` — covers chokidar (used by Angular's Webpack)
- `WATCHPACK_POLLING: "true"` — covers watchpack (used by Angular CLI directly)
- Add `--poll=500` to the `ng serve` command in Dockerfile.dev CMD for Angular

**Warning signs:** Editing `*.component.ts` files does not cause browser reload; editing NestJS controllers does not cause API restart.

---

### Pitfall 6: `node_modules` overwritten by bind mount on Windows

**What goes wrong:** The container installs packages for Linux Alpine during `RUN npm ci`. The `volumes: ./apps/core-api:/app` bind mount then overwrites `/app` with the host directory, which either has no `node_modules` (first run) or has Windows-native binaries that cannot run in Linux.

**Why it happens:** The bind mount is total — it replaces the entire `/app` directory, including `node_modules`.

**How to avoid:** Always add a second anonymous volume entry immediately after the bind mount:
```yaml
volumes:
  - ./apps/core-api:/app        # bind mount source
  - /app/node_modules           # anonymous: Docker manages this separately
```
The anonymous volume takes precedence for `node_modules`, keeping the container's Linux installation intact.

**Warning signs:** `Error: /app/node_modules/.bin/nest: exec format error` — Windows binary running in Linux container.

---

### Pitfall 7: Seed script fails because generated client not found

**What goes wrong:** `npx prisma db seed` runs `tsx prisma/seed.ts` which imports from `../src/generated/prisma/client`. The path doesn't exist because `npx prisma generate` hasn't been run yet.

**Why it happens:** The generated client is in `.gitignore` and must be regenerated after `npm ci` or after any schema change.

**How to avoid:** Run `npx prisma generate` before `npx prisma db seed`. Order: `prisma migrate dev` (which also runs generate) → `prisma db seed`. If running seed independently: `npx prisma generate && npx prisma db seed`.

**Warning signs:** `Cannot find module '../src/generated/prisma/client'` during seed execution.

---

## Code Examples

### Querying with Full-Text Search ($queryRaw)

```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access
// Used in Phase 5 — documented here for schema design awareness

async searchProducts(query: string): Promise<Product[]> {
  return this.prisma.$queryRaw`
    SELECT p.*
    FROM "products" p
    WHERE p."searchVector" @@ plainto_tsquery('english', ${query})
      AND p."deletedAt" IS NULL
      AND p."status" = 'ACTIVE'
    ORDER BY ts_rank(p."searchVector", plainto_tsquery('english', ${query})) DESC
    LIMIT 20
  `;
}
```

### Running Migration and Seed (Developer Workflow)

```bash
# After docker compose up, once core-api shows "Nest application started":

# Step 1: Apply schema migrations
docker compose exec core-api npx prisma migrate dev --name init

# Step 2: Run seed data
docker compose exec core-api npx prisma db seed

# Step 3: (Optional) Open Prisma Studio
docker compose exec core-api npx prisma studio
```

### .env.example (committed to repo)

```bash
# .env.example — copy to .env and fill in real values
POSTGRES_USER=collectavo
POSTGRES_PASSWORD=change_me_dev
POSTGRES_DB=collectavo_dev

JWT_ACCESS_SECRET=change_me_min_32_chars_access
JWT_REFRESH_SECRET=change_me_min_32_chars_refresh

# Seeded Seller account: seller@collectavo.dev / Seller123!
# Seeded Buyer account:  buyer@collectavo.dev  / Buyer123!
```

### .gitignore additions (repo root)

```
# Environment
.env
.env.local

# Prisma generated client (rebuilt on npm ci + prisma generate)
apps/core-api/src/generated/
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `provider = "prisma-client-js"` | `provider = "prisma-client"` | Prisma 7.0.0 (Jan 2026) | Old provider still works but is deprecated |
| URL in `datasource db { url = env("DATABASE_URL") }` | URL in `prisma.config.ts` via `datasource.url: env("DATABASE_URL")` | Prisma 7.0.0 | `url` in schema.prisma is deprecated but not removed |
| Seed in `package.json "prisma": { "seed": "tsx..." }` | Seed in `prisma.config.ts migrations.seed` | Prisma 7.0.0 | package.json config is deprecated in v7 |
| Auto-seed on `prisma migrate dev` | `npx prisma db seed` explicit only | Prisma 7.0.0 | Developers must run seed step explicitly |
| `PrismaClient()` direct instantiation | `PrismaClient({ adapter: new PrismaPg(...) })` | Prisma 7.0.0 | No adapter = startup error |
| Rust query engine binary in Docker | TypeScript engine (no binary) | Prisma 7.0.0 | No Alpine/musl compatibility issues; smaller images |
| Generated client in `node_modules/@prisma/client` | Generated client in configured `output` path | Prisma 7.0.0 | All imports must change from `@prisma/client` to output path |

**Deprecated/outdated:**
- `provider = "prisma-client-js"` in generator: deprecated, use `"prisma-client"` for new projects
- `url = env("DATABASE_URL")` in schema datasource: deprecated in v7, supported but config belongs in `prisma.config.ts`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@@index([searchVector], type: Gin)` in Prisma schema generates a valid GIN index DDL for the `Unsupported("tsvector")?` column | Standard Stack / Schema Pattern | Prisma may skip or error on indexing Unsupported columns — fallback: add raw `CREATE INDEX` in migration SQL |
| A2 | `moduleFormat = "cjs"` in the generator block makes the generated client usable with NestJS's CommonJS output without additional tsconfig changes | Pattern 1 / Prisma Generator | If NestJS is configured as ESM, module format mismatch will cause import errors at startup |
| A3 | bcrypt hashes for seed accounts can be pre-computed and hardcoded in `seed.ts` | Pattern 9 / Seed Script | If bcrypt version mismatch between seed-time and auth-time, passwords won't verify — safer to call bcrypt.hash() inside seed.ts |
| A4 | `--poll=500` on `ng serve` cmd is sufficient; CHOKIDAR and WATCHPACK env vars handle the NestJS side | Pattern 7 / Dockerfile.dev | Some Angular 20 CLI versions may use a different watch mechanism — may need `--live-reload` flag explicitly |

---

## Open Questions

1. **bcrypt in seed — version consistency**
   - What we know: seed.ts needs to hash passwords for test accounts
   - What's unclear: whether to pre-compute hashes (simpler seed, fragile) or call bcrypt.hash() inside seed.ts (requires bcrypt installed as a seed dependency)
   - Recommendation: call `bcrypt.hash("Seller123!", 10)` inside seed.ts — more reliable, self-documenting

2. **Angular proxy config inside Docker**
   - What we know: Angular's `proxy.conf.json` is used in local development to redirect `/api` calls to the BFF
   - What's unclear: whether `proxy.conf.json` needs updating for Docker network routing (inside Docker, the BFF is `http://bff:3000`, but the browser makes requests from `localhost:4200`)
   - Recommendation: browser requests go to `localhost:4200` → Angular dev server → proxy to `http://bff:3000` (Docker internal). The proxy runs inside the Docker container so it CAN reach `bff:3000`. Add `proxy.conf.json` targeting `http://bff:3000` in the Angular CMD.

3. **`generate` step in Dockerfile.dev**
   - What we know: `npx prisma generate` must run to produce the typed client
   - What's unclear: whether to run `prisma generate` as part of `npm ci` in Dockerfile.dev or require developers to run it after container start
   - Recommendation: add `RUN npx prisma generate` as a Dockerfile.dev layer after `npm ci` in core-api — this ensures the client is pre-built in the image and available immediately on container start. But because `output` is in `src/` (not in `node_modules`), it's bind-mounted away. Better: run `npx prisma generate` as part of the start:dev npm script or in an entrypoint.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Desktop | All services | Assumed available (Windows dev machine) | Unknown | — |
| Node.js 22 | npm installs, local tooling | Assumed from CLAUDE.md | Unknown | Node 20 also works |
| npm | Package installation | Assumed available | Unknown | — |
| `pg_isready` | PostgreSQL healthcheck | Built into `postgres:17-alpine` image | 17.x | Use `CMD pg_isready` without version flag |

*Step 2.6 SKIPPED for environment probing: this is a greenfield setup phase — no external services exist to probe. All dependencies are provisioned via Docker Compose itself.*

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (via `@nestjs/testing`) |
| Config file | No existing config — Wave 0 creates `jest.config.js` in each NestJS app |
| Quick run command | `npm test -- --testPathPattern=database.module` |
| Full suite command | `npm test` |

> Note: Phase 1 is infrastructure-only. There are no business logic use cases to unit test. The appropriate test for this phase is a smoke test — can the `DatabaseModule` initialize and `PrismaService` connect? This is a startup integration test, not a unit test.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | All 4 services start and are reachable | Smoke / manual | `docker compose ps` + curl checks | N/A — Docker smoke test |
| INFRA-01 | PrismaService connects to PostgreSQL | Integration | `npm test -- --testPathPattern=prisma.service` | Wave 0 |
| INFRA-04 | Seed runs without error and produces expected row counts | Integration (seed verification) | `docker compose exec core-api npx prisma db seed` exit code | N/A — manual verification |
| INFRA-04 | All 6 categories present after seed | Integration | Query via Prisma Studio or `$queryRaw` in test | Wave 0 |

### Sampling Rate

- **Per task commit:** No automated test runs required (infrastructure files; no business logic)
- **Per wave merge:** `docker compose up` smoke test — all 4 services healthy
- **Phase gate:** Full manual verification checklist before `/gsd:verify-work` (see success criteria in ROADMAP.md)

### Wave 0 Gaps

- [ ] `apps/core-api/src/infrastructure/database/prisma.service.spec.ts` — PrismaService connection smoke test
- [ ] `apps/core-api/jest.config.js` — Jest config for NestJS with ts-jest
- [ ] Framework install: `npm install -D jest @nestjs/testing ts-jest @types/jest` in core-api (if not already in scaffold)

*(No existing test infrastructure — Phase 1 is greenfield)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No — auth not implemented in Phase 1 | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No — no API endpoints in Phase 1 | — |
| V6 Cryptography | Partial — seed script hashes passwords | bcrypt (never hand-roll hash) |
| V8 Data Protection | Yes — DATABASE_URL must not be committed | `.env` gitignored; `.env.example` has placeholders only |

### Known Threat Patterns for Infrastructure Setup

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credentials in docker-compose.yml | Information Disclosure | Use `${VAR}` references to gitignored `.env` file |
| DATABASE_URL in environment logs | Information Disclosure | Docker Compose passes env vars securely; avoid printing DATABASE_URL in startup logs |
| PostgreSQL port exposed to host | Elevation of Privilege | Port 5432 exposed in dev is acceptable; ensure firewall blocks external access; in prod, remove port mapping |
| Seed accounts with weak passwords | Broken Authentication | Seed passwords should be strong (`Seller123!` format); document they are dev-only |

---

## Sources

### Primary (HIGH confidence)
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) — driver adapter requirement, deprecated datasource url, generator provider change
- [Prisma Seeding Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) — seed via prisma.config.ts, explicit `prisma db seed` in v7, seed script with driver adapter
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) — prisma.config.ts structure, defineConfig API
- [Prisma NestJS Guide (Official)](https://www.prisma.io/docs/guides/frameworks/nestjs) — PrismaService pattern with adapter-pg, generator output path
- [Prisma Indexes Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes) — @@index types, GIN index syntax, Unsupported type for tsvector
- [Prisma Generators Reference](https://www.prisma.io/docs/orm/prisma-schema/overview/generators) — prisma-client provider, moduleFormat, output, engineType
- [Docker Angular Development Guide](https://docs.docker.com/guides/angular/develop/) — Dockerfile.dev, docker compose watch pattern
- npm registry: `prisma` 7.8.0, `@prisma/client` 7.8.0, `@prisma/adapter-pg` 7.8.0, `pg` 8.20.0, `tsx` 4.22.1 — all verified via `npm view`

### Secondary (MEDIUM confidence)
- [Upgrading Prisma to Rust-free client in NestJS — Martin Gregersen](https://mgregersen.dk/upgrading-prisma-to-rust-free-client-in-nestjs/) — PrismaService with adapter pattern, output path inside src/, moduleFormat cjs
- [Prisma 7 Docker + NestJS Complete Guide — DEV Community](https://dev.to/robson_idongesitsamuel_b/a-complete-guide-to-using-prisma-7-with-docker-and-docker-compose-in-nestjs-80i) — docker-compose.yml with healthchecks, Dockerfile.dev pattern
- [Bulletproof FTS in Prisma with tsvector — Medium](https://medium.com/@chauhananubhav16/bulletproof-full-text-search-fts-in-prisma-with-postgresql-tsvector-without-migration-drift-c421f63aaab3) — trigger-based tsvector approach, migration drift prevention
- [Prisma 7.x + NestJS community discussion](https://github.com/prisma/prisma/discussions/29146) — confirmed compatibility, no show-stoppers
- [NestJS Hot Reload in Docker — DEV Community](https://dev.to/osalumense/why-nestjs-hot-reload-does-not-work-in-docker-and-how-to-fix-it-properly-4de4) — CHOKIDAR_USEPOLLING, WATCHPACK_POLLING, anonymous volume pattern

### Tertiary (LOW confidence — for supplemental context only)
- [How to Setup NestJS with Prisma + PostgreSQL 2026 — DEV Community](https://dev.to/manendrav/how-to-set-up-nestjs-with-prisma-and-postgresql-2026-complete-guide-2da7) — corroborates moduleFormat = "cjs" requirement
- [Prisma 7 Seeding Issue — Zenn](https://zenn.dev/gaku_wtnb/articles/bdff6eaf15d714) — confirms seed not auto-running in v7

---

## Project Constraints (from CLAUDE.md)

Directives from `CLAUDE.md` that planning must honor:

| Directive | Impact on Phase 1 |
|-----------|-------------------|
| `prisma db push` is forbidden | All schema application must use `prisma migrate dev` |
| No npm workspaces at root | Each `apps/*` directory has its own `package.json` and `node_modules` |
| `TypeORM` and `Drizzle` are forbidden | Only Prisma 7 with PostgreSQL |
| `resource()` / `httpResource()` are experimental — do not use | N/A for Phase 1 (no frontend logic) |
| Zoneless Angular is not production-safe | N/A for Phase 1 (no frontend logic) |
| Clean Architecture in Core API | `DatabaseModule` lives in `src/infrastructure/database/` — not in feature modules |
| `@Angular/material` for UI | N/A for Phase 1 |
| Versions are locked (see Versions Summary table in CLAUDE.md) | `prisma@7.8.0`, `@nestjs/core@11.1.21`, `@angular/core@20.x` — must match exactly |

---

## Metadata

**Confidence breakdown:**
- Standard stack (Prisma 7 + adapter-pg + pg + tsx): HIGH — verified on npm registry, confirmed via official Prisma docs and upgrade guide
- Prisma 7 breaking changes (adapter, generator, config, seed): HIGH — verified against official docs and multiple independent implementation reports from 2026
- Docker Compose patterns (healthchecks, polling, anonymous volumes): HIGH — CLAUDE.md reference + Docker official docs + community corroboration
- Schema design (tsvector, GIN index, Unsupported type): MEDIUM — confirmed as the recommended workaround by official Prisma docs and community; the exact Prisma DDL output for `@@index([searchVector], type: Gin)` on an `Unsupported` column is ASSUMED to work as expected
- Seed idempotency patterns: HIGH — standard Prisma upsert pattern from official docs

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (Prisma is actively releasing; confirm no 7.9+ changes before planning)
