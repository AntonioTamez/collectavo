# Phase 1: Infrastructure Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 1-Infrastructure Foundation
**Areas discussed:** Directory layout, Seed data depth, Docker Compose strategy, Prisma schema specifics

---

## Directory Layout

### Q1: How should the 3 app projects be arranged in the repo?

| Option | Description | Selected |
|--------|-------------|----------|
| `apps/` subdirectory | apps/frontend, apps/bff, apps/core-api — standard monorepo convention | ✓ |
| Root-level directories | frontend/, bff/, core-api/ at repo root | |
| You decide | Let the planner pick | |

**User's choice:** `apps/` subdirectory

---

### Q2: Shared root package.json (npm workspaces) or each app fully independent?

| Option | Description | Selected |
|--------|-------------|----------|
| Each app fully independent | Own package.json per app, no hoisting | ✓ |
| npm workspaces at root | Shared install, single root package.json | |
| You decide | Let the planner choose | |

**User's choice:** Each app fully independent

---

### Q3: What goes at the repo root?

| Option | Description | Selected |
|--------|-------------|----------|
| docker-compose.yml + .env + README | Lean root, everything else in app dirs | ✓ |
| docker-compose.yml + shared scripts + Makefile | Add Makefile/scripts/ for common tasks | |
| You decide | Planner picks conventional layout | |

**User's choice:** docker-compose.yml + .env + README

---

### Q4: Where does the Prisma schema live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside apps/core-api | apps/core-api/prisma/schema.prisma — only Core API touches DB | ✓ |
| Shared /prisma at repo root | Root-level prisma/ directory | |

**User's choice:** Inside apps/core-api

---

## Seed Data Depth

### Q1: How many sample listings per category?

| Option | Description | Selected |
|--------|-------------|----------|
| 3–5 per category | ~18–30 total, meaningful for pagination and filtering | ✓ |
| 1–2 per category | ~6–12 total, minimal | |
| 10+ per category | 60+ total, rich demo | |

**User's choice:** 3–5 per category

---

### Q2: How realistic should seed data be?

| Option | Description | Selected |
|--------|-------------|----------|
| Realistic names + plausible prices | Real collectibles names, real-ish prices | ✓ |
| Placeholder data | "Sample Funko #1", $10.00 | |
| You decide | Planner picks | |

**User's choice:** Realistic names + plausible prices

---

### Q3: Should seed listings include image URLs?

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder image URLs from a CDN | picsum.photos or similar, creates ProductImage records | ✓ |
| No images in seeds | Skip ProductImage records | |
| You decide | Planner decides | |

**User's choice:** Placeholder image URLs from a CDN

---

### Q4: Should seeds create test user accounts?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — one Buyer + one Seller | Seller owns seeded listings, ready for auth testing | ✓ |
| No — categories and listings only | Manual account creation when needed | |
| Yes — plus an Admin account | Buyer + Seller + Admin | |

**User's choice:** Yes — one Buyer and one Seller account

---

## Docker Compose Strategy

### Q1: Angular frontend inside Docker or native on host?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside Docker (all 4 services) | `ng serve` + CHOKIDAR_USEPOLLING=true, true single-command startup | ✓ |
| Frontend native, backend in Docker | Faster hot reload but separate terminal step | |

**User's choice:** Inside Docker

---

### Q2: Single docker-compose.yml or base + override?

| Option | Description | Selected |
|--------|-------------|----------|
| Single docker-compose.yml | One file for local dev, simpler to maintain | ✓ |
| docker-compose.yml + docker-compose.dev.yml | Base + dev override, cleaner long-term | |
| You decide | Planner picks | |

**User's choice:** Single docker-compose.yml

---

### Q3: Shared Dockerfile.dev or per-app Dockerfiles?

| Option | Description | Selected |
|--------|-------------|----------|
| One Dockerfile.dev per app | Each app owns its build, isolated contexts | ✓ |
| Shared root Dockerfile with build args | Single file, forces identical build steps | |

**User's choice:** One Dockerfile.dev per app

---

### Q4: How should `prisma migrate dev` run on first startup?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual step after `docker compose up` | Intentional, developer-controlled | ✓ |
| Automatic entrypoint script | Core-api runs migration on startup automatically | |

**User's choice:** Manual step after `docker compose up`

---

## Prisma Schema Specifics

### Q1: How should product condition be modeled?

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma enum: MINT, NEAR_MINT, EXCELLENT, GOOD, FAIR, POOR | DB-enforced, type-safe | ✓ |
| String field with class-validator | Flexible, no DB enforcement | |

**User's choice:** Prisma enum

---

### Q2: How should listing type be modeled?

| Option | Description | Selected |
|--------|-------------|----------|
| Enum: DIRECT_SALE now, AUCTION added in Milestone 2 | Clean, migration-safe, no premature design | ✓ |
| Enum: DIRECT_SALE + AUCTION both now | Define full enum even if AUCTION unused | |
| Boolean `isAuction` | Simpler, harder to extend | |

**User's choice:** DIRECT_SALE only in v1, AUCTION via migration in Milestone 2

---

### Q3: How should product listing status be modeled?

| Option | Description | Selected |
|--------|-------------|----------|
| Enum: ACTIVE, INACTIVE, DRAFT | Covers v1 seller use cases, extensible | ✓ |
| Boolean `isActive` only | Can't distinguish INACTIVE from DRAFT | |
| You decide | Planner picks | |

**User's choice:** Enum: ACTIVE, INACTIVE, DRAFT

---

### Q4: Soft delete or hard delete on Product?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete with `deletedAt DateTime?` | Preserves history, supports audit trail | ✓ |
| Hard delete only | Simpler queries, no ghost data | |
| You decide | Planner picks | |

**User's choice:** Soft delete with `deletedAt DateTime?`

---

## Claude's Discretion

None — user provided explicit choices for all questions.

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
