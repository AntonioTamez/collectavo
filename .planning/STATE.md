# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-16)

**Core value:** Buyers can discover, browse, and purchase collectibles from verified sellers — the marketplace listing experience must work end-to-end before anything else.
**Current focus:** Phase 1 — Infrastructure Foundation

## Current Position

Phase: 1 of 8 (Infrastructure Foundation)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-05-16 — Roadmap created, STATE.md initialized

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Category modeled as table (not enum) — supports add/restructure without schema migration
- Init: metadata stored as JSONB column on Product — flexible per-category fields without nullable columns
- Init: RefreshToken as separate table — supports multi-device and token family reuse detection
- Init: BFF on port 3000 / Core API on port 3001 per STACK.md
- Init: Image storage backend deferred decision — Cloudinary free tier recommended; decide before Phase 5

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 5: Full-text search (PostgreSQL tsvector GIN index + Prisma 7 $executeRaw/$queryRaw) needs a pattern verification spike before implementation
- Phase 8: Image upload storage backend (Cloudinary vs S3) decision required before Phase 5 starts

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-16
Stopped at: Roadmap created — ready to plan Phase 1
Resume file: None
