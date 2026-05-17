# Feature Landscape: Collectibles Marketplace

**Domain:** Specialized collectibles marketplace (Funko, TCG, Anime Figures, Manga, Retro Games)
**Researched:** 2026-05-16
**Reference platforms:** TCGPlayer, StockX, COMC, Cardmarket, Mercari, eBay, Discogs, MyFigureCollection

---

## Table Stakes

Features users expect. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User registration & login | Every marketplace has accounts | Low | Email/password minimum; OAuth is nice-to-have |
| Role separation (Buyer / Seller) | Different workflows; prevents category confusion | Low | Admin role needed for moderation too |
| Product listing creation | Core seller workflow | Medium | Title, description, price, images, category, condition |
| Collectibles-specific metadata per category | Collectors search by set, rarity, edition — generic fields fail | High | See per-category schema section below |
| Multiple product images | Buyers cannot assess condition with one photo | Low | 4-8 images per listing is the norm; condition photos are critical |
| Condition grading field (standardized) | Collectors use shared vocabulary (NM, LP, etc.); free-text fails | Low | Use established scales per category |
| Category taxonomy | All major platforms organize by TCG game, figure line, console, etc. | Medium | Six categories: Funko, TCG, Anime Figures, Manga, Limited Edition, Retro Games |
| Product search (full-text) | Discovery is the primary buyer flow | Medium | Full-text across title, description, set name, character |
| Faceted filtering | Buyers browse by condition, price, rarity, category — not just search | Medium | Filters must be category-aware (rarity for TCG, edition for Funko) |
| Price sort and listing sort | Standard e-commerce expectation | Low | Newest, Price: Low-High, Price: High-Low, Ending Soon (for auctions) |
| Product detail page | Buyers need to evaluate before purchasing | Low | Images, metadata, seller info, condition notes |
| Seller dashboard | Sellers must manage their listings | Medium | Create, edit, deactivate, view orders |
| Inventory management | Sellers list single items or small quantities | Low | Quantity field; out-of-stock handling |
| Seller public profile | Buyers evaluate seller reputation before buying | Low | Name, feedback score, active listings |
| Buyer/seller feedback and ratings | Trust mechanism; eBay, TCGPlayer, Cardmarket all require this | Medium | Star rating + written feedback post-transaction |
| Order management | Both parties need order status visibility | Medium | Pending, Shipped, Delivered, Disputed |
| Buyer protection policy | Users will not pay without knowing they are protected | Low | Policy page + messaging; actual escrow is Milestone 2 |
| Payment processing | No purchase without checkout | High | Stripe Connect is the standard; deferred to Milestone 2 per PROJECT.md |
| Shipping workflow | Orders must ship; tracking is expected | Medium | Seller provides tracking number; carrier integration optional |
| Direct (fixed-price) listing type | The most common listing format on all platforms | Low | Buy-it-now, immediate purchase |
| Image standards enforcement | Condition misrepresentation is the #1 dispute cause | Low | Minimum resolution guidance; no stock photos policy |
| Mobile-responsive web UI | 60%+ of collectors browse on phone | Low | Web-first but must be responsive |
| Secure auth (JWT, refresh tokens) | Security expectation for accounts with payment data | Medium | Already in PROJECT.md scope |

---

## Differentiators

Features that create competitive advantage. Not universally expected, but valued by serious collectors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auction listing type | Rare items price-discover better at auction; TCGPlayer and eBay both support auctions | High | Deferred to Milestone 2; requires WebSockets |
| Wishlist / want list | Collectors track items they want; enables demand signals for sellers | Medium | Save item + notify on price drop; Milestone 2 |
| Price alerts (new listings or price drops) | High-value collectors set alerts for specific cards, figures; Discogs does this well | Medium | Requires notification system; Milestone 2 |
| Price history / market data | StockX's core differentiator; shows last sale prices, trend graphs | High | Requires price data aggregation; post-v1 |
| Bulk listing tools (CSV import, scan-to-list) | TCGPlayer Pro's Quicklist feature reduces friction for high-volume sellers | High | Important for TCG sellers with hundreds of cards |
| PSA/BGS/CGC graded card listing fields | Graded cards trade at premium; need grade, grader, cert number, slab condition | Low | Schema addition; straightforward to add |
| "Best Offer" / negotiated pricing | eBay's Best Offer drives sales on mid-priced items; collectors expect to negotiate | Medium | Seller sets floor; buyer proposes price |
| Saved searches with alerts | Users who save "PSA 10 Charizard Base Set" want an email when one lists | Medium | Milestone 2 |
| Seller verification badges | Cardmarket and TCGPlayer use seller tier/badge systems to signal trust | Medium | Badge tiers: New, Verified, Power Seller |
| Bundle / lot listings | Collectors sell sets together; important for manga volumes, game lots | Low | Multi-item listing with shared price |
| Collection tracking (owned list) | MyFigureCollection's core feature; lets collectors track what they own vs. want | High | Separate feature from buying; post-v1 |
| Buyer/seller in-platform messaging | TCGPlayer requires all comms stay in-platform for dispute evidence | Medium | Milestone 2; reduces fraud, enables dispute resolution |
| Category-specific taxonomy browse | Browse "Pokémon > Base Set > Holos" rather than generic search | Medium | Hierarchical nav; enhances discovery |
| Variant/edition disambiguation | Funko has 300+ Pikachu variants; must distinguish in catalog | High | Core catalog problem; needs canonical product records |
| Condition photo requirements enforcement | TCGPlayer's biggest dispute cause is condition mismatch; enforce required photo angles | Medium | Guided upload flow |

---

## Anti-Features

Features to deliberately NOT build in v1. Each has a specific reason and an alternative.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Physical authentication / grading service | StockX's authentication center took years and $100M+ to build; completely out of scope for a solo startup | Link to PSA/BGS/CGC externally; require sellers to upload cert numbers for graded items |
| Real-time auction bidding (Milestone 1) | Requires WebSockets, bid-conflict resolution, anti-sniping timers, race-condition handling; doubles backend complexity | Fixed-price listings first; auction is Milestone 2 |
| Stripe payments (Milestone 1) | Payment integration requires KYC, payout scheduling, chargeback handling, compliance; needs stable listing flow first | Mock checkout flow with "contact seller"; payments in Milestone 2 |
| Blockchain / NFT provenance tracking | No collector demand signal found; adds infrastructure complexity with no proven ROI for these categories | Standard database provenance fields (cert number, grader) |
| AI-powered counterfeit detection | StockX uses CT scanning and ML trained on millions of items; no viable solo path | Require grader cert numbers for high-value items; community reporting |
| Social feed / collector social network | Different product; requires content moderation, network effects from scratch | Seller profiles + feedback covers trust needs |
| Mobile app (iOS/Android) | Out of scope per PROJECT.md; adds a second major surface area | Responsive web covers mobile use cases |
| Full-text search across external marketplaces (price aggregator) | TCGPlayer data is licensed and expensive; scrapers violate ToS | Show historical sold prices within your own platform only |
| Crypto / non-fiat payment | No mainstream demand signal; adds regulatory complexity | Standard fiat via Stripe |
| Subscription / SaaS seller tools (v1) | TCGPlayer Pro is a mature product; competing on tooling requires scale first | Basic seller dashboard is sufficient for v1 |
| Automated repricing engine | Requires market data infrastructure; TCGPlayer Pro's MassPrice took years | Manual pricing; price history visibility helps sellers price correctly |
| Insurance / shipping claims management | Massive operational complexity; insurers are third parties | Policy page linking to shipping insurance options |

---

## Collectibles-Specific Metadata by Category

Each category has mandatory fields and optional enrichment fields. The schema must support category-specific extension while sharing a common core.

### Common Core Fields (all categories)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | Yes | Seller-provided display name |
| description | text | Yes | Free-text condition notes, seller description |
| price | decimal | Yes | Fixed-price listings |
| category | enum | Yes | Funko / TCG / Anime Figures / Manga / Limited Edition / Retro Games |
| condition | enum | Yes | See condition scales below |
| condition_notes | text | No | Free-text elaboration on condition |
| images | array | Yes | Minimum 1, recommended 4-8 |
| listing_type | enum | Yes | fixed_price / auction (auction = Milestone 2) |
| quantity | integer | Yes | Default 1 for unique collectibles |
| is_graded | boolean | No | Whether item has professional grading |
| grader | enum | No | PSA / BGS / CGC / WATA / Beckett / Other |
| grade_value | string | No | "9.5", "NM 7", "10" etc. |
| cert_number | string | No | Grading cert number for verification |

---

### TCG (Pokémon, One Piece, Yu-Gi-Oh)

| Field | Type | Required | Source |
|-------|------|----------|--------|
| game | enum | Yes | pokemon / one_piece / yugioh / magic / other |
| set_name | string | Yes | "Base Set", "Scarlet & Violet", "Romance Dawn" |
| set_code | string | No | Official abbreviation (e.g., "SVI", "OP01") |
| card_number | string | Yes | Collector number (e.g., "025/165") |
| card_name | string | Yes | Character/card name |
| rarity | enum | Yes | See rarity tiers below |
| foil_type | enum | No | standard / holo / reverse_holo / full_art / secret_rare |
| edition | enum | No | first_edition / unlimited / shadowless (Pokémon-specific) |
| language | enum | Yes | english / japanese / korean / french / german / spanish / other |
| is_graded_slab | boolean | No | Card is in a graded slab |

**Rarity tiers (shared across TCGs, normalized):**
- Common
- Uncommon
- Rare
- Rare Holo
- Ultra Rare (EX, GX, V, SR)
- Secret Rare / Special Illustration Rare
- Hyper Rare / Rainbow
- Promo

**Condition scale (TCGPlayer standard — industry standard for raw cards):**
- Near Mint (NM)
- Lightly Played (LP)
- Moderately Played (MP)
- Heavily Played (HP)
- Damaged (DMG)

**Cardmarket scale (used in Europe — important for One Piece / Yu-Gi-Oh):**
- Mint (M)
- Near Mint (NM)
- Excellent (EX)
- Good (GD)
- Light Played (LP)
- Played (PL)
- Poor (PO)

> Recommendation: store TCGPlayer 5-tier scale as canonical (NM/LP/MP/HP/DMG). It is the most widely recognized in English-speaking markets and maps cleanly to Cardmarket grades.

---

### Funko Pop

| Field | Type | Required | Source |
|-------|------|----------|--------|
| funko_number | string | Yes | Pop number (e.g., "#01", "#905") |
| character_name | string | Yes | "Batman", "Pikachu" |
| series | string | Yes | "DC Comics", "Pokémon" |
| variant_type | enum | No | standard / chase / flocked / glow / metallic / diamond / jumbo / other |
| exclusive_retailer | enum | No | none / hot_topic / target / walgreens / sdcc / nycc / funko_shop / gamestop / other |
| is_vaulted | boolean | Yes | Whether Funko has officially vaulted this figure |
| box_condition | enum | Yes | mint_box / good_box / damaged_box / no_box |
| is_opened | boolean | Yes | Whether the Pop has been removed from the box |
| edition_size | integer | No | For numbered limited editions |

**Condition scale for Funko (industry standard):**
- Mint in Box (MIB) — figure and box both flawless
- Near Mint in Box (NMIB) — minor box wear, figure flawless
- Very Good (VG) — noticeable but light box wear
- Good (G) — significant box wear or box-only damage
- Out of Box Mint (OOBM) — no box, figure flawless
- Out of Box (OOB) — no box, figure has wear

---

### Anime Figures

| Field | Type | Required | Source |
|-------|------|----------|--------|
| character_name | string | Yes | "Rem", "Goku" |
| series | string | Yes | "Re:Zero", "Dragon Ball Z" |
| manufacturer | string | Yes | Good Smile Company / Alter / Kotobukiya / Bandai / Max Factory / Funrise / other |
| figure_line | string | No | "Nendoroid", "Figma", "Pop Up Parade", "Scale Figure" |
| scale | enum | No | 1/4 / 1/7 / 1/8 / 1/12 / non_scale / chibi / other |
| is_bootleg_risk | boolean | No | Flag to prompt authenticity note; bootlegs common in this category |
| includes_accessories | boolean | No | All accessories from manufacturer included |
| box_condition | enum | Yes | mint_box / good_box / damaged_box / no_box |
| is_sealed | boolean | Yes | Whether figure is sealed in original box |
| release_year | integer | No | Year of manufacturer release |

**Condition scale for figures (no universal standard; common community usage):**
- Mint in Box Sealed (MIBS) — never opened
- Mint in Box (MIB) — opened but figure flawless, box excellent
- Near Mint (NM) — minor box or figure imperfections
- Excellent (EX) — visible but minor wear
- Good (G) — noticeable wear, fully intact
- Fair — damage present but structurally sound

---

### Manga

| Field | Type | Required | Source |
|-------|------|----------|--------|
| series_title | string | Yes | "Berserk", "One Piece" |
| volume_number | integer | Yes | Volume 1, 47, etc. |
| publisher | string | No | "VIZ Media", "Shonen Jump", "Dark Horse" |
| language | enum | Yes | english / japanese / other |
| is_first_print | boolean | No | First edition/printing (premium collectible value) |
| print_number | integer | No | Which print run (1st, 2nd, etc.) |
| has_dust_jacket | boolean | No | Dust jacket/obi intact (critical for Japanese volumes) |
| is_set | boolean | No | Whether listing covers multiple volumes |
| volume_range | string | No | "Vol. 1-10" for sets |
| is_signed | boolean | No | Author-signed copy |

**Condition scale for manga (no universal standard; use book grading conventions):**
- Mint (M) — perfect, unread
- Near Mint (NM) — minimal handling marks
- Very Fine (VF) — light reading wear
- Fine (F) — moderate wear but complete
- Good (G) — heavy wear, all pages intact
- Poor (P) — significant damage, missing pages

---

### Retro Video Games

| Field | Type | Required | Source |
|-------|------|----------|--------|
| game_title | string | Yes | "Super Mario Bros.", "Pokémon Red" |
| platform | enum | Yes | nes / snes / n64 / gameboy / gba / genesis / ps1 / ps2 / saturn / other |
| region | enum | Yes | ntsc_us / ntsc_jp / pal / other |
| completeness | enum | Yes | loose / cib / sealed (see below) |
| has_box | boolean | No | Box present (only relevant if completeness = loose) |
| has_manual | boolean | No | Manual present |
| has_inserts | boolean | No | All original inserts (maps, registration cards, etc.) |
| is_graded_wata | boolean | No | Whether graded by WATA |
| release_year | integer | No | Original release year |
| publisher | string | No | "Nintendo", "Sega" |

**Completeness definitions (industry standard):**
- **Loose (LO)** — cartridge or disc only; no box, no manual
- **CIB (Complete In Box)** — cartridge + box + manual (+ all original inserts)
- **Sealed / New** — factory sealed; never opened

**Condition scale (retro game community standard):**
- Excellent (EX) — minimal cosmetic wear
- Very Good (VG) — light visible wear
- Good (G) — moderate wear, fully functional
- Fair (F) — heavy wear, cosmetic damage
- Poor (P) — significant damage

> Note: WATA grades use a numeric 1.0–10.0 scale with seal rating A++/A+/A/B+/B/C+ for sealed games. PSA grades sealed games on 1–10 scale. These are stored in the `grader` + `grade_value` core fields.

---

### Limited Edition (catch-all)

| Field | Type | Required | Source |
|-------|------|----------|--------|
| item_type | string | Yes | "Statue", "Art Print", "Collectible Coin", etc. |
| franchise | string | Yes | "Star Wars", "Marvel", etc. |
| manufacturer | string | No | "Sideshow", "XM Studios", etc. |
| edition_size | integer | No | Total production run |
| edition_number | integer | No | This item's number out of edition_size |
| is_certificate | boolean | No | Certificate of authenticity included |
| is_signed | boolean | No | Artist or celebrity signed |
| box_condition | enum | No | mint_box / good_box / damaged_box / no_box |

---

## Feature Dependencies

The following dependency chain should inform phase ordering:

```
User Auth (JWT, roles)
  └── Seller Dashboard
        └── Product Listing Creation
              └── Category Taxonomy
              └── Condition Fields (per-category schema)
              └── Image Upload
                    └── Product Detail Page
                          └── Buyer Search + Filtering
                                └── Seller Feedback / Ratings (post-transaction)
                                      └── Order Management
                                            └── Payment Processing (Milestone 2)
                                                  └── Buyer Protection / Escrow
                                                        └── Buyer/Seller Messaging
                                                              └── Wishlist / Alerts
                                                                    └── Auction Listings (Milestone 2)
                                                                          └── Real-time Bidding (WebSockets)
```

**Critical path for Milestone 1 (current scope):**
Auth → Listing Creation → Category Schema → Product Detail → Search/Filter → Seller Dashboard

---

## MVP Recommendation

Based on PROJECT.md scope and platform analysis:

**Prioritize (Milestone 1 — table stakes for listing flow):**
1. Auth + roles (Buyer, Seller, Admin)
2. Category taxonomy with per-category metadata schema
3. Condition grading fields using TCGPlayer NM/LP/MP/HP/DMG scale for cards; text enum for figures/games
4. Product listing creation with image upload (4+ images)
5. Product detail page
6. Full-text search + faceted filtering (category, condition, price range, rarity for TCG, vaulted for Funko)
7. Seller dashboard (manage listings)
8. Basic seller public profile

**Defer to Milestone 2 (differentiators, after listing flow validates):**
- Payment processing (Stripe Connect)
- Auction listings + real-time bidding
- Buyer/seller in-platform messaging
- Wishlist + price alerts
- Seller feedback/ratings system
- Best Offer / negotiated pricing
- Saved searches
- Email notifications

**Defer to post-v2 (advanced differentiators):**
- Price history / market data charts
- Bulk listing / CSV import
- Collection tracking (owned vs. wanted)
- Bundle / lot listings
- Advanced seller tiers / verification badges

---

## Sources

- TCGPlayer Seller Platform: https://seller.tcgplayer.com/
- TCGPlayer Card Conditioning Standards (March 2025): https://mktg-assets.tcgplayer.com/web/seller/guides/Card-Conditioning-Standards.pdf
- TCGPlayer Rarity Guide: https://help.tcgplayer.com/hc/en-us/articles/360025636074
- Cardmarket Card Condition: https://help.cardmarket.com/en/CardCondition
- Cardmarket Complete Guide 2026: https://www.cardpulse.club/blog/cardmarket-complete-guide-2026
- PSA/BGS/CGC Grading Comparison: https://cardgrader.ai/blog/psa-vs-bgs-vs-cgc-2026
- PSA Video Game Grading: https://www.psavideogames.com/
- Retro Game Completeness (J2Games): https://j2games.com/blogs/news/how-game-condition-affects-value-cib-complete-vs-loose-game-only-vs-graded
- Funko Vaulted Pop Tracker: https://vaultedfunkopops.com/
- Funko Exclusives: https://funko.com/new-featured/exclusives/
- MyFigureCollection anime figure metadata: https://myfigurecollection.net/
- Sharetribe collectibles marketplace guide: https://www.sharetribe.com/create/how-to-build-marketplace-for-trading-collectibles/
- StockX Authentication Process: https://stockx.com/about/our-process/
- Manga First Print Guide: https://1stprint.net/blogs/news/understand-and-recognize-first-print-manga
- Beckett Manga Grading: https://www.beckett.com/manga-grading
- Algolia Faceted Search Best Practices: https://www.algolia.com/blog/ux/search-filter-ux-best-practices
- COMC Platform Overview: https://www.cardshopslist.com/blog/top-5-platforms-for-sports-card-trading/
- Marketplace Pitfalls: https://dev.to/egledigital/the-hidden-pitfalls-of-building-online-marketplaces-c2
