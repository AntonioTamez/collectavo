# Phase 1: Infrastructure Foundation - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the complete local development environment: all four services (Angular frontend, NestJS BFF, NestJS Core API, PostgreSQL) running via a single `docker compose up`, the full Prisma database schema with correct relations and indexes, and seed data that makes later phases immediately testable without manual setup.

This phase delivers infrastructure only — no business logic, no API endpoints, no UI. Everything else in the milestone depends on this being solid.

</domain>

<decisions>
## Implementation Decisions

### Directory Layout

- **D-01:** `apps/` subdirectory structure — `apps/frontend`, `apps/bff`, `apps/core-api`. Standard monorepo convention; Docker build contexts are explicit and isolated.
- **D-02:** Each app is fully independent — its own `package.json`, `node_modules`, and install lifecycle. No npm workspaces at root. Matches how NestJS CLI scaffolds projects and avoids Docker build hoisting issues.
- **D-03:** Root contains only: `docker-compose.yml`, `.env`, `.env.example`, `.gitignore`, `README.md`. No Makefile or shared scripts in v1.
- **D-04:** Prisma schema lives at `apps/core-api/prisma/schema.prisma`. Only Core API touches the database; no reason to share the schema.

### Seed Data

- **D-05:** 3–5 sample listings per category (18–30 total across 6 categories). Enough for pagination and filtering to look meaningful in Phase 7 UI testing.
- **D-06:** Realistic collectibles data — actual product names and plausible prices (e.g., "Charizard VMAX Secret Rare #074 Rainbow" at $89.99, not "Sample TCG #1"). Makes the UI look like a real marketplace in demos.
- **D-07:** Each seeded listing includes `ProductImage` records using placeholder CDN URLs (e.g., `https://picsum.photos/seed/{slug}/800/800`). Listings appear visually complete without real uploads.
- **D-08:** Seeds create one `Buyer` account and one `Seller` account with known credentials. The Seller account owns all seeded listings. This makes Phase 2 auth testing and Phase 7/8 UI testing immediately runnable.

### Docker Compose

- **D-09:** All 4 services run inside Docker Compose — Angular frontend included. Frontend uses `ng serve` with `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true` for hot reload on Windows/WSL2.
- **D-10:** Single `docker-compose.yml` at repo root. No base + override split for v1 — can refactor when prod config diverges.
- **D-11:** One `Dockerfile.dev` per NestJS app in its own directory (`apps/bff/Dockerfile.dev`, `apps/core-api/Dockerfile.dev`). Angular frontend uses a similar pattern in `apps/frontend/Dockerfile.dev`.
- **D-12:** `prisma migrate dev` is a **manual step** after `docker compose up` — not automated in the entrypoint. Developer explicitly runs: `docker compose exec core-api npx prisma migrate dev`. Intentional, visible, developer-controlled.

### Prisma Schema Enums

- **D-13:** `Condition` enum: `MINT`, `NEAR_MINT`, `EXCELLENT`, `GOOD`, `FAIR`, `POOR`. Fixed collectibles-standard grading scale, enforced at DB level.
- **D-14:** `ListingType` enum: `DIRECT_SALE` only in v1. `AUCTION` added via migration in Milestone 2. Avoids premature coupling to deferred scope.
- **D-15:** `ProductStatus` enum: `ACTIVE`, `INACTIVE`, `DRAFT`. Distinguishes a published listing (`ACTIVE`), a deactivated one (`INACTIVE`), and a saved-but-unpublished one (`DRAFT`). Required for Phase 8 seller dashboard.
- **D-16:** Soft delete on `Product` via `deletedAt DateTime?`. Filter by `deletedAt IS NULL` on all list queries. Preserves history and supports future "sold/expired" states.

### Carried Forward from Init

- **D-17:** `Category` modeled as a DB table (not Prisma enum) — allows category additions/restructuring without a schema migration.
- **D-18:** Per-category metadata stored as `metadata Json` (JSONB) column on `Product` — flexible per-category fields without nullable columns for every category.
- **D-19:** `RefreshToken` as a separate table — supports multi-device sessions and token family reuse detection (Phase 2).
- **D-20:** BFF on port 3000, Core API on port 3001. Angular frontend on port 4200 (default `ng serve`). PostgreSQL on port 5432.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Requirements
- `.planning/ROADMAP.md` §Phase 1 — Phase goal, success criteria, and dependency chain
- `.planning/REQUIREMENTS.md` §Infrastructure — INFRA-01 (Docker Compose), INFRA-04 (seeds)
- `.planning/PROJECT.md` — Architecture constraints, tech stack decisions, out-of-scope items

### Stack and Patterns
- `CLAUDE.md` §Docker Compose Multi-Service Setup — Docker Compose service architecture, Dockerfile.dev pattern, `depends_on` with healthchecks, anonymous volumes for node_modules, Windows polling env vars
- `CLAUDE.md` §PostgreSQL + Prisma ORM — PrismaService pattern, schema patterns for marketplace, migration workflow, persistence mapper pattern
- `CLAUDE.md` §Versions Summary — Exact package versions locked for the project (Prisma 7.8.0, NestJS 11.1.21, etc.)
- `CLAUDE.md` §What NOT to Use — `prisma db push` is forbidden; use `prisma migrate dev`. No TypeORM, no Drizzle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. Phase 1 creates all foundational assets.

### Established Patterns
- All patterns come from `CLAUDE.md` (authoritative). No existing code to reference.

### Integration Points
- `apps/core-api/prisma/schema.prisma` → all subsequent backend phases depend on this schema being correct and migrated
- `docker-compose.yml` → defines service names used as internal hostnames (e.g., `core-api`, `postgres`) — downstream phases must reference these names in environment config
- Seed credentials (Buyer/Seller accounts) → Phases 2, 7, 8 depend on these for auth and UI testing

</code_context>

<specifics>
## Specific Ideas

- Seed image URLs pattern: `https://picsum.photos/seed/{listing-slug}/800/800` — deterministic, unique per listing, free public CDN, no external dependency
- Seed data should include representative examples from each collectibles domain: Pokémon/One Piece/Yu-Gi-Oh for TCG, Funko Pop figures with specific edition names, Anime scales with manufacturer names, Manga volumes with publisher, retro games noting CIB/loose/complete status, and limited edition items with edition numbers
- Seeded Seller account credentials documented in `.env.example` for easy developer access

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Infrastructure Foundation*
*Context gathered: 2026-05-17*
