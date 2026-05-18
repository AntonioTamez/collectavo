---
phase: 01-infrastructure-foundation
plan: "03"
subsystem: database
tags: [prisma, postgresql, bcryptjs, seed-data, collectibles]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation
    plan: "02"
    provides: "Prisma schema (schema.prisma) with all models — User, SellerProfile, Category, Product, ProductImage enums"
provides:
  - "Idempotent seed script: 6 categories, 2 user accounts, 19 collectibles listings with 38 images"
  - "buyer@collectavo.dev (BUYER) and seller@collectavo.dev (SELLER) dev accounts with bcrypt-hashed passwords"
  - "Representative sample listings across all 6 categories for Phase 7/8 UI and Phase 2 auth testing"
affects:
  - "Phase 2 — auth tests depend on buyer/seller accounts"
  - "Phase 7 — listing browse UI depends on realistic product data"
  - "Phase 8 — seller dashboard depends on seller account and associated products"

# Tech tracking
tech-stack:
  added:
    - "bcryptjs@^2.4.3 (pure JS bcrypt — no native compilation needed)"
    - "@types/bcryptjs@^2.4.4 (TypeScript types for bcryptjs)"
  patterns:
    - "Prisma 7 seed adapter pattern: PrismaPg + Pool + PrismaClient({ adapter })"
    - "Runtime bcrypt hashing inside main() — never pre-computed strings"
    - "Category upsert by slug, user upsert by email — stable idempotent keys"
    - "Product delete-then-create pattern for demo seller (acceptable dev-only reset)"
    - "Nested ProductImage create inside product create — 2 images per product"

key-files:
  created:
    - "apps/core-api/prisma/seed.ts"
  modified:
    - "apps/core-api/package.json"

key-decisions:
  - "bcryptjs chosen over bcrypt for pure JS implementation (no native compilation, Docker-safe)"
  - "bcrypt.hash() called at runtime inside main() — not pre-computed — per CONTEXT.md D-08 recommendation and open question resolution"
  - "Products use deleteMany-for-demo-seller then create (not upsert) — Product model has no unique constraint on title, demo seller data is entirely recreatable"
  - "6 category slugs exactly match schema decisions: funko-pop, tcg, anime-figure, manga, limited-edition, retro-game"
  - "19 total products (5+4+3+4+3+4) — within the 18-30 D-05 target"

patterns-established:
  - "Seed script pattern: import dotenv/config, PrismaPg adapter setup, main() with all logic, pool.end() in .finally()"
  - "Image URL pattern: https://picsum.photos/seed/{kebab-slug}/800/800 and {kebab-slug}-2/800/800"
  - "Per-category metadata JSON shapes: TCG uses set/cardNumber/rarity/edition/language; Funko uses series/edition/exclusive/vaulted; Anime uses scale/manufacturer/character; Manga uses volume/publisher/language; Limited uses editionSize/editionNumber; Retro uses completeness/hasBox/hasManual"

requirements-completed:
  - INFRA-04

# Metrics
duration: 3min
completed: "2026-05-18"
---

# Phase 1 Plan 03: Seed Script Summary

**Idempotent seed script populating 6 categories, buyer/seller accounts with bcrypt-hashed passwords, and 19 realistic collectibles listings (38 picsum images) using Prisma 7 PrismaPg adapter pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-18T01:32:57Z
- **Completed:** 2026-05-18T01:35:59Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created complete `apps/core-api/prisma/seed.ts` with Prisma 7 adapter pattern (PrismaPg + pg Pool)
- Seeded 6 categories by slug (funko-pop, tcg, anime-figure, manga, limited-edition, retro-game) — fully idempotent via upsert
- Created buyer@collectavo.dev and seller@collectavo.dev accounts with bcrypt-hashed passwords (runtime hash — no pre-computed strings)
- 19 realistic collectibles products with per-category metadata and 2 picsum.photos images each (38 total images)
- Added bcryptjs (pure JS) to package.json dependencies to avoid native compilation issues in Docker

## Task Commits

1. **Task 1: Complete seed script with all 6 categories and realistic listings** - `aa321db` (feat)

**Plan metadata:** (in progress — see below)

## Files Created/Modified

- `apps/core-api/prisma/seed.ts` — Complete idempotent seed script: adapter pattern, categories, accounts, 19 products with images
- `apps/core-api/package.json` — Added bcryptjs@^2.4.3 to dependencies, @types/bcryptjs@^2.4.4 to devDependencies

## Decisions Made

- **bcryptjs over bcrypt:** bcryptjs is pure JavaScript (no native compilation), making it reliable in Docker Alpine without native build tools. Added at runtime rather than pre-computing hashes for reliability across environments.
- **deleteMany + create for products:** The Product model has no unique constraint on title, making product upsert impossible without a surrogate key. Since all products belong to the known demo seller email, deleteMany on that seller's products is a safe dev-only reset.
- **19 products:** 5 TCG + 4 Funko Pop + 3 Anime Figure + 4 Manga + 3 Limited Edition + 4 Retro Game = 19 total (within 18–30 D-05 target).
- **Realistic names used exactly as specified:** Charizard VMAX, Pikachu VMAX, Luffy Gear 5, Blue-Eyes White Dragon, Umbreon VMAX, Goku Super Saiyan, Naruto Running, Iron Man Mark 85, Rem 1/7, Zero Two 1/7, Mikasa Ackerman 1/8, One Piece Vol. 1, Demon Slayer complete set, Berserk Vol. 1, Dragon Ball Z Viz Big, Street Fighter statue, Zelda ToTK artbook, Pokémon 25th, Ocarina of Time CIB, Super Mario Bros./Duck Hunt CIB, Final Fantasy VII, GoldenEye 007.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added bcryptjs to package.json before writing seed.ts**
- **Found during:** Task 1 (pre-implementation check of package.json)
- **Issue:** bcryptjs was not present in apps/core-api/package.json dependencies. The seed script requires it to hash passwords at runtime.
- **Fix:** Added `bcryptjs@^2.4.3` to dependencies and `@types/bcryptjs@^2.4.4` to devDependencies in package.json before writing seed.ts.
- **Files modified:** apps/core-api/package.json
- **Verification:** `pkg.dependencies.bcryptjs` confirmed present after edit
- **Committed in:** aa321db (same task commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix was specified in the plan action itself ("If bcryptjs is not in apps/core-api/package.json, add it"). No scope creep.

## Issues Encountered

None — plan executed as specified with the anticipated bcryptjs addition.

## User Setup Required

None — no external service configuration required. Seed is run via `docker compose exec core-api npx prisma db seed` after migration.

## Known Stubs

None — seed script produces fully wired data (real category names, product titles, metadata, images) with no placeholder content beyond the deterministic picsum.photos CDN URLs which are intentional per D-07.

## Threat Flags

No new security surface introduced. Threat model accepted per plan:
- T-03-01: Dev-only seed passwords (bcrypt hashed, @collectavo.dev domain)
- T-03-02: deleteMany on demo seller's products (dev-only seed, documented)
- T-03-SC: bcryptjs pre-audited (npm since 2012, pure JS, no postinstall scripts)

## Next Phase Readiness

- Ready for Plan 04 (Docker Compose + Dockerfiles) — seed.ts is complete and will run via `npx prisma db seed` once Docker is up and migration applied
- Phase 2 auth testing: buyer@collectavo.dev / Buyer123! and seller@collectavo.dev / Seller123! are ready
- Phase 7/8 UI testing: 19 realistic collectibles listings with images across all 6 categories are ready

## Self-Check: PASSED

- `apps/core-api/prisma/seed.ts` exists on disk: VERIFIED
- `apps/core-api/package.json` contains bcryptjs: VERIFIED
- Task commit aa321db exists: VERIFIED (git log shows it)
- All acceptance criteria from plan verified via node verification script: 19/19 PASS

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-05-18*
