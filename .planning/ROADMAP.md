# Roadmap: Collectavo

## Overview

Collectavo's Milestone 1 builds the complete marketplace listing flow in 8 horizontal layers: infrastructure foundation first, then Core API backend features, BFF proxy wiring, and Angular frontend surfaces. The build order respects hard dependencies — schema before auth, Core API auth before BFF auth, BFF auth before frontend auth, Core API products before product proxy, product proxy before catalog UI. When Phase 8 is complete, buyers can browse and search listings, view product detail pages, and sellers can create and manage their listings end-to-end.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure Foundation** - Docker Compose, Prisma schema with all models, database indexes, and category seeds
- [ ] **Phase 2: Core API — Authentication** - JWT auth with refresh token rotation, RBAC guards, and Core API Swagger docs
- [ ] **Phase 3: BFF — Authentication Layer** - BFF proxies auth routes, httpOnly cookie handling, and rate limiting
- [ ] **Phase 4: Frontend — Authentication** - Angular login/register pages, AuthService with signals, and auth interceptors
- [ ] **Phase 5: Core API — Products and Categories** - Clean Architecture product domain, per-category metadata, full-text search, and test coverage
- [ ] **Phase 6: BFF — Product Proxy Routes** - BFF proxies product, category, and seller routes to Core API
- [ ] **Phase 7: Frontend — Catalog and Search** - Product list, product detail, and search results pages
- [ ] **Phase 8: Frontend — Seller Dashboard** - Seller dashboard, listing management, create/edit forms, and public profile

## Phase Details

### Phase 1: Infrastructure Foundation
**Goal**: All four services run locally via Docker Compose and the complete database schema is established with correct indexes and seed data
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-04
**Success Criteria** (what must be TRUE):
  1. `docker compose up` brings all four services online (Angular frontend, NestJS BFF, NestJS Core API, PostgreSQL) with no manual setup steps beyond copying `.env`
  2. All Prisma models exist in schema (User, RefreshToken, Category, Product, ProductImage, SellerProfile) with correct relations, and `prisma migrate dev` applies cleanly
  3. All required database indexes are in place (FK columns, filter columns on Product, GIN index for full-text search, email on User, hashedToken on RefreshToken)
  4. Database seeds populate all 6 product categories (Funko, TCG, Anime Figures, Manga, Limited Edition, Retro Games) with representative sample listings
**Plans**: 4 plans

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — App scaffolds + Docker Compose + root config files

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Prisma schema + PrismaService + DatabaseModule + Jest scaffold

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 01-03-PLAN.md — Seed script with 6 categories, accounts, and 18-30 listings

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 01-04-PLAN.md — [BLOCKING] Migration + tsvector trigger + seed execution

**Cross-cutting constraints:** `prisma migrate dev` only (no `prisma db push`); all Prisma client imports from `src/generated/prisma/client`; `@prisma/adapter-pg` required in PrismaService and seed constructor

### Phase 2: Core API — Authentication
**Goal**: Users can register, log in, refresh sessions, and log out through the Core API with secure token handling and enforced RBAC
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, INFRA-02
**Success Criteria** (what must be TRUE):
  1. `POST /auth/register` creates a new user account with bcrypt-hashed password and returns a JWT access token
  2. `POST /auth/login` authenticates credentials and issues both a JWT access token and a refresh token (bcrypt-hashed in RefreshToken table)
  3. `POST /auth/refresh` issues a new access token and rotates the refresh token; presenting a previously-used refresh token invalidates the entire token family
  4. `POST /auth/logout` invalidates the current refresh token and ends the session
  5. Global `JwtAuthGuard` + `RolesGuard` enforce RBAC on all routes; `@Public()` and `@Roles()` decorators work correctly; Swagger docs at `/api/docs` are accessible without authentication
**Plans**: TBD

### Phase 3: BFF — Authentication Layer
**Goal**: The BFF correctly proxies all auth routes and handles httpOnly cookie refresh token exchange so the frontend never touches tokens directly
**Depends on**: Phase 2
**Requirements**: INFRA-02
**Success Criteria** (what must be TRUE):
  1. BFF proxies all `/api/auth/*` requests to Core API and returns responses correctly, with refresh tokens set as httpOnly cookies (never exposed in response body)
  2. BFF extracts the httpOnly refresh token cookie and injects it as a Bearer header on `/api/auth/refresh` calls to Core API
  3. Auth routes are rate-limited (5 requests/minute); excess requests receive 429 responses
  4. Authenticated requests forwarded to Core API include `X-User-Id` and `X-User-Role` headers derived from the validated JWT
  5. BFF Swagger docs at `/docs` are accessible and document all proxied auth routes
**Plans**: TBD

### Phase 4: Frontend — Authentication
**Goal**: Users can register, log in, and stay logged in across browser restarts through the Angular frontend
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can register a new account on the Register page and is redirected to the appropriate home view on success
  2. User can log in on the Login page and the UI immediately reflects their authenticated state (name, role) via computed signals
  3. User session is automatically restored on page reload or browser restart (tryRestoreSession() succeeds via refresh token cookie)
  4. User can log out from any page and the UI immediately clears all authenticated state
  5. Protected routes (seller dashboard) redirect unauthenticated users to login; seller-only routes redirect non-seller users; 401 responses trigger a transparent token refresh and request retry
**Plans**: TBD
**UI hint**: yes

### Phase 5: Core API — Products and Categories
**Goal**: Sellers can create product listings with full per-category metadata through the Core API, and buyers can retrieve and search listings
**Depends on**: Phase 2
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Authenticated Seller can `POST /products` to create a listing with title, description, price, condition, category, rarity, listing type, and per-category metadata JSONB fields; unauthenticated and Buyer requests are rejected with 403
  2. All six per-category metadata schemas are enforced (TCG: set/card number/rarity/edition/language; Funko: series/edition/exclusive/vaulted; Anime: scale/manufacturer/character; Manga: volume/publisher/language; Retro: completeness/has_box/has_manual; Limited: edition_size/edition_number)
  3. A listing can include 4–8 images stored as ProductImage records linked to the product
  4. `GET /products?q=searchterm` returns results ranked by PostgreSQL full-text search across title and description using the GIN-indexed tsvector column
  5. Core API unit and integration test suites achieve 70% minimum coverage; all product use cases have unit tests with mocked IProductRepository
**Plans**: TBD

### Phase 6: BFF — Product Proxy Routes
**Goal**: The Angular frontend can reach all product, category, and seller endpoints through the BFF proxy
**Depends on**: Phase 5
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04
**Success Criteria** (what must be TRUE):
  1. BFF proxies all `/api/products/*` requests to Core API, forwarding `X-User-Id` and `X-User-Role` headers on authenticated requests
  2. BFF proxies all `/api/categories/*` and `/api/sellers/*` requests to Core API with the same header injection pattern
  3. BFF contains no product business logic — it is a thin proxy only; all domain validation errors originate from Core API and pass through unchanged
**Plans**: TBD

### Phase 7: Frontend — Catalog and Search
**Goal**: Buyers can browse, filter, and search all active listings and view complete product detail pages
**Depends on**: Phase 6
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04
**Success Criteria** (what must be TRUE):
  1. Buyer can browse all active listings on the product list page with pagination controls (next/previous page) and sort options (price ascending/descending, newest first)
  2. Buyer can filter the listing view by category, condition, price range, rarity, and listing type simultaneously; filters can be combined and cleared
  3. Buyer can search listings by keyword and see full-text search results on the search results page
  4. Buyer can navigate to a product detail page showing all images, full metadata (including per-category fields), seller info, condition, and price
**Plans**: TBD
**UI hint**: yes

### Phase 8: Frontend — Seller Dashboard
**Goal**: Sellers can create and manage their product listings from a dashboard and have a public profile page
**Depends on**: Phase 7
**Requirements**: SELL-01, SELL-02, SELL-03, LIST-03, LIST-04
**Success Criteria** (what must be TRUE):
  1. Authenticated Seller can access the dashboard page showing an overview of their active listings; unauthenticated users are redirected to login
  2. Seller can view, edit, activate, and deactivate any of their listings from the dashboard; changes are reflected immediately without full page reload
  3. Seller can create a new listing using a form that dynamically renders the correct per-category metadata fields based on the selected category, and upload 4–8 images per listing
  4. Any user can view a seller's public profile page showing the seller's info and their active listings
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 1/4 | In Progress | - |
| 2. Core API — Authentication | 0/? | Not started | - |
| 3. BFF — Authentication Layer | 0/? | Not started | - |
| 4. Frontend — Authentication | 0/? | Not started | - |
| 5. Core API — Products and Categories | 0/? | Not started | - |
| 6. BFF — Product Proxy Routes | 0/? | Not started | - |
| 7. Frontend — Catalog and Search | 0/? | Not started | - |
| 8. Frontend — Seller Dashboard | 0/? | Not started | - |
