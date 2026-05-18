# Requirements: Collectavo

**Defined:** 2026-05-16
**Core Value:** Buyers can discover, browse, and purchase collectibles from verified sellers — the marketplace listing experience must work end-to-end before anything else.

## v1 Requirements

Requirements for Milestone 1. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can register an account with email and password
- [ ] **AUTH-02**: User can log in with email and password and receive a JWT session
- [ ] **AUTH-03**: User session persists across browser restarts via refresh token rotation (httpOnly cookie)
- [ ] **AUTH-04**: User can log out and invalidate their current session
- [ ] **AUTH-05**: System enforces role-based access control — Buyer and Seller roles with distinct permissions

### Listings

- [ ] **LIST-01**: Seller can create a product listing with title, description, price, condition, category, rarity, and listing type (direct sale)
- [ ] **LIST-02**: Listings support per-category metadata fields (TCG: set/card number/rarity/edition/language; Funko: series/edition/exclusive/vaulted; Anime: scale/manufacturer/character; Manga: volume number/publisher/language; Retro: completeness/has_box/has_manual; Limited: edition_size/edition_number)
- [ ] **LIST-03**: Listings support multi-image upload (4–8 photos per listing)
- [ ] **LIST-04**: Seller can edit and deactivate their own listings

### Catalog and Search

- [ ] **CAT-01**: Buyer can browse all active listings with pagination and sort (price, date)
- [ ] **CAT-02**: Buyer can view a product detail page (images, full metadata, seller info, condition)
- [ ] **CAT-03**: Buyer can filter listings by category, condition, price range, rarity, and listing type
- [ ] **CAT-04**: Buyer can search listings by full-text search across title and description

### Seller Dashboard

- [ ] **SELL-01**: Seller has a dashboard page displaying their active listings and basic overview
- [ ] **SELL-02**: Seller can manage their listings (view / edit / activate / deactivate) from the dashboard
- [ ] **SELL-03**: Seller has a public profile page displaying their info and active listings

### Infrastructure

- [x] **INFRA-01**: All services run via Docker Compose for local development (Angular frontend + NestJS BFF + NestJS Core API + PostgreSQL)
- [ ] **INFRA-02**: Swagger/OpenAPI documentation auto-generated on both BFF and Core API
- [ ] **INFRA-03**: Unit and integration test suites with 70% minimum coverage on Core API
- [ ] **INFRA-04**: Database seeds for all 6 product categories and representative sample listings

## v2 Requirements

Deferred to Milestone 2. Tracked but not in current roadmap.

### Auctions

- **AUC-01**: Seller can create an auction listing with start price, duration, and minimum increment
- **AUC-02**: Buyer can place bids on auction listings in real time
- **AUC-03**: Auction closes automatically and determines a winner
- **AUC-04**: Outbid notifications sent to buyers via WebSocket
- **AUC-05**: Bid history visible on auction listing detail page

### Payments

- **PAY-01**: Buyer can complete a purchase via Stripe checkout
- **PAY-02**: Seller is credited for completed sales
- **PAY-03**: Refund flow supported via Stripe
- **PAY-04**: Stripe webhook handling for payment verification

### Social and Trust

- **SOC-01**: Buyer can add listings to a wishlist
- **SOC-02**: Buyer can leave a rating and review for a seller after purchase
- **SOC-03**: Seller reputation score displayed on public profile

### Notifications

- **NOTF-01**: User receives in-app notification when outbid on an auction
- **NOTF-02**: User receives notification when an auction they participated in ends
- **NOTF-03**: Seller receives notification when a purchase is completed

### Admin

- **ADM-01**: Admin can manage users (view / suspend / delete)
- **ADM-02**: Admin can moderate listings (review / remove)
- **ADM-03**: Admin can manage categories

### Infrastructure (v2)

- **INFRA-V2-01**: Redis for WebSocket scaling and session rate limiting
- **INFRA-V2-02**: CI/CD pipeline with lint, test, build, and Docker image generation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app (native) | Web-first; mobile deferred indefinitely |
| OAuth / social login | Email/password sufficient for v1; adds OAuth provider complexity |
| Buyer-seller messaging | High complexity; dispute resolution workflow out of scope |
| Bulk listing / CSV import | Power-seller feature; not needed for marketplace validation |
| Collection tracking (owned vs. wanted) | Social feature; secondary to marketplace core |
| Price history / market charts | Requires sufficient historical data before useful |
| Multi-currency support | Single currency (USD) for v1 |
| Advanced seller verification badges | Gamification feature; defer until reputation system exists |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Notes | Status |
|-------------|-------|-------|--------|
| INFRA-01 | Phase 1 | Docker Compose setup | Complete (01-01) |
| INFRA-04 | Phase 1 | Category + sample listing seeds | Pending |
| AUTH-01 | Phase 2 | Core API register endpoint; frontend in Phase 4 | Pending |
| AUTH-02 | Phase 2 | Core API login endpoint; frontend in Phase 4 | Pending |
| AUTH-03 | Phase 2 | Core API refresh token rotation; BFF cookie handling in Phase 3; frontend restore in Phase 4 | Pending |
| AUTH-04 | Phase 2 | Core API logout endpoint; frontend in Phase 4 | Pending |
| AUTH-05 | Phase 2 | Core API JwtAuthGuard + RolesGuard; frontend guards in Phase 4 | Pending |
| INFRA-02 | Phase 2 | Core API Swagger; BFF Swagger in Phase 3 | Pending |
| INFRA-03 | Phase 5 | Core API test suite 70% coverage on product domain | Pending |
| LIST-01 | Phase 5 | Core API product creation with RBAC | Pending |
| LIST-02 | Phase 5 | Core API per-category metadata JSONB | Pending |
| LIST-03 | Phase 5 | Core API multi-image (ProductImage); upload UI in Phase 8 | Pending |
| LIST-04 | Phase 5 | Core API edit/deactivate endpoints; dashboard UI in Phase 8 | Pending |
| CAT-01 | Phase 7 | Frontend product list with pagination/sort; BFF proxy in Phase 6 | Pending |
| CAT-02 | Phase 7 | Frontend product detail page; BFF proxy in Phase 6 | Pending |
| CAT-03 | Phase 7 | Frontend faceted filter UI; BFF proxy in Phase 6 | Pending |
| CAT-04 | Phase 7 | Frontend search results page; Core API full-text search in Phase 5 | Pending |
| SELL-01 | Phase 8 | Seller dashboard overview page | Pending |
| SELL-02 | Phase 8 | Listing management (view/edit/activate/deactivate) | Pending |
| SELL-03 | Phase 8 | Seller public profile page | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-16*
*Last updated: 2026-05-18 after plan 01-01 execution*
