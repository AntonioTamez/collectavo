---
phase: 1
slug: infrastructure-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (via `@nestjs/testing`) + ts-jest |
| **Config file** | `apps/core-api/jest.config.js` — created in Wave 0 |
| **Quick run command** | `docker compose exec core-api npm test -- --testPathPattern=prisma.service` |
| **Full suite command** | `docker compose exec core-api npm test` |
| **Estimated runtime** | ~15 seconds (1 integration smoke test) |

---

## Sampling Rate

- **After every task commit:** Run `docker compose exec core-api npm test -- --testPathPattern=prisma.service`
- **After every plan wave:** Run `docker compose up --wait` + smoke checks; run full test suite in core-api
- **Before `/gsd:verify-work`:** Full manual verification checklist (ROADMAP.md success criteria) + test suite green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| DB-connect | 01 | 1 | INFRA-01 | — | PrismaService connects to postgres via adapter-pg | integration | `docker compose exec core-api npm test -- --testPathPattern=prisma.service` | ❌ W0 | ⬜ pending |
| docker-up | 01 | 1 | INFRA-01 | — | All 4 services reachable on expected ports | smoke/manual | `docker compose ps` + curl checks | N/A — manual | ⬜ pending |
| seed-run | 02 | 2 | INFRA-04 | — | All 6 categories present; 18–30 products seeded; Buyer and Seller accounts exist | integration/manual | `docker compose exec core-api npx prisma db seed` (exit 0) | N/A — manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/core-api/jest.config.js` — Jest config for NestJS with ts-jest
- [ ] `apps/core-api/src/infrastructure/database/prisma.service.spec.ts` — PrismaService connection smoke test (requires real postgres via Docker)
- [ ] Framework install: `npm install -D jest @nestjs/testing ts-jest @types/jest` in `apps/core-api` (if not already present in NestJS scaffold)

*Note: Phase 1 is infrastructure-only — no business logic use cases to unit test. Wave 0 delivers one integration smoke test (PrismaService.$connect succeeds) plus the Jest scaffold.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 4 services start with `docker compose up` | INFRA-01 | Docker Compose brings up containers — no automated harness to run docker from inside the container | `docker compose up -d --wait` → `docker compose ps` → confirm all 4 services show "healthy" or "running" |
| `prisma migrate dev` applies cleanly | INFRA-01 | Interactive — requires container exec + human-readable output confirmation | `docker compose exec core-api npx prisma migrate dev --name init` → verify "Migration `init` applied" output |
| Seed produces correct row counts | INFRA-04 | Seed verification queries run inside container | `docker compose exec core-api npx prisma db seed` → verify exit 0 + confirm 6 categories, 18–30 products, buyer/seller accounts via Prisma Studio or psql |
| Angular hot reload works on file change | INFRA-01 | File watch behavior across Docker volume boundary — not automatable | Edit `apps/frontend/src/app/app.component.ts` → browser at `localhost:4200` reloads within 5s |
| NestJS hot reload works on file change | INFRA-01 | Same as above for NestJS watch mode | Edit any `apps/core-api/src/*.ts` file → container logs show `Nest application successfully started` within 10s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
