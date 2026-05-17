<!-- GSD:project-start source:PROJECT.md -->
## Project

**Collectavo**

Collectavo is a specialized collectibles marketplace platform for buyers and sellers of Funko figures, Trading Card Games (Pokémon, One Piece, Yu-Gi-Oh), anime figures, manga, limited edition collectibles, and retro video game items. It supports both direct sales and auction-based sales. The platform is structured as three independent projects: an Angular 20 frontend, a NestJS reverse proxy/BFF, and a NestJS core API.

**Core Value:** Buyers can discover, browse, and purchase collectibles from verified sellers — the marketplace listing experience must work end-to-end before anything else.

### Constraints

- **Tech Stack**: Angular 20 + Angular Material (frontend); NestJS (BFF and Core API); PostgreSQL + Prisma (database) — all pre-decided, no alternatives
- **Architecture**: Clean Architecture + Hexagonal + DDD-inspired in the Core API — cannot be compromised for speed
- **Solo Developer**: Phases must be independently completable; no parallel workstreams assumed
- **Real Product**: Security, validation, and error handling must be production-grade from the start — not retrofitted
- **Foundation First**: v1 milestone ends when the marketplace listing flow works end-to-end (browse → product detail → seller dashboard) without payments or auctions
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Versions Summary
| Package | Version | Source |
|---------|---------|--------|
| `@angular/core` | 20.3.21 | npm registry |
| `@angular/material` | 20.x | npm registry (tracks Angular) |
| `@nestjs/core` | 11.1.21 | npm registry |
| `@nestjs/jwt` | 11.0.2 | npm registry |
| `@nestjs/passport` | 11.0.5 | npm registry |
| `@nestjs/swagger` | 11.4.3 | npm registry |
| `@nestjs/throttler` | 6.5.0 | npm registry |
| `@nestjs/config` | 4.0.4 | npm registry |
| `prisma` / `@prisma/client` | 7.8.0 | npm registry |
| `http-proxy-middleware` | 4.0.0 | npm registry |
| `class-validator` | 0.15.1 | npm registry |
| `class-transformer` | 0.5.1 | npm registry |
| `passport` | 0.7.0 | npm registry |
| `passport-jwt` | 4.0.1 | npm registry |
| `jsonwebtoken` | 9.0.3 | npm registry |
| `cookie-parser` | 1.4.7 | npm registry |
## 1. Angular 20 Frontend
### Core Approach: Signals-First, Standalone-Only
| API | Status in v20 | Use For |
|-----|--------------|---------|
| `signal()` | Stable | Mutable local state |
| `computed()` | Stable | Derived state (lazy, memoized) |
| `effect()` | Stable | Side effects (logging, sync to storage) |
| `linkedSignal()` | Stable | Writable signal derived from another signal |
| `toSignal()` | Stable | Converting Observables to signals |
| `input()` | Stable | Component inputs (replaces `@Input`) |
| `output()` | Stable | Component outputs (replaces `@Output`) |
| `model()` | Stable | Two-way binding (replaces `[(ngModel)]`) |
| `@if`, `@for`, `@switch` | Stable | Control flow in templates |
| `resource()` / `httpResource()` | **Experimental** | Async signal-based fetching — do NOT use in v1 |
| Zoneless (`provideZonelessChangeDetection`) | Developer Preview | Do NOT use in v1 — not production-safe |
### Signal Patterns
### Component Architecture Pattern
- **Container components** — hold signals, inject services, pass data to presentational children
- **Presentational components** — pure UI, all state via `input()`, events via `output()`
### Standalone Routing
### Angular Material 3 Setup
## 2. NestJS Core API — Clean + Hexagonal Architecture + DDD
### Why This Structure
### Folder Layout
### Domain Entity Pattern
### Repository Port + Adapter Pattern
### Use Case Pattern
### NestJS 11 Specifics
- **Version:** 11.1.21 (current). Requires Node.js 20+.
- **Express v5 wildcards:** Routes with `*` must use named params: `@Get('*splat')` not `@Get('*')`.
- **Module key change:** Dynamic modules imported multiple times are now separate instances (not merged). This is intentional — design dynamic module factories carefully.
- **JSON logging:** `new ConsoleLogger({ json: true })` for structured logs in production.
- **CacheModule:** Now depends on `cache-manager` v6 (uses `Keyv` internally) — not needed for v1 but note for Redis caching milestone.
### Validation Pipeline (Global)
### Swagger / OpenAPI
## 3. PostgreSQL + Prisma ORM
### Why Prisma 7 over TypeORM / Drizzle
- **Type safety:** Prisma generates a fully typed client from the schema. No runtime type mismatches.
- **Migration-first workflow:** `prisma migrate dev` generates SQL migration files that are committed to source control — reproducible, reviewable, reversible.
- **TypeScript engine (v7):** Prisma 7 replaces the Rust query engine with a TypeScript implementation. Faster cold starts, smaller Docker images, no native binary distribution headaches.
- **NOT Drizzle:** Drizzle is excellent but schema-in-code means the migration story is less mature. For a solo developer building a marketplace with a complex relational schema, Prisma's declarative migrations are lower cognitive overhead.
- **NOT TypeORM:** TypeORM's decorator-based approach conflicts with Clean Architecture — it bleeds ORM concerns into domain entities.
### PrismaService Pattern in NestJS
### Schema Patterns for a Marketplace
### Migration Workflow
# Development — generates migration file + applies it + regenerates client
# Production / CI — applies pending migrations only, no schema prompt
# Inspect without applying
# Regenerate client after schema change
# Visual inspection
### Persistence Mapper Pattern
## 4. JWT Authentication Pattern
### Token Architecture
| Token | Location | TTL | Purpose |
|-------|----------|-----|---------|
| Access token | `Authorization: Bearer` header | 15 minutes | Authenticate API requests |
| Refresh token | `HttpOnly; Secure; SameSite=Strict` cookie | 30 days | Obtain new access tokens without re-login |
### Required Packages
### Implementation Structure
### Controller Endpoints
### Token Rotation
### Cookie and CORS Setup
## 5. NestJS BFF as API Gateway
### What the BFF Does
### Proxying with http-proxy-middleware 4.0.0
### Rate Limiting with @nestjs/throttler 6.5.0
### BFF-Level Auth Handling
## 6. Docker Compose Multi-Service Setup
### Service Architecture
### docker-compose.yml
### Dockerfile (NestJS dev)
# Dockerfile.dev — hot reload for development
# Copy package files first for Docker layer caching
# Source is volume-mounted; this layer is for the node_modules cache
### .env file (not committed)
# .env
### Key Docker Patterns
- **`depends_on` with `condition: service_healthy`** on `core-api` → `postgres`: ensures Prisma's first connection doesn't fail because Postgres isn't accepting connections yet.
- **`/app/node_modules` anonymous volume**: prevents the host `node_modules` from overwriting the container's `node_modules` (critical on Windows with different path separators).
- **`CHOKIDAR_USEPOLLING=true`** in frontend: Angular's webpack dev server file watching requires polling in Docker on Windows/WSL2.
- **No Redis in v1**: Docker Compose stub is commented out. Add in Milestone 2 when rate-limit store or caching is needed.
## What NOT to Use
| Package / Pattern | Why to Avoid | Use Instead |
|------------------|-------------|-------------|
| `NgModules` (Angular) | Deprecated mental model; standalone is v20 default | Standalone components with direct imports |
| `@Input()` / `@Output()` decorators | Still works but signal-based `input()`/`output()` is the v20 way | `input()`, `output()`, `model()` |
| `resource()` / `httpResource()` | Experimental in v20 — breaking changes expected | `HttpClient` + `toSignal()` for v1 |
| Zoneless (`provideZonelessChangeDetection`) | Developer Preview — not production-safe | Default Zone.js for v1 |
| `TypeORM` | Decorators on entities bleed ORM into domain; Active Record conflicts with Clean Arch | Prisma with mapper pattern |
| `Drizzle ORM` | Schema-in-code migration story less mature | Prisma |
| `mongoose` / MongoDB | Project specifies PostgreSQL relational schema | PostgreSQL + Prisma |
| `prisma db push` | Bypasses migration history; unsafe for production | `prisma migrate dev` / `prisma migrate deploy` |
| `@nestjs/graphql` | No GraphQL requirement; adds complexity | REST + OpenAPI |
| `@nestjs/microservices` | Overkill for 3-service internal architecture | Direct HTTP via proxy |
| Class-based route guards (Angular) | Deprecated; less composable | Functional guards (`CanActivateFn`) |
| `localStorage` for refresh tokens | Accessible to JavaScript; XSS risk | `httpOnly` cookie |
| `localStorage` for access tokens | Not inherently wrong but adds CSRF risk if not handled carefully | Memory (JS variable) or cookie |
## Installation Commands
### Angular Frontend
### NestJS BFF + Core API (each project separately)
### Core API — Additional Database Deps
## Sources
- [Angular v20 Official Signals Docs](https://angular.dev/guide/signals) — HIGH confidence
- [Announcing Angular v20](https://www.grazitti.com/blog/whats-new-in-angular-20-signals-zoneless-and-smarter-ssr/) — MEDIUM confidence
- [Angular 20 Stable Signals & Zoneless](https://medium.com/ng-guide/angular-20-stable-signals-zoneless-and-more-68fbd094a521) — MEDIUM confidence
- [Angular Component input() docs](https://angular.dev/guide/components/inputs) — HIGH confidence
- [Announcing NestJS 11](https://trilon.io/blog/announcing-nestjs-11-whats-new) — HIGH confidence
- [NestJS Rate Limiting Docs](https://docs.nestjs.com/security/rate-limiting) — HIGH confidence
- [NestJS JWT Refresh via httpOnly Cookie](https://dev.to/zenstok/part-33-how-to-implement-refresh-tokens-through-http-only-cookie-in-nestjs-and-react-265e) — MEDIUM confidence
- [Domain-Driven Hexagon Repository](https://github.com/Sairyss/domain-driven-hexagon) — HIGH confidence
- [Hexagonal Architecture in NestJS](https://medium.com/@lamjed.gaidi070/hexagonal-onion-and-clean-architecture-in-nestjs-c58b526d9f3f) — MEDIUM confidence
- [http-proxy-middleware in NestJS](https://medium.com/@benjannetahmed.03/using-http-proxy-middleware-in-nestjs-a-complete-guide-3b73dd777ab5) — MEDIUM confidence
- [Prisma Relations Docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) — HIGH confidence
- [Prisma 6 Performance Features](https://www.prisma.io/blog/prisma-6-better-performance-more-flexibility-and-type-safe-sql) — HIGH confidence
- [NestJS Docker Compose + Postgres](https://www.tomray.dev/nestjs-docker-compose-postgres) — MEDIUM confidence
- [Dockerize NestJS + Postgres + Redis](https://dev.to/manuchehr/dockerize-secure-nestjs-app-with-postgres-redis-56md) — MEDIUM confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
