# Collectavo

## What This Is

Collectavo is a specialized collectibles marketplace platform for buyers and sellers of Funko figures, Trading Card Games (Pokémon, One Piece, Yu-Gi-Oh), anime figures, manga, limited edition collectibles, and retro video game items. It supports both direct sales and auction-based sales. The platform is structured as three independent projects: an Angular 20 frontend, a NestJS reverse proxy/BFF, and a NestJS core API.

## Core Value

Buyers can discover, browse, and purchase collectibles from verified sellers — the marketplace listing experience must work end-to-end before anything else.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Three-project monorepo architecture (Angular 20 frontend, NestJS BFF, NestJS Core API) with Docker Compose for local dev
- [ ] PostgreSQL database with Prisma ORM, migrations, and complete schema
- [ ] User authentication: JWT access tokens, refresh tokens, secure cookie handling
- [ ] Role-Based Access Control: Admin, Seller, and Buyer roles with enforced permissions
- [ ] Seller can create, edit, and manage product listings (title, description, category, images, price, condition, rarity, inventory, listing type)
- [ ] Buyer can browse, search, and filter the product catalog (by category, price range, condition, rarity, listing type)
- [ ] Full-text product search
- [ ] Product categories: Funko, TCG, Anime Figures, Manga, Limited Edition, Retro Games
- [ ] Frontend pages: Home, Product Listing, Product Detail, Search Results, Login, Register, Seller Dashboard, Create/Manage Products
- [ ] Swagger/OpenAPI documentation on the Core API and BFF

### Out of Scope

- Auction system — deferred to Milestone 2 (complex real-time feature, not the core value)
- Stripe payments — deferred to Milestone 2 (foundation must work before payment integration)
- Real-time WebSockets — deferred to Milestone 2 (auctions depend on this; listings do not)
- Email/in-app notifications — deferred to Milestone 2
- Wishlist — deferred to Milestone 2
- Ratings and reputation system — deferred to Milestone 2
- Admin panel UI — deferred to Milestone 2
- CI/CD pipeline — deferred after foundation is stable
- Redis caching and rate-limit store — deferred (implement after load testing reveals bottlenecks)
- Mobile app — explicitly out of scope; web-first

## Context

- Solo developer building a real marketplace startup
- Spec-driven project with clearly defined architecture: 3 independent projects that communicate through a BFF/reverse proxy pattern (Frontend → BFF → Core API)
- Core API follows Clean Architecture + Hexagonal Architecture + DDD-inspired structure with SOLID principles
- Frontend uses Angular 20 with standalone components, signals for state, lazy loading, and Angular Material UI
- BFF (NestJS) acts as API Gateway: handles auth, rate limiting, request validation, API aggregation, and hides internal API structure from the frontend
- Collectibles domain has specific metadata needs: condition grading, rarity tiers, edition tracking — the schema must be flexible enough to cover all six collectible categories

## Constraints

- **Tech Stack**: Angular 20 + Angular Material (frontend); NestJS (BFF and Core API); PostgreSQL + Prisma (database) — all pre-decided, no alternatives
- **Architecture**: Clean Architecture + Hexagonal + DDD-inspired in the Core API — cannot be compromised for speed
- **Solo Developer**: Phases must be independently completable; no parallel workstreams assumed
- **Real Product**: Security, validation, and error handling must be production-grade from the start — not retrofitted
- **Foundation First**: v1 milestone ends when the marketplace listing flow works end-to-end (browse → product detail → seller dashboard) without payments or auctions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS for both BFF and Core API | Consistent DX, shared patterns, single language across backend | — Pending |
| Prisma as ORM | Type-safe queries, migration-first workflow, strong PostgreSQL support | — Pending |
| Three-project split over monolith | Independent deployability, clear separation of concerns, BFF pattern for security | — Pending |
| Angular Material over custom UI | Faster development, consistent Material Design, solo developer constraint | — Pending |
| Defer auctions to Milestone 2 | Core value is marketplace listings; auctions add real-time complexity that would delay foundation | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-16 after initialization*
