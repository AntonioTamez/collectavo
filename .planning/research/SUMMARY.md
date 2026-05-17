# Project Research Summary

**Project:** Collectavo -- Collectibles Marketplace
**Domain:** Specialized collectibles marketplace (Funko, TCG, Anime Figures, Manga, Limited Edition, Retro Games)
**Researched:** 2026-05-16
**Confidence:** HIGH

---

## Executive Summary

Collectavo is a domain-specific marketplace with structural requirements that differentiate it from generic e-commerce. The key challenge is that each of the six collectible categories (Funko, TCG, Anime Figures, Manga, Limited Edition, Retro Games) has category-specific metadata with distinct mandatory fields, rarity scales, and condition grading vocabularies. The schema must support flexible per-category metadata while sharing a common listing core -- the correct solution is a `metadata Json` JSONB column on the Product table, not nullable columns or separate category tables. This is a non-trivial schema decision that cannot be easily retrofitted once listing data exists.

The recommended architecture is a three-project split: Angular 20 standalone signals-based frontend communicating exclusively with a NestJS BFF, which in turn proxies/aggregates to a NestJS Core API following Clean Architecture + Hexagonal + DDD patterns backed by PostgreSQL with Prisma 7. The BFF boundary is strict: it owns auth (JWT cookie extraction, token rotation, rate limiting, CORS), proxies the rest, and never implements business rules. The Core API owns all domain logic, enforces invariants through domain entities and use cases, and is never exposed publicly. Every component boundary is well-researched with verified package versions.

The primary risks are: (1) auth security gaps if refresh token rotation and httpOnly cookie patterns are not wired correctly from the start, (2) Clean Architecture layer violations if Prisma types leak into the domain layer before a proper mapper pattern is established, and (3) missing database indexes on the high-traffic listing query paths. All three are Phase 1 concerns that are costly to retrofit -- they must be solved before any feature work.

---

## Key Findings

### Recommended Stack

All versions verified against npm registry on 2026-05-16. The stack is pre-decided per PROJECT.md constraints; research focused on version confirmation, API stability, and correct integration patterns.

Angular 20 (released May 28, 2025) stabilizes all core signals primitives -- `signal()`, `computed()`, `effect()`, `input()`, `output()`, `model()`, `linkedSignal()`, and the new control flow (`@if`, `@for`, `@switch`) are all production-safe. Standalone components are the v20 default. Two APIs must be avoided in v1: `resource()`/`httpResource()` (experimental, breaking changes expected) and `provideZonelessChangeDetection()` (Developer Preview, not production-safe). NestJS 11 requires Node.js 20+ and introduces Express v5 wildcard changes (`@Get('*splat')` syntax). Prisma 7 replaces the Rust query engine with a TypeScript implementation, yielding faster cold starts and no native binary headaches.

**Core technologies:**

| Package | Version | Purpose |
|---------|---------|---------|
| @angular/core | 20.3.21 | Frontend framework, signals-first standalone components |
| @angular/material | 20.x | Material Design 3 UI components, token-based theming |
| @nestjs/core | 11.1.21 | BFF and Core API framework |
| @nestjs/jwt | 11.0.2 | JWT signing and verification |
| @nestjs/passport | 11.0.5 | Auth strategy integration (access + refresh strategies) |
| @nestjs/throttler | 6.5.0 | Rate limiting on BFF auth routes |
| @nestjs/swagger | 11.4.3 | OpenAPI documentation on BFF and Core API |
| prisma / @prisma/client | 7.8.0 | Type-safe ORM with migration-first workflow |
| http-proxy-middleware | 4.0.0 | BFF-to-Core-API proxying (requires fixRequestBody) |
| class-validator | 0.15.1 | DTO validation decorators |
| class-transformer | 0.5.1 | DTO type transformation |
| PostgreSQL | 17-alpine | Primary datastore |

**Do NOT use:**
- NgModules, @Input()/@Output() decorators, zoneless change detection -- outdated Angular patterns
- resource()/httpResource() -- experimental in v20, skip for v1
- TypeORM -- Active Record decorator pattern conflicts with Clean Architecture
- `prisma db push` -- bypasses migration history; use `migrate dev` / `migrate deploy` only
- localStorage for refresh tokens -- XSS risk; use httpOnly cookies

### Expected Features

Collectibles marketplaces have well-established feature expectations derived from TCGPlayer, Cardmarket, StockX, eBay, and MyFigureCollection. The critical differentiator from generic e-commerce is that buyers search by category-specific attributes (set name, card number, rarity for TCG; Pop number, variant, exclusive retailer for Funko) -- not just price and title.

**Must have (table stakes for v1):**
- User auth (email/password) with role separation: Buyer, Seller, Admin
- Product listing creation with per-category metadata fields
- Standardized condition grading per category (TCGPlayer NM/LP/MP/HP/DMG for cards; MIB/NMIB scale for Funko; Loose/CIB/Sealed for retro games)
- Multiple product images (4-8 per listing; condition photos are critical for trust)
- Category taxonomy (Funko, TCG, Anime Figures, Manga, Limited Edition, Retro Games)
- Full-text search + faceted filtering (category, condition, price range, rarity)
- Product detail page
- Seller dashboard (create, edit, deactivate listings, view orders)
- Basic seller public profile
- Mobile-responsive web UI
- Secure JWT auth with httpOnly refresh cookie

**Should have (competitive differentiators -- Milestone 2):**
- Auction listing type with real-time bidding (WebSockets)
- Stripe Connect payment processing
- Buyer/seller in-platform messaging
- Wishlist + price alerts
- Buyer/seller feedback and ratings system
- Best Offer / negotiated pricing
- Saved searches with alerts
- Email notifications

**Defer (post-v2):**
- Price history / market data charts
- Bulk listing / CSV import
- Collection tracking (owned vs. wanted)
- Bundle / lot listings
- Advanced seller tiers / verification badges

### Architecture Approach

The system is three independent projects with no shared npm packages in Milestone 1. Angular talks only to the BFF. The BFF owns auth, rate limiting, CORS, and error normalization; it proxies all other routes via `http-proxy-middleware` with `fixRequestBody`. The Core API implements Clean Architecture with layers organized feature-first by bounded context (auth, products, categories, sellers, search). Domain entities are pure TypeScript with zero framework imports. Repository interfaces are defined in the domain layer and implemented by Prisma adapters in infrastructure. Mappers translate between Prisma persistence models and domain entities at the repository boundary.

**Major components:**

1. **Angular 20 Frontend** -- standalone signals-based SPA; `AuthService` with `signal<AuthUser>`; functional HTTP interceptors for auth header injection and 401 retry-with-refresh; lazy-loaded feature routes; Angular Material 3 UI
2. **NestJS BFF (Port 3000)** -- JWT access token validation; refresh token rotation via httpOnly cookies; rate limiting via `@nestjs/throttler`; CORS; request/response logging; proxies `/api/*` to Core API with `X-User-Id`/`X-User-Role` header injection; never touches the database
3. **NestJS Core API (Port 3001)** -- Clean Architecture + Hexagonal; bounded-context modules; global `JwtAuthGuard` + `RolesGuard` via `APP_GUARD`; Prisma 7 with domain-entity/mapper separation; exposes /products, /categories, /auth, /sellers, /search
4. **PostgreSQL + Prisma** -- normalized schema with `metadata Json` for category-specific fields; `Category` table (not enum); `Decimal` for money fields; `@@index` on all FK and filter columns; GIN index for full-text search via raw SQL migration

**Component boundary rules (strict):**
- Frontend ONLY talks to BFF
- BFF ONLY talks to Core API (never directly to database or Redis)
- Core API ONLY talks to PostgreSQL (via Prisma) -- never exposed to public network
- Redis deferred to Milestone 2

### Critical Pitfalls

Seven pitfalls rise above the rest as Phase 1 risks that cause rewrites, security breaches, or unrecoverable data integrity failures:

1. **Refresh token non-rotation** -- Every `/auth/refresh` call must issue a new token and immediately invalidate the old one. Store bcrypt hash, never the raw token. If a rotated token is re-presented, treat it as a reuse attack and invalidate the entire token family. Establish before any other auth work.

2. **Refresh token in localStorage** -- Refresh tokens must live in `HttpOnly; Secure; SameSite=Strict` cookies only. Access tokens live in memory (Angular signal state), never in storage. BFF requires `cookie-parser` middleware and `credentials: true` on CORS. Angular interceptor must send `withCredentials: true` on every request.

3. **Prisma types leaking into domain layer** -- Domain entities must be pure TypeScript with zero `@prisma/client` imports. Write explicit `toDomain()` / `toPersistence()` mappers in repository adapters. Enforce with ESLint import boundary rules. Without this, the Clean Architecture goal is defeated and domain logic cannot be unit-tested without a live database.

4. **Category modeled as Prisma enum** -- Categories must be a `Category` table with id, name, slug, parentId (for subcategories), and metadata Json -- not `enum Category { FUNKO TCG ANIME_FIGURES ... }`. Adding or restructuring categories with an enum requires a schema migration and code deployment. Non-trivially difficult to migrate once listing data exists.

5. **Missing database indexes** -- Prisma does not auto-index foreign key fields. Before seeding any data, add `@@index` for: `categoryId`, `sellerId`, `status`, `listingType`, `price`, `createdAt` on Product; composite `(status, categoryId)`; `email` on User; `hashedToken` on RefreshToken. Add PostgreSQL GIN index for full-text search via raw SQL migration. Invisible at dev scale; catastrophic at production scale.

6. **BFF becoming a fat middleware** -- The BFF must never implement business rules, validate domain constraints, or compute derived fields. Once business logic enters the BFF, it creates a dual source of truth and prevents the Core API from being used by any other client. Codify the responsibility boundary before writing any BFF service logic.

7. **NestJS guard registration order** -- `JwtAuthGuard` must be registered before `RolesGuard` via `APP_GUARD`. If reversed, `RolesGuard` reads `request.user` before JWT guard populates it and silently passes every request. Swagger (`/api/docs`) and health (`/health`) endpoints must have `@Public()` or they return 401.

---

## Implications for Roadmap

The research reveals a clear dependency chain. Auth must precede products (sellerId comes from JWT). Products must precede catalog (browse needs data). Catalog must precede seller dashboard validation. The BFF proxy layer is thin and can be wired after each Core API layer, but cannot be integration-tested until its target endpoint exists.

### Phase 1: Infrastructure Foundation

**Rationale:** Every subsequent phase depends on the database schema and Docker environment. Schema decisions (Category table, metadata Json, indexes, RefreshToken table) are hardest to reverse once data exists. Get them right here.
**Delivers:** `docker compose up` brings up all four services; versioned Prisma schema with all core models (User, RefreshToken, Category, Product, ProductImage, SellerProfile, Order, OrderItem); PrismaService singleton; `.env` pattern established; separate dev/prod Compose files.
**Addresses:** Pitfalls 4 (category enum), 5 (missing indexes), 14 (docker dev/prod mismatch), 15 (metadata rigidity), 18 (migration drift in Docker).
**Research flag:** Standard patterns -- no additional research needed.

### Phase 2: Core API -- Authentication

**Rationale:** Authentication is a prerequisite for every protected feature. Refresh token rotation, bcrypt hashing, and guard architecture must be correct before any other backend work begins.
**Delivers:** `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` endpoints; global `JwtAuthGuard` + `RolesGuard` via `APP_GUARD`; `@Public()` + `@Roles()` decorators; token rotation with reuse detection; all endpoints testable with curl.
**Addresses:** Pitfalls 1 (token rotation), 8 (guard coverage gaps), 16 (guard order), 17 (Swagger 401).
**Research flag:** Standard patterns -- NestJS JWT + Passport + bcrypt is one of the most documented NestJS patterns.

### Phase 3: BFF -- Authentication Layer

**Rationale:** BFF auth must be established before frontend auth can be tested end-to-end. Token forwarding (cookie extraction to Bearer header injection) must be proven before it is relied on by product proxy routes.
**Delivers:** BFF proxies `/api/auth/*`; refresh token httpOnly cookie handling at BFF edge; rate limiting on auth routes (5 req/min); `X-User-Id` / `X-User-Role` header injection to Core API; request timeout configured on all Core API calls.
**Addresses:** Pitfalls 2 (localStorage), 7 (fat BFF boundary), 9 (token forwarding failure), 19 (no timeout on Core API calls).
**Research flag:** Standard patterns -- `fixRequestBody` requirement already identified; no additional research needed.

### Phase 4: Frontend -- Authentication

**Rationale:** Auth UI is the first user-facing surface. Establishing `AuthService` with signals and HTTP interceptors creates the foundation for all subsequent frontend features.
**Delivers:** Login, Register, logout flows working end-to-end (Angular to BFF to Core API); `AuthService` with `currentUser`/`isLoggedIn`/`isSeller` computed signals; `authInterceptor` (Bearer header) + `errorInterceptor` (401 retry with concurrent request queue); `authGuard` + `sellerGuard`; `tryRestoreSession()` called on app init.
**Addresses:** Pitfall 2 (withCredentials), 11 (signals in effect misuse), 12 (httpResource misuse).
**Research flag:** Standard patterns -- Angular 20 signals auth patterns fully documented in ARCHITECTURE.md.

### Phase 5: Core API -- Products and Categories

**Rationale:** The listing creation flow is the core value of Milestone 1. Products depend on auth (sellerId from JWT). Categories must be seeded before products can reference them.
**Delivers:** Category seeded with 6 categories; Product domain entity with Condition, ListingType, Status value objects; `IProductRepository` + `PrismaProductRepository`; CreateProduct, UpdateProduct, GetProduct, SearchProducts use cases; `ProductsController` with RBAC (public GET, Seller/Admin POST/PATCH/DELETE); ProductImage handling; full-text search via PostgreSQL tsvector + GIN index.
**Addresses:** Pitfall 3 (Prisma types in domain), 4 (N+1 queries -- use `include` with relations), 15 (metadata rigidity).
**Research flag:** Full-text search needs a research spike -- Prisma 7 `$executeRaw` / `$queryRaw` patterns for tsvector indexing and search queries should be verified before implementation starts.

### Phase 6: BFF -- Product and Category Proxy Routes

**Rationale:** Frontend cannot reach products until the BFF proxy routes are wired. This phase is thin (proxy + header injection) and immediately unblocks frontend catalog work.
**Delivers:** BFF proxies `/api/products/*`, `/api/categories/*`, `/api/sellers/*`; user identity forwarded via injected headers; BFF Swagger documentation updated.
**Addresses:** Pitfall 7 (BFF boundary -- proxy only, no business logic).
**Research flag:** Standard patterns -- follows identical pattern to Phase 3 proxy setup.

### Phase 7: Frontend -- Catalog and Product Pages

**Rationale:** Public-facing catalog is the primary buyer flow and validates the core value proposition.
**Delivers:** `ProductListComponent` (browse, filter by category/condition/price/rarity); `ProductDetailComponent`; `SearchResultsComponent`; `toSignal()` + `HttpClient` for data fetching (no `httpResource` in v1).
**Addresses:** Pitfalls 11, 12 (correct Angular signals patterns).
**Research flag:** Standard patterns -- Angular Material component composition.

### Phase 8: Frontend -- Seller Dashboard and Listing Management

**Rationale:** Seller dashboard completes the Milestone 1 end-to-end flow. Without it, sellers cannot create the listings that buyers browse.
**Delivers:** Seller dashboard page with listing management; `CreateProduct`/`EditProduct` forms with per-category metadata fields rendered dynamically; image upload flow; listing status lifecycle (draft to active to inactive); seller public profile page.
**Addresses:** All table stakes seller workflow features from FEATURES.md.
**Research flag:** Image upload storage backend decision required before this phase. If using cloud storage (Cloudinary/S3), a targeted 1-hour spike is recommended during Phase 5 planning to avoid rework.

### Phase Ordering Rationale

- Schema (Phase 1) is first because Category-as-table and metadata-as-JSONB cannot be changed without painful migrations once listing data exists
- Core API auth (Phase 2) precedes BFF auth (Phase 3): you cannot test BFF token forwarding until Core API validates tokens
- BFF auth (Phase 3) precedes Frontend auth (Phase 4): end-to-end testing requires all three layers present
- Products (Phase 5) precedes product proxy (Phase 6): the proxy target must exist before it can be proxied
- Catalog UI (Phase 7) precedes seller dashboard (Phase 8): completing the buyer side first validates the data model before building the seller workflow on top of it

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (full-text search):** PostgreSQL tsvector GIN index setup + Prisma 7 `$executeRaw`/`$queryRaw` syntax -- verify exact patterns for Prisma 7 before implementation starts
- **Phase 8 (image upload):** Storage backend decision (Cloudinary vs S3) and NestJS Multer integration -- 1-hour spike recommended during Phase 5 planning window

Phases with standard patterns (no research-phase needed):
- **Phases 1-4, 6-7:** Code patterns fully verified in STACK.md and ARCHITECTURE.md

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified on npm registry 2026-05-16; Angular 20 and NestJS 11 are current stable releases; breaking changes documented |
| Features | HIGH | Derived from live platform analysis (TCGPlayer, Cardmarket, StockX, eBay, MyFigureCollection); condition scales from official TCGPlayer PDF |
| Architecture | HIGH | Official docs + authoritative community sources; complete code patterns with version-specific notes; component boundary rules verified |
| Pitfalls | HIGH | Each pitfall sourced from multiple incident reports, official docs, and post-mortems; prevention strategies are specific and actionable |

**Overall confidence:** HIGH

### Gaps to Address

- **RefreshToken table missing from schema:** Neither STACK.md nor ARCHITECTURE.md includes a RefreshToken table in the Prisma schema, despite Pitfall 1 requiring bcrypt-hashed token storage with family tracking. This table must be designed and added in Phase 1 before auth work begins.

- **Condition scale mismatch:** FEATURES.md recommends TCGPlayer's 5-value NM/LP/MP/HP/DMG for TCG cards. ARCHITECTURE.md's Prisma schema uses a different 6-value enum (MINT/NEAR_MINT/EXCELLENT/GOOD/PLAYED/POOR). Recommended resolution: use the broader 6-value DB enum as canonical; display TCGPlayer terminology labels in the frontend UI and documentation.

- **BFF vs Core API port conflict:** STACK.md uses Core API port 3001; ARCHITECTURE.md uses port 4000. Standardize in Phase 1 Docker Compose. Recommendation: BFF on 3000, Core API on 3001 (follows STACK.md).

- **Image upload storage backend:** No decision made in research. Recommendation for solo developer: Cloudinary free tier (CDN included, no bucket policy management, generous limits for v1). Decide before Phase 5 starts.

- **withCredentials global configuration:** The auth interceptor must set `withCredentials: true` on all requests to the BFF for cookies to work. Confirm Angular 20's preferred approach (`provideHttpClient()` level vs. per-interceptor) during Phase 4 planning to avoid cookies silently failing on preflight requests.

---

## Open Questions

Decisions required before the phase they affect:

| Question | Affects | Recommendation |
|----------|---------|----------------|
| Image storage backend (S3, Cloudinary, local)? | Phase 5 planning, Phase 8 | Cloudinary free tier -- lowest ops overhead for solo dev |
| Condition enum: 5-value TCGPlayer or 6-value broader? | Phase 1 schema | 6-value DB enum; TCGPlayer labels in UI layer |
| RefreshToken: column on User or separate table? | Phase 1 schema | Separate RefreshToken table -- supports multi-device and family tracking |
| BFF port 3000 / Core API port 3001 or 4000? | Phase 1 Docker | BFF 3000 / Core API 3001 per STACK.md |
| GIN index search relevance weighting (setweight)? | Phase 5 | Defer to Milestone 2; flat GIN index sufficient for v1 |

---

## Sources

### Primary (HIGH confidence)
- Angular official docs (angular.dev/guide/signals, angular.dev/guide/components/inputs) -- signals API stability, input()/output() patterns, HTTP interceptors
- NestJS official docs (docs.nestjs.com) -- guards, throttler, JWT, WebSocket gateways
- Prisma official docs (prisma.io/docs) -- schema design, relations, indexes, transactions, Prisma 7 TypeScript engine
- TCGPlayer Card Conditioning Standards PDF (March 2025) -- condition scale authority for TCG
- Domain-Driven Hexagon (github.com/Sairyss/domain-driven-hexagon) -- Clean Architecture NestJS patterns

### Secondary (MEDIUM confidence)
- Announcing NestJS 11 (trilon.io) -- version-specific changes and Express v5 breaking changes
- NestJS JWT Refresh via httpOnly Cookie (dev.to/zenstok) -- auth implementation pattern
- Hexagonal Architecture in NestJS (medium.com) -- folder structure patterns
- http-proxy-middleware in NestJS (medium.com) -- BFF proxy pattern with fixRequestBody
- NestJS Docker Compose + Postgres (tomray.dev) -- container setup patterns
- Cardmarket Card Condition (help.cardmarket.com) -- European TCG condition scale
- MyFigureCollection (myfigurecollection.net) -- anime figure metadata field reference
- Algolia Faceted Search Best Practices (algolia.com/blog) -- filter UX patterns
- Angular 20 HTTP Interceptors (medium.com) -- functional interceptor patterns in v20

### Tertiary (MEDIUM-LOW confidence)
- JWT Token Lifecycle (skycloak.io) -- token rotation strategy concepts
- Scalable WebSockets with NestJS and Redis (blog.logrocket.com) -- Milestone 2 planning reference only
- Race Conditions in PostgreSQL (dev.to) -- inventory decrement patterns for Milestone 2

---
*Research completed: 2026-05-16*
*Ready for roadmap: yes*
