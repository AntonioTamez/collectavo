---
phase: 01-infrastructure-foundation
plan: "01"
subsystem: infra
tags: [docker, docker-compose, nestjs, angular, postgres, prisma]

requires: []

provides:
  - "docker-compose.yml: 4-service orchestration (postgres:17-alpine, core-api:3001, bff:3000, frontend:4200) on collectavo_net bridge network"
  - "apps/frontend/: Angular 20 standalone scaffold with bootstrapApplication, RouterOutlet, provideHttpClient(withFetch)"
  - "apps/bff/: minimal NestJS 11 AppModule scaffold, boot on PORT 3000"
  - "apps/core-api/: minimal NestJS 11 AppModule scaffold, boot on PORT 3001, Prisma 7 packages declared"
  - ".env.example: committed placeholder credentials template"
  - ".gitignore: excludes .env, generated client, node_modules, dist"
  - "README.md: developer setup guide with migration and seed steps"

affects:
  - "01-02: PrismaService and DatabaseModule depend on core-api scaffold and package.json"
  - "01-03: Seed data plan depends on core-api scaffold"
  - "All backend plans: depend on docker-compose.yml service names (postgres, core-api, bff)"

tech-stack:
  added:
    - "node:22-alpine (Docker base image for all three apps)"
    - "postgres:17-alpine (Docker image)"
    - "@nestjs/core@11.1.21, @nestjs/common@11.1.21, @nestjs/platform-express@11.1.21"
    - "@nestjs/config@4.0.4"
    - "@prisma/client@7.8.0, @prisma/adapter-pg@7.8.0, pg@8.20.0 (core-api dependencies)"
    - "prisma@7.8.0, @nestjs/testing@11.1.21, tsx@4.22.1 (core-api devDependencies)"
    - "@angular/core@^20.0.0 and Angular Material ^20.0.0 (frontend)"
  patterns:
    - "Anonymous node_modules volume pattern: bind mount then /app/node_modules on separate lines (prevents Windows host override)"
    - "CHOKIDAR_USEPOLLING + WATCHPACK_POLLING + --poll=500 for Windows hot reload"
    - "depends_on with condition: service_healthy on postgres for core-api (pg_isready healthcheck)"
    - "Standalone Angular components with bootstrapApplication (no NgModules)"
    - "@db/* tsconfig path alias for Prisma generated client at src/generated/prisma/*"

key-files:
  created:
    - "docker-compose.yml"
    - ".env.example"
    - ".gitignore"
    - "README.md"
    - "apps/frontend/Dockerfile.dev"
    - "apps/frontend/package.json"
    - "apps/frontend/angular.json"
    - "apps/frontend/tsconfig.json"
    - "apps/frontend/src/index.html"
    - "apps/frontend/src/main.ts"
    - "apps/frontend/src/app/app.component.ts"
    - "apps/frontend/src/app/app.routes.ts"
    - "apps/bff/Dockerfile.dev"
    - "apps/bff/package.json"
    - "apps/bff/tsconfig.json"
    - "apps/bff/src/main.ts"
    - "apps/bff/src/app.module.ts"
    - "apps/core-api/Dockerfile.dev"
    - "apps/core-api/package.json"
    - "apps/core-api/tsconfig.json"
    - "apps/core-api/src/main.ts"
    - "apps/core-api/src/app.module.ts"
  modified: []

key-decisions:
  - "apps/ subdirectory structure with fully independent package.json per app (no npm workspaces at root)"
  - "Single docker-compose.yml at repo root — no base + override split for v1"
  - "@prisma/adapter-pg@7.8.0 in core-api dependencies (not devDependencies) — required runtime dep for Prisma 7 driver adapter"
  - "prisma migrate dev is a manual step after docker compose up — not automated in entrypoint (D-12)"
  - "Angular scaffold uses provideAnimationsAsync (lazy) rather than provideAnimations (eager)"

patterns-established:
  - "NestJS apps: emitDecoratorMetadata: true, commonjs module in tsconfig.json"
  - "Angular: standalone-only pattern, bootstrapApplication, no NgModules"
  - "Docker: anonymous /app/node_modules volume on every app service to protect Linux node_modules from Windows host bind mount"

requirements-completed:
  - INFRA-01

duration: 6min
completed: "2026-05-18"
---

# Phase 1 Plan 01: App Scaffolds + Docker Compose + Root Config Files Summary

**docker-compose.yml wiring 4 services (postgres:17-alpine + NestJS BFF:3000 + NestJS Core API:3001 + Angular:4200) on collectavo_net, with three minimal app scaffolds containing Dockerfile.dev, package.json, tsconfig.json, and boot source files**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-18T01:13:35Z
- **Completed:** 2026-05-18T01:19:30Z
- **Tasks:** 2/2
- **Files modified:** 22

## Accomplishments

- docker-compose.yml orchestrates all 4 services with healthchecks, anonymous node_modules volumes, Windows polling env vars, and JWT secret env vars in BFF ready for Phase 2 auth
- Three app scaffolds created with correct Dockerfile.dev patterns, package.json dependencies (including Prisma 7 adapter-pg in core-api runtime deps), and tsconfig.json with emitDecoratorMetadata: true on NestJS apps
- .env.example committed with placeholder credentials and seeded dev account docs; .gitignore excludes .env and generated Prisma client; README.md provides full developer onboarding guide

## Task Commits

Each task was committed atomically:

1. **Task 1: Docker Compose + root config files** - `e1808cb` (feat)
2. **Task 2: Three-app directory scaffolds (frontend, bff, core-api)** - `5bca0f9` (feat)

## Files Created/Modified

- `docker-compose.yml` - 4-service orchestration with collectavo_net, postgres_data volume, anonymous node_modules volumes, health checks, JWT env vars
- `.env.example` - placeholder credentials template with dev account documentation
- `.gitignore` - excludes .env, apps/core-api/src/generated/, apps/*/node_modules/, apps/*/dist/
- `README.md` - developer setup guide: prerequisites, env copy, docker compose up, migrate, seed, URLs, hot reload notes
- `apps/frontend/Dockerfile.dev` - node:22-alpine, npm ci, EXPOSE 4200, CMD with --host=0.0.0.0 --poll=500
- `apps/frontend/package.json` - Angular 20 deps + @angular/material, ng serve start script
- `apps/frontend/angular.json` - @angular-devkit/build-angular:application builder
- `apps/frontend/tsconfig.json` - ES2022, experimentalDecorators, strictTemplates
- `apps/frontend/src/index.html` - standard Angular shell with app-root
- `apps/frontend/src/main.ts` - bootstrapApplication with provideRouter, provideAnimationsAsync, provideHttpClient(withFetch)
- `apps/frontend/src/app/app.component.ts` - minimal standalone AppComponent with RouterOutlet
- `apps/frontend/src/app/app.routes.ts` - empty Routes array
- `apps/bff/Dockerfile.dev` - node:22-alpine, npm ci, EXPOSE 3000, CMD npm run start:dev
- `apps/bff/package.json` - NestJS 11.1.21 deps, nest start --watch script
- `apps/bff/tsconfig.json` - commonjs, emitDecoratorMetadata: true
- `apps/bff/src/main.ts` - NestJS bootstrap on PORT 3000
- `apps/bff/src/app.module.ts` - empty AppModule
- `apps/core-api/Dockerfile.dev` - node:22-alpine, npm ci, EXPOSE 3001, CMD npm run start:dev
- `apps/core-api/package.json` - NestJS 11 + @prisma/adapter-pg@7.8.0 in deps, prisma@7.8.0 + @nestjs/testing + tsx in devDeps
- `apps/core-api/tsconfig.json` - commonjs, emitDecoratorMetadata: true, @db/* path alias
- `apps/core-api/src/main.ts` - NestJS bootstrap on PORT 3001
- `apps/core-api/src/app.module.ts` - empty AppModule (DatabaseModule added in Plan 02)

## Decisions Made

- `@prisma/adapter-pg@7.8.0` placed in runtime `dependencies` (not devDependencies) because Prisma 7 requires the driver adapter at runtime — it is not a build-only tool
- Angular scaffold uses `provideAnimationsAsync` (lazy-loaded animation engine) per Angular 20 best practices
- `apps/core-api/src/app.module.ts` intentionally has no DatabaseModule import — that is added in Plan 02 after PrismaService is created, per the plan specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Developer only needs Docker Desktop installed and `.env` copied from `.env.example`.

## Known Stubs

None — this plan creates scaffolding files only. No UI components that render data from empty sources. The Angular AppComponent renders a static `<h1>Collectavo</h1>` which is intentional minimal boot code.

## Threat Flags

No new threat surface introduced beyond what was documented in the plan's threat model (T-01-01 through T-01-SC). All documented mitigations are in place:
- T-01-01 (Information Disclosure, .env credentials): mitigated — `.env` in `.gitignore`, `.env.example` has placeholder values only
- T-01-SC (npm packages): all packages pre-audited in RESEARCH.md — all Approved

## Self-Check

Files verified:
- [x] docker-compose.yml exists and passes all acceptance criteria checks
- [x] .env.example exists with POSTGRES_USER=, JWT_ACCESS_SECRET=, seller@collectavo.dev
- [x] .gitignore contains .env and apps/core-api/src/generated/
- [x] README.md contains docker compose up, prisma migrate dev, prisma db seed, localhost:4200
- [x] apps/frontend/package.json: @angular/core ^20.0.0, scripts.start = "ng serve"
- [x] apps/bff/package.json: @nestjs/core 11.1.21, scripts.start:dev = "nest start --watch"
- [x] apps/core-api/package.json: @prisma/adapter-pg@7.8.0 in dependencies, prisma@7.8.0 in devDependencies, @nestjs/testing in devDependencies
- [x] apps/frontend/Dockerfile.dev: --host=0.0.0.0, --poll=500, EXPOSE 4200
- [x] apps/bff/Dockerfile.dev: EXPOSE 3000
- [x] apps/core-api/Dockerfile.dev: EXPOSE 3001
- [x] apps/core-api/tsconfig.json: emitDecoratorMetadata: true, @db/* path alias
- [x] apps/bff/tsconfig.json: emitDecoratorMetadata: true
- [x] apps/frontend/src/index.html: contains <app-root></app-root>
- [x] apps/frontend/src/main.ts: contains bootstrapApplication
- [x] Commits e1808cb and 5bca0f9 exist in git log

## Self-Check: PASSED

## Next Phase Readiness

Ready for Plan 02 (Prisma schema + PrismaService + DatabaseModule). The core-api scaffold has all required Prisma 7 packages declared in package.json. The tsconfig.json has the @db/* path alias configured. DatabaseModule will be added to AppModule during Plan 02 once PrismaService is implemented.

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-05-18*
