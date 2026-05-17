# Domain Pitfalls

**Domain:** Collectibles Marketplace — Angular 20 + NestJS BFF + NestJS Core API + PostgreSQL/Prisma
**Researched:** 2026-05-16
**Stack scope:** Three-project split (Angular 20 | NestJS BFF | NestJS Core API + Prisma + PostgreSQL)

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or fundamental data integrity failures.

---

### Pitfall 1: Refresh Token Non-Rotation (Silent Replay Attack Window)

**What goes wrong:** Refresh tokens are issued once and never replaced. A leaked refresh token gives an attacker an indefinitely-valid credential because nothing changes on the server when a legitimate user re-authenticates. The legitimate user and the attacker hold the same valid token simultaneously.

**Why it happens:** Rotation adds a round-trip of DB state management that devs skip when wiring up the happy path. The auth flow "works" without it, so the gap persists.

**Consequences:**
- A stolen refresh token from localStorage, network sniff, or log leak remains valid until explicit logout
- No signal to detect the theft: both users present valid tokens

**Prevention:**
1. Every `/auth/refresh` call issues a **new** refresh token and immediately invalidates the old one
2. Store refresh tokens hashed (bcrypt) in the database — never the raw token
3. If a refresh token that was already rotated is presented again, this is a reuse attack: invalidate the entire token family and force re-login
4. Add a cron job to purge expired token rows — otherwise the revocation table grows unbounded

**Warning signs:**
- `/auth/refresh` endpoint exists but no DB write occurs on every call
- Refresh tokens stored as plain text in the `refreshToken` column
- No `tokenFamily` or equivalent concept in the schema

**Phase:** Authentication phase (Phase 1 foundation). Get this right before any other auth work.

---

### Pitfall 2: Storing Refresh Tokens in localStorage (XSS-Exposed Storage)

**What goes wrong:** The Angular frontend stores the refresh token in `localStorage` or `sessionStorage`. Any XSS vulnerability — including third-party script injection — can read and exfiltrate the full token.

**Why it happens:** It is the simplest storage option and many tutorials use it.

**Consequences:**
- Full account takeover via XSS with no other precondition
- Refresh tokens are long-lived, so the attack window is wide

**Prevention:**
1. Refresh tokens go in `HttpOnly; Secure; SameSite=Strict` cookies — JavaScript cannot read them
2. Access tokens (short-lived, 15 min) can live in memory only (Angular service state/signal), never in storage
3. The BFF must be configured with `cookie-parser` and CORS `credentials: true` — without both, cookies will silently not send
4. Angular must send `withCredentials: true` on every request — wire this once in an HTTP interceptor

**Warning signs:**
- `localStorage.setItem('refreshToken', ...)` anywhere in the Angular codebase
- CORS not configured with `credentials: true` on the BFF
- `withCredentials` not set in Angular's `HttpClient` interceptor

**Phase:** Authentication phase. Cookie plumbing must be established before login/register are wired end-to-end.

---

### Pitfall 3: NestJS Clean Architecture Layer Violation — Prisma Entity Leaking into Domain

**What goes wrong:** The Prisma-generated type (e.g., `Prisma.Product`) is used directly as the domain entity. Service methods return Prisma types, use cases accept Prisma types, and the domain layer has an implicit import of `@prisma/client`.

**Why it happens:** The NestJS tutorial ecosystem normalizes using the ORM type as the application's primary domain object. It saves a mapping step. It works until it doesn't.

**Consequences:**
- Domain layer cannot be unit-tested without a database
- Every Prisma schema migration potentially breaks domain logic
- Collectibles-specific invariants (e.g., "a Listing in `ACTIVE` state must have `price > 0`") cannot be enforced — domain objects are passive bags of data (anemic domain model anti-pattern)
- The architecture becomes a CRUD wrapper, not a domain model — defeating the stated Clean Architecture goal

**Prevention:**
1. Maintain **two separate type layers**: a Prisma persistence model and a pure TypeScript domain entity with no framework imports
2. Write an explicit mapper in the repository adapter: `toDomain(prismaRecord) → DomainEntity` and `toPersistence(domainEntity) → PrismaInput`
3. Domain entities enforce invariants via methods, not plain setters: `listing.activate()` throws if preconditions fail; `listing.status = 'ACTIVE'` should not compile
4. Use Value Objects for domain-specific types: `Price`, `Condition`, `RarityTier` — not raw `number` and `string`
5. Domain layer has zero imports from `@prisma/client`, `@nestjs/*`, or any infrastructure package — enforce with ESLint rules or import boundary linting

**Warning signs:**
- `import { Product } from '@prisma/client'` anywhere in `src/domain/`
- Domain entity classes decorated with `@Entity()` or `@Column()`
- Service method signatures like `updateListing(data: Prisma.ListingUpdateInput)`
- All business logic lives in `*.service.ts` with entity classes that are purely `interface`-like

**Phase:** Core API scaffolding phase (Phase 1). The folder structure and layer contracts must be established before any feature work — retrofitting this later requires a full rewrite.

---

### Pitfall 4: Prisma N+1 Queries on Listing Catalog Pages

**What goes wrong:** A browse-listings query fetches 50 listings, then for each listing makes a separate query to fetch the seller profile, category, and image URLs. 50 listings produce 150+ database round-trips.

**Why it happens:** Code like `listings.map(l => prisma.user.findUnique({ where: { id: l.sellerId } }))` inside a loop is trivially easy to write and invisible until load.

**Consequences:**
- Catalog page latency grows linearly with page size
- Database connection pool exhaustion under light concurrent load
- Invisible in development (small datasets, no concurrency)

**Prevention:**
1. Always use `include` or `select` with relations in the initial query: `prisma.listing.findMany({ include: { seller: true, images: true, category: true } })`
2. Add `select` to limit fetched columns — fetching full records when only `id`, `title`, `price`, and `thumbnailUrl` are needed wastes bandwidth and memory
3. Use `EXPLAIN ANALYZE` on every non-trivial query during development
4. Add database query logging in the Prisma client during development: `log: ['query']` in `PrismaClient` constructor

**Warning signs:**
- `prisma.*.findUnique` calls inside `.map()` or a loop
- Listing page load time that scales with page size
- Prisma query log showing N queries for a single API request

**Phase:** Core API data layer phase. Index strategy and include patterns must be established as part of schema design, not retrofitted.

---

### Pitfall 5: Missing Database Indexes on High-Traffic Query Paths

**What goes wrong:** The schema has correct relations but no `@@index` directives. Full table scans execute on every search, filter, and sort operation. Fine with 100 rows; slow with 10,000; broken with 1,000,000.

**Why it happens:** Prisma does not auto-add indexes on foreign key fields (unlike some ORMs). The schema compiles and migrations run successfully without them.

**Consequences:**
- Catalog filter queries (`WHERE categoryId = ? AND condition = ? ORDER BY price`) do full table scans
- Full-text search without a GIN index degrades to `LIKE '%term%'` scans
- No visible error — just latency that appears "suddenly" at scale

**Prevention — minimum index set for this schema:**
```
Listing: @@index([categoryId])         -- category filter
Listing: @@index([sellerId])           -- seller dashboard queries
Listing: @@index([status])             -- active vs. draft filter
Listing: @@index([listingType])        -- buy-now vs. auction filter
Listing: @@index([price])              -- price range filter
Listing: @@index([createdAt])          -- newest-first sort
Listing: @@index([status, categoryId]) -- composite for browse page
User:    @@index([email])              -- auth lookup
RefreshToken: @@index([userId])        -- token validation
RefreshToken: @@index([hashedToken])   -- token lookup
```

For full-text search, create a PostgreSQL GIN index via raw SQL migration — Prisma does not model this natively:
```sql
CREATE INDEX listing_search_idx ON "Listing" USING gin(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);
```

**Warning signs:**
- `@@index` absent from `Listing` model in schema.prisma
- Full-text search implemented as `contains: term` in Prisma (which generates `LIKE '%term%'`)
- No raw SQL migration files for GIN indexes

**Phase:** Database schema phase (before any seeding or feature work).

---

### Pitfall 6: Enum for Categories Instead of Category Relation Table

**What goes wrong:** Product categories (`FUNKO`, `TCG`, `ANIME_FIGURES`, etc.) are modeled as a Prisma enum. Adding a new category requires a database migration and a code deployment. The schema cannot store per-category metadata (e.g., different filter attributes for TCG vs. Retro Games).

**Why it happens:** Enums look clean and are quick to implement. For six known categories they seem sufficient.

**Consequences:**
- Adding a subcategory (e.g., `TCG_POKEMON`, `TCG_ONE_PIECE`) requires a migration
- Category-specific attributes (e.g., "Set name" for TCG, "Scale" for anime figures) cannot be stored without a parallel `Json` field workaround
- Filtering by category is a string comparison instead of a foreign key lookup — no relational integrity

**Prevention:**
1. Model categories as a `Category` table with `id`, `name`, `slug`, `parentId` (for subcategories), and a `metadata` JSON field for category-specific filter schemas
2. `Listing` has a `categoryId` FK to `Category`
3. Seed the six initial categories; new categories are data changes, not schema migrations
4. Use enums only for **state machines** (e.g., `ListingStatus`, `ConditionGrade`, `RarityTier`) — values that change meaning in code, not just data

**Warning signs:**
- `enum Category { FUNKO TCG ANIME_FIGURES ... }` in schema.prisma
- No `Category` model in the schema

**Phase:** Database schema phase (Milestone 1 foundation). This is non-trivially difficult to migrate later once listings data exists.

---

### Pitfall 7: BFF Becoming a Fat Middleware (Business Logic in the Gateway)

**What goes wrong:** The BFF starts implementing business rules: validating listing data, computing derived fields, enforcing category-specific constraints. It grows to duplicate logic that belongs in the Core API. The BFF becomes a second application with its own domain layer.

**Why it happens:** The Angular frontend has an immediate need (e.g., "transform the response for the UI"). The BFF is the nearest backend, so the logic lands there. Each small addition seems reasonable.

**Consequences:**
- Business rules exist in two places; they diverge silently
- The Core API cannot be used by any other client (mobile, CLI, third-party) without missing the business logic in the BFF
- The BFF becomes a deployment bottleneck — every business rule change requires a BFF release

**Prevention — BFF responsibility boundary (strictly):**
```
BFF OWNS:                           CORE API OWNS:
- JWT cookie extraction             - Business rule validation
- Token forwarding as Bearer        - Domain logic
- Request authentication            - Data integrity
- Rate limiting                     - Authorization decisions
- Response shape transformation     - Pricing calculations
  for Angular UI concerns           - Inventory management
- Aggregating multiple API calls    - Search logic
  into one UI-optimized response
```

**Warning signs:**
- `if (category === 'TCG')` logic in a BFF service
- Prisma imported in the BFF project
- BFF services growing beyond 100 lines with non-HTTP logic

**Phase:** BFF project scaffolding phase. Establish the responsibility boundary in the architecture doc before writing a single line of BFF service logic.

---

### Pitfall 8: Authentication Guard Coverage Gaps — Unprotected Routes

**What goes wrong:** The team uses NestJS guards for authentication but applies them inconsistently: some controllers have `@UseGuards(JwtAuthGuard)`, others forget it. Public routes need no guard but developer forgets to add `@Public()` metadata, so they require auth unintentionally. Controller-level guard is set but a specific method override is not noticed.

**Why it happens:** Guards applied per-controller (opt-in) are easy to forget. Guards applied globally (opt-out via `@Public()`) break public routes if the decorator is omitted.

**Consequences:**
- Sensitive routes (seller dashboard, order history) accessible without authentication
- Public routes (catalog browse, product detail) accidentally return 401 to anonymous visitors
- Privilege escalation: a Buyer-role user calls a Seller-only endpoint that lacks a role guard

**Prevention:**
1. Apply `JwtAuthGuard` as a **global guard** via `APP_GUARD` provider, not per-controller
2. Mark every intentionally public route with a `@Public()` custom decorator that the global guard checks via `Reflector`
3. Apply a second global `RolesGuard` (also via `APP_GUARD`) that checks the `@Roles()` decorator
4. Write a test that enumerates all registered routes and asserts that every route either has `@Public()` or has explicit role metadata — catches coverage gaps in CI
5. Never check ownership in the guard (e.g., "is this the seller's own listing?") — that belongs in the use case/service layer

**Warning signs:**
- `@UseGuards(JwtAuthGuard)` scattered on some controllers but absent from others
- No `@Public()` decorator pattern in the codebase
- Seller endpoint tests that pass without a valid JWT

**Phase:** Core API auth phase (Phase 1). Global guard setup is a foundation decision; retrofitting changes guard ordering and breaks existing routes.

---

### Pitfall 9: BFF–Core API Auth Token Forwarding Failure

**What goes wrong:** The BFF extracts the JWT from the `HttpOnly` cookie (correctly) but either:
(a) fails to forward it as a `Authorization: Bearer <token>` header to the Core API, or
(b) re-validates the token in the BFF instead of trusting the Core API to validate it

Result: the Core API receives unauthenticated requests and either rejects them (broken app) or is misconfigured to skip auth (security hole).

**Why it happens:** The BFF-to-Core-API communication is internal and developers sometimes treat it as "already authenticated" without threading the token through.

**Consequences:**
- Core API cannot identify the requesting user → RBAC checks fail or are skipped
- Ownership checks in the Core API (e.g., "is this seller editing their own listing?") have no user context

**Prevention:**
1. The BFF must extract the access token from the cookie and attach it as `Authorization: Bearer <token>` on every proxied request to the Core API
2. The Core API validates the JWT on every request — it does not trust that "requests from BFF are already authenticated"
3. BFF has its own `JwtStrategy` only for the cookie→token extraction step; Core API has its own `JwtStrategy` for full validation
4. In Docker Compose, the Core API must be configured to **not** be exposed on the host network — only the BFF can reach it

**Warning signs:**
- `Authorization` header absent from Core API requests in network logs
- Core API `JwtAuthGuard` returning 401 on all BFF-proxied requests
- Core API port exposed directly in `docker-compose.yml` alongside BFF port

**Phase:** BFF project and auth phase. Must be established before any end-to-end auth testing.

---

### Pitfall 10: Race Condition on Inventory Decrement (Milestone 2 Preview)

**What goes wrong:** Two buyers simultaneously purchase the last unit of a listing. Both read `quantity = 1`, both check `quantity > 0`, both decrement. Final quantity: `-1`. Oversell occurs.

**Why it happens:** The check-then-act sequence is not atomic. Standard Prisma `update` does not lock the row between read and write.

**Consequences:**
- Products sold to multiple buyers when only one unit exists
- Data integrity failure that is difficult to detect and impossible to automatically recover

**Prevention (for Milestone 2 when inventory is transactional):**
1. Use Prisma atomic decrement with a conditional constraint:
   ```typescript
   await prisma.listing.updateMany({
     where: { id: listingId, quantity: { gt: 0 } },
     data: { quantity: { decrement: 1 } }
   });
   // Check affected count; if 0, the purchase fails
   ```
2. Alternatively, use `SELECT FOR UPDATE` in an interactive transaction to lock the row before checking
3. Add a database-level check constraint: `quantity >= 0` — the DB is the last line of defense
4. For auction bids (Milestone 2), use `SELECT FOR UPDATE` or PostgreSQL advisory locks on the auction row — optimistic locking with a version column works for low-concurrency auctions but burns retries under high contention

**Warning signs:**
- `findUnique` followed by `update` without a transaction or atomic operator
- No `@@check` or database constraint on quantity
- Missing transaction wrapping on purchase flow

**Phase:** Inventory and purchase flow phase (Milestone 2). Note for Milestone 1: establish the `quantity` field with a `@@check` DB constraint from day one, even if purchase logic comes later.

---

## Moderate Pitfalls

Mistakes that cause significant rework but not security breaches.

---

### Pitfall 11: Angular Signals — Writing to Signals Inside `effect()`

**What goes wrong:** A developer writes to a signal from within an `effect()` that also reads that signal, creating an infinite re-execution cycle. Angular has cycle detection but the protection is a runtime error, not a compile error.

**Prevention:**
1. Rule: `computed()` for derived state, `effect()` for side effects to external systems (localStorage, WebSocket, analytics)
2. Never write to a signal inside an `effect()` unless using `untracked()` to break the dependency
3. Never use `effect()` to propagate state changes between signals — use `computed()` instead
4. `effect()` valid use cases: syncing to `localStorage`, opening/closing a WebSocket, logging analytics events

**Warning signs:**
- `effect(() => { this.someSignal.set(this.otherSignal()); })`
- `ExpressionChangedAfterItHasBeenChecked` errors in the console
- Console error: "Detected cycle in computations"

**Phase:** Frontend state management phase.

---

### Pitfall 12: Angular `httpResource` Used for Mutations

**What goes wrong:** `httpResource` (Angular 20's new signal-based HTTP API) is used for POST/PUT/DELETE operations. The API is designed for reads and will re-trigger on signal dependency changes — not on user actions.

**Prevention:**
1. `httpResource` is read-only: use it for GET requests that should re-fetch when filter signals change (e.g., catalog with category/price filters)
2. Mutations (create listing, place bid, update profile) use `HttpClient` directly
3. Calling `resource.value()` when the resource is in an error state throws at runtime — always check `resource.status()` first

**Warning signs:**
- `httpResource(() => ({ url: '/api/listings', method: 'POST', body: ... }))`
- No null/error state guard before `resource.value()` calls

**Phase:** Frontend data layer phase.

---

### Pitfall 13: Prisma `REQUEST` Scope Performance Trap

**What goes wrong:** The `PrismaService` is decorated with `scope: Scope.REQUEST` to make it request-scoped (common in tutorials wanting "per-request" database isolation). This causes NestJS to instantiate a new `PrismaClient` on every HTTP request, exhausting the connection pool.

**Prevention:**
1. `PrismaService` must be `SINGLETON` scope (the default) — one shared instance across the application
2. Prisma manages its own connection pool internally; request-scoped Prisma defeats this
3. For transactional context that needs to span multiple repositories in one request, pass the `prisma` transaction client explicitly rather than relying on scope

**Warning signs:**
- `@Injectable({ scope: Scope.REQUEST })` on `PrismaService`
- Database connection count climbing linearly with request rate

**Phase:** Core API scaffolding phase (database module setup).

---

### Pitfall 14: Docker Compose Dev/Prod Environment Mismatch

**What goes wrong:** The `docker-compose.yml` used for development mounts the full source tree as a volume (`volumes: - .:/app`) and runs `nest start --watch`. This configuration is shipped to production. Hot-reload processes, dev dependencies, and TypeScript source are running in production.

A second failure mode: environment variables hardcoded in `docker-compose.yml` (`DATABASE_URL=postgres://...`) are committed to version control with real credentials.

**Prevention:**
1. Use two separate Compose files: `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod override)
2. Dev: source volume mount + `nest start --watch` + Dockerfile `target: development` stage
3. Prod: no volume mounts, `CMD ["node", "dist/main"]`, only `node_modules` production deps
4. Use a multi-stage Dockerfile: `builder` stage compiles TypeScript, `production` stage copies only `dist/` and `node_modules`
5. Environment variables in `docker-compose.yml` reference `.env` files: `env_file: .env.local` — `.env.local` is gitignored
6. Core API must not be accessible on the host's external port in production — only BFF is exposed

**Warning signs:**
- `volumes: - .:/app` in the production Compose file
- `DATABASE_URL` with real credentials committed to git
- No multi-stage Dockerfile

**Phase:** Infrastructure setup phase (Phase 1). Establish before any containerized testing.

---

### Pitfall 15: Collectibles Schema — Metadata Rigidity for Multi-Category Items

**What goes wrong:** All six collectible categories are forced into a single `Listing` table with shared columns. TCG-specific fields (`setName`, `cardNumber`, `grade`) are nullable for Funko Pops, which have `series` and `exclusiveRetailer` instead. The table grows to 30+ nullable columns that are always null for most categories.

**Prevention:**
1. Model shared fields on `Listing`: `title`, `description`, `price`, `condition`, `rarity`, `quantity`, `status`, `images`
2. Store category-specific metadata in a `metadata Json` column on `Listing` — validated at the application layer per category type, not at the DB level
3. Define TypeScript discriminated union types for each category's metadata shape; validate with Zod or class-validator at the API boundary
4. This is more practical than table-per-category inheritance and more flexible than 30 nullable columns

**Warning signs:**
- `cardNumber String?`, `setName String?`, `series String?`, `exclusiveRetailer String?` all on the same `Listing` model
- No `metadata Json` field on `Listing`

**Phase:** Database schema phase. Model the metadata pattern before writing any listing CRUD.

---

## Minor Pitfalls

---

### Pitfall 16: NestJS Guard Order — Auth Before Roles Guard

**What goes wrong:** `RolesGuard` runs before `JwtAuthGuard`. The roles guard tries to read `request.user` which is not yet populated, silently passes (user is undefined, no role to check), and the route is reached without authentication.

**Prevention:** When registering global guards, registration order via `APP_GUARD` determines execution order. Register `JwtAuthGuard` first, then `RolesGuard`.

**Warning signs:** Role-restricted endpoints accessible without JWT; `request.user` undefined inside `RolesGuard`

**Phase:** Auth phase.

---

### Pitfall 17: NestJS Missing `@Public()` on Swagger / Health Endpoints

**What goes wrong:** With a global `JwtAuthGuard`, the Swagger UI (`/api/docs`) and health check (`/health`) endpoints return 401. The API appears broken to new developers and health checks fail in Docker.

**Prevention:** Mark both with `@Public()` decorator.

**Warning signs:** 401 response when navigating to `/api/docs`

**Phase:** Auth phase.

---

### Pitfall 18: Prisma Migration Drift in Docker Dev Environment

**What goes wrong:** Developer runs `prisma migrate dev` locally but forgets to rebuild the Docker image after schema changes. The containerized database is on an older schema version. Runtime errors appear that don't reproduce locally.

**Prevention:**
1. Run `prisma migrate deploy` (not `migrate dev`) as part of the Docker entrypoint or a Compose healthcheck-dependent startup
2. `prisma generate` must run as part of `npm run build` in the Dockerfile so the Prisma client is always in sync with the schema

**Warning signs:** `PrismaClientKnownRequestError` P2021 (table does not exist) inside Docker only

**Phase:** Infrastructure phase.

---

### Pitfall 19: BFF Cascading Failure — No Timeout or Circuit Breaker on Core API Calls

**What goes wrong:** The Core API becomes slow or unresponsive. The BFF's HTTP client waits indefinitely. The BFF's thread pool (or async queue) backs up. The BFF also becomes unresponsive. The Angular frontend shows a spinner until timeout.

**Prevention:**
1. Set explicit request timeouts on every BFF→Core API `HttpService` call (e.g., 5 seconds)
2. For Milestone 1, this is a lightweight fix: configure `HttpModule` with a timeout
3. For Milestone 2 and beyond: add a circuit breaker (e.g., `nestjs-circuit-breaker` or manual state tracking)
4. Return a degraded response with a 503 status, not an infinite hang

**Warning signs:** No `timeout` configuration on `HttpModule` in the BFF; no error handling on `HttpService.get().pipe()`

**Phase:** BFF project phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Auth implementation | Non-rotating refresh tokens | Implement rotation and hashing before any other auth work |
| Auth implementation | Refresh token in localStorage | HttpOnly cookie + `withCredentials: true` from day one |
| Auth implementation | Guard order (Roles before JWT) | Register guards in explicit order via APP_GUARD |
| DB schema design | Category as enum | Use Category relation table with seed data |
| DB schema design | Missing indexes | Add @@index for all FK and filter fields before seeding |
| DB schema design | Rigid multi-category columns | Use `metadata Json` field with TypeScript discriminated unions |
| Core API scaffolding | Prisma types in domain layer | Create domain entity / Prisma persistence type split before any feature |
| Core API scaffolding | REQUEST-scoped PrismaService | Confirm singleton scope before DI is wired |
| BFF scaffolding | Business logic creeping into BFF | Codify the BFF responsibility boundary in the project README |
| BFF scaffolding | Token not forwarded to Core API | Write BFF interceptor that extracts cookie → Bearer header on day one |
| Frontend state | effect() writing to signals | Use computed() for derived state; effect() only for external sync |
| Frontend state | httpResource for mutations | Mutations use HttpClient directly |
| Docker setup | Source volume mount in prod | Separate dev and prod Compose files with multi-stage Dockerfile |
| Docker setup | Credentials in docker-compose.yml | Use env_file reference to gitignored .env.local |
| Listing CRUD | N+1 on catalog queries | Always include relations in initial findMany; verify with query log |
| Purchase flow (M2) | Non-atomic inventory decrement | Use Prisma atomic decrement with conditional WHERE from day one |
| Auction system (M2) | Concurrent bid race condition | SELECT FOR UPDATE or advisory locks; version column for optimistic locking |

---

## Sources

- [Part 1/3: JWT Refresh Token Rotation in NestJS — DEV Community](https://dev.to/zenstok/how-to-implement-refresh-tokens-with-token-rotation-in-nestjs-1deg)
- [JWT Token Lifecycle: Expiration, Refresh, and Revocation — Skycloak](https://skycloak.io/blog/jwt-token-lifecycle-management-expiration-refresh-revocation-strategies/)
- [Preventing Anemic Domain Models in Hexagonal NestJS](https://coldfusion-example.blogspot.com/2026/01/preventing-anemic-domain-models-in.html)
- [Domain-Driven Hexagon — GitHub (Sairyss)](https://github.com/Sairyss/domain-driven-hexagon)
- [Prisma Indexes Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
- [Prisma Best Practices](https://www.prisma.io/docs/orm/more/best-practices)
- [How to Configure Indexes in Prisma — LogRocket](https://blog.logrocket.com/how-configure-indexes-prisma/)
- [Prisma Schema Design: Relationships, Enums, and Indexes — DEV](https://dev.to/whoffagents/prisma-schema-design-relationships-enums-and-indexes-that-scale-9gm)
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [BFF Pattern: The Dos and Don'ts — AKF Partners](https://akfpartners.com/growth-blog/backend-for-frontend)
- [5 Best Practices for Backends-for-Frontends — WunderGraph](https://wundergraph.com/blog/5-best-practices-for-backend-for-frontends)
- [Backends for Frontends Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [6 Common effect() Mistakes in Angular Signals — Medium](https://medium.com/@krunalvekariya12345/6-common-effect-mistakes-in-angular-signals-and-how-to-fix-them-7cf21b911d69)
- [Angular Signals Effect() — 90% of Developers Use It Wrong — DEV](https://dev.to/codewithrajat/angular-signals-effect-why-90-of-developers-use-it-wrong-4pl4)
- [httpResource API — Angular Official Docs](https://angular.dev/guide/http/http-resource)
- [Angular Async Reactivity with Resources — Angular Official Docs](https://angular.dev/guide/signals/resource)
- [Race Conditions in PostgreSQL — How to Deal with Them](https://dev.to/ramoncunha/how-to-deal-with-race-conditions-using-java-and-postgresql-4jk6)
- [PostgreSQL Concurrency Control — OneUptime](https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view)
- [NestJS Guards — Official Docs](https://docs.nestjs.com/guards)
- [Advanced RBAC in NestJS with Custom Permission Guard — DEV](https://dev.to/nurulislamrimon/advanced-role-based-access-control-rbac-in-nestjs-with-a-custom-permission-guard-31ah)
- [Secure Authentication in Angular + NestJS Using HttpOnly JWT Cookies](https://voiceofdev.in/secure-authentication-in-angular-nestjs-using-httponly-jwt-cookies-enterprise-pattern)
- [Dockerizing a NestJS App: Best Practices and Common Pitfalls](https://medium.com/@adnan172203/dockerizing-a-nest-js-app-my-best-practices-and-common-pitfalls-171a6112b8e2)
- [Stop Passing the Hot Potato: Prisma Transactions in NestJS — Medium](https://masoudx.medium.com/stop-passing-the-hot-potato-managing-prisma-transactions-in-nestjs-8f30eeb5bb54)
