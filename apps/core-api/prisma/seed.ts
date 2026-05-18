// apps/core-api/prisma/seed.ts
// Idempotent seed script for Collectavo local development
// Run via: npx prisma db seed (configured in prisma.config.ts)
// Requires: DATABASE_URL in .env (loaded by dotenv/config below)

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Step 1: Upsert all 6 categories by slug (fully idempotent) ──────────────

  const categoryData = [
    { name: "Funko Pop", slug: "funko-pop" },
    { name: "Trading Card Game", slug: "tcg" },
    { name: "Anime Figure", slug: "anime-figure" },
    { name: "Manga", slug: "manga" },
    { name: "Limited Edition", slug: "limited-edition" },
    { name: "Retro Game", slug: "retro-game" },
  ];

  for (const cat of categoryData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("Categories seeded (6).");

  // ─── Step 2: Look up category IDs by slug ─────────────────────────────────────

  const categories = await prisma.category.findMany({
    where: { slug: { in: categoryData.map((c) => c.slug) } },
  });

  const catBySlug: Record<string, string> = {};
  for (const cat of categories) {
    catBySlug[cat.slug] = cat.id;
  }

  // ─── Step 3: Hash passwords at runtime ───────────────────────────────────────

  const buyerHash = await bcrypt.hash("Buyer123!", 10);
  const sellerHash = await bcrypt.hash("Seller123!", 10);

  // ─── Step 4: Upsert Buyer account ────────────────────────────────────────────

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@collectavo.dev" },
    update: {},
    create: {
      email: "buyer@collectavo.dev",
      passwordHash: buyerHash,
      role: "BUYER",
    },
  });

  console.log(`Buyer account: ${buyer.email}`);

  // ─── Step 5: Upsert Seller account with nested SellerProfile ─────────────────
  // SellerProfile nested create only on the CREATE branch — update branch is {}
  // to avoid re-creating sellerProfile on subsequent seed runs (idempotent)

  const seller = await prisma.user.upsert({
    where: { email: "seller@collectavo.dev" },
    update: {},
    create: {
      email: "seller@collectavo.dev",
      passwordHash: sellerHash,
      role: "SELLER",
      sellerProfile: {
        create: {
          displayName: "Demo Seller",
          bio: "Official Collectavo demo seller account.",
        },
      },
    },
  });

  console.log(`Seller account: ${seller.email}`);

  // ─── Step 6: Remove demo seller's existing products before recreating ─────────
  // Acceptable for dev-only seed: demo seller's products are entirely recreatable.
  // Real user data is not affected — only the known demo seller email is targeted.

  await prisma.product.deleteMany({
    where: { seller: { email: "seller@collectavo.dev" } },
  });

  // ─── Step 7: Seed products by category ───────────────────────────────────────

  type ProductSeed = {
    title: string;
    description: string;
    price: string;
    condition: "MINT" | "NEAR_MINT" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
    metadata: Record<string, unknown>;
    slug: string;
  };

  const tcgProducts: ProductSeed[] = [
    {
      title: "Charizard VMAX Rainbow Rare #074 — Pokémon Sword & Shield",
      description:
        "Ultra-rare Charizard VMAX in Rainbow Rare finish from the Sword & Shield base set. Near mint condition, no visible scratches or marks.",
      price: "89.99",
      condition: "NEAR_MINT",
      metadata: {
        set: "Sword & Shield",
        cardNumber: "074/073",
        rarity: "Secret Rare",
        edition: "Unlimited",
        language: "EN",
      },
      slug: "charizard-vmax-rainbow-rare-074",
    },
    {
      title:
        "Pikachu VMAX Secret Rainbow Rare #188 — Pokémon Vivid Voltage",
      description:
        "Mint condition Pikachu VMAX in Rainbow Rare finish from Vivid Voltage. Straight from pack, stored in sleeve immediately.",
      price: "45.00",
      condition: "MINT",
      metadata: {
        set: "Vivid Voltage",
        cardNumber: "188/185",
        rarity: "Secret Rare",
        edition: "Unlimited",
        language: "EN",
      },
      slug: "pikachu-vmax-secret-rainbow-rare-188",
    },
    {
      title: "Luffy Gear 5 OP-01 Secret Rare — One Piece TCG",
      description:
        "Monkey D. Luffy Gear 5 Secret Rare from the One Piece TCG OP-01 Romance Dawn set. Near mint, light play.",
      price: "67.50",
      condition: "NEAR_MINT",
      metadata: {
        set: "OP-01 Romance Dawn",
        cardNumber: "OP01-060",
        rarity: "Secret Rare",
        edition: "1st Edition",
        language: "EN",
      },
      slug: "luffy-gear-5-op-01-secret-rare",
    },
    {
      title: "Blue-Eyes White Dragon LOB-001 1st Edition",
      description:
        "Classic Blue-Eyes White Dragon from Legend of Blue Eyes White Dragon in 1st Edition. Light play, excellent overall grade.",
      price: "299.99",
      condition: "EXCELLENT",
      metadata: {
        set: "Legend of Blue Eyes White Dragon",
        cardNumber: "LOB-001",
        rarity: "Ultra Rare",
        edition: "1st Edition",
        language: "EN",
      },
      slug: "blue-eyes-white-dragon-lob-001-1st-edition",
    },
    {
      title: "Umbreon VMAX Alternate Art #215 — Pokémon Evolving Skies",
      description:
        "Highly sought-after Umbreon VMAX Alternate Art from Evolving Skies. One of the most popular cards in the modern TCG era.",
      price: "199.99",
      condition: "NEAR_MINT",
      metadata: {
        set: "Evolving Skies",
        cardNumber: "215/203",
        rarity: "Secret Rare",
        edition: "Unlimited",
        language: "EN",
      },
      slug: "umbreon-vmax-alternate-art-215",
    },
  ];

  const funkoProducts: ProductSeed[] = [
    {
      title: "Goku Super Saiyan #09 Entertainment Earth Exclusive",
      description:
        "Dragon Ball Z Goku in Super Saiyan form, Entertainment Earth exclusive with glowing aura effect. Mint in box.",
      price: "24.99",
      condition: "MINT",
      metadata: {
        series: "Dragon Ball Z",
        edition: "Entertainment Earth Exclusive",
        exclusive: true,
        vaulted: false,
      },
      slug: "goku-super-saiyan-09-entertainment-earth-exclusive",
    },
    {
      title: "Naruto Running #71 Hot Topic Exclusive",
      description:
        "Naruto in his iconic running pose, Hot Topic exclusive with metallic finish. Near mint, minor shelf wear on box corner.",
      price: "18.99",
      condition: "NEAR_MINT",
      metadata: {
        series: "Naruto Shippuden",
        edition: "Hot Topic Exclusive",
        exclusive: true,
        vaulted: true,
      },
      slug: "naruto-running-71-hot-topic-exclusive",
    },
    {
      title: "Iron Man Mark 85 Glow-in-Dark #529 GameStop Exclusive",
      description:
        "Iron Man in Mark 85 armor from Avengers: Endgame, GameStop exclusive with glow-in-the-dark chest repulsor. Mint in box.",
      price: "34.99",
      condition: "MINT",
      metadata: {
        series: "Avengers: Endgame",
        edition: "GameStop Exclusive",
        exclusive: true,
        vaulted: false,
      },
      slug: "iron-man-mark-85-glow-in-dark-529-gamestop-exclusive",
    },
    {
      title: "Pikachu with Pokéball #353 Special Edition",
      description:
        "Classic Pikachu holding a Pokéball, Special Edition release. Good condition with visible box wear — great for display.",
      price: "14.99",
      condition: "GOOD",
      metadata: {
        series: "Pokémon",
        edition: "Special Edition",
        exclusive: false,
        vaulted: true,
      },
      slug: "pikachu-with-pokeball-353-special-edition",
    },
  ];

  const animeProducts: ProductSeed[] = [
    {
      title: "Rem 1/7 Scale Figure — Good Smile Company Re:Zero",
      description:
        "Good Smile Company's 1/7 scale figure of Rem from Re:Zero. Mint condition, original packaging, all accessories included.",
      price: "129.99",
      condition: "MINT",
      metadata: {
        scale: "1/7",
        manufacturer: "Good Smile Company",
        character: "Rem",
        series: "Re:Zero − Starting Life in Another World",
      },
      slug: "rem-1-7-scale-figure-good-smile-company-rezero",
    },
    {
      title:
        "Zero Two 1/7 Scale Figure — Kotobukiya DARLING in the FranXX",
      description:
        "Kotobukiya's 1/7 scale Zero Two figure in her pilot suit. Near mint, assembled and displayed briefly in smoke-free environment.",
      price: "149.99",
      condition: "NEAR_MINT",
      metadata: {
        scale: "1/7",
        manufacturer: "Kotobukiya",
        character: "Zero Two",
        series: "DARLING in the FranXX",
      },
      slug: "zero-two-1-7-scale-figure-kotobukiya-darling-in-the-franxx",
    },
    {
      title: "Mikasa Ackerman 1/8 Scale — Aniplex Attack on Titan",
      description:
        "Aniplex 1/8 scale Mikasa Ackerman in her Survey Corps uniform with ODM gear. Excellent condition, in original box with foam inserts.",
      price: "89.99",
      condition: "EXCELLENT",
      metadata: {
        scale: "1/8",
        manufacturer: "Aniplex",
        character: "Mikasa Ackerman",
        series: "Attack on Titan",
      },
      slug: "mikasa-ackerman-1-8-scale-aniplex-attack-on-titan",
    },
  ];

  const mangaProducts: ProductSeed[] = [
    {
      title: "One Piece Vol. 1 — VIZ Media First Edition",
      description:
        "One Piece Volume 1 first edition print by VIZ Media. Good condition with some yellowing to pages, cover intact.",
      price: "12.99",
      condition: "GOOD",
      metadata: {
        volume: 1,
        publisher: "VIZ Media",
        language: "EN",
        edition: "First Edition",
      },
      slug: "one-piece-vol-1-viz-media-first-edition",
    },
    {
      title: "Demon Slayer Vol. 1-23 Complete Set — VIZ Media",
      description:
        "Complete Demon Slayer manga series volumes 1 through 23 in English by VIZ Media. Near mint across all volumes, unread set.",
      price: "149.99",
      condition: "NEAR_MINT",
      metadata: {
        volume: "1-23",
        publisher: "VIZ Media",
        language: "EN",
        edition: "Standard",
      },
      slug: "demon-slayer-vol-1-23-complete-set-viz-media",
    },
    {
      title: "Berserk Vol. 1 — Dark Horse Comics First Print",
      description:
        "Berserk Volume 1 from Dark Horse Comics, first print run. Excellent condition — minimal shelf wear, spine tight.",
      price: "24.99",
      condition: "EXCELLENT",
      metadata: {
        volume: 1,
        publisher: "Dark Horse Comics",
        language: "EN",
        edition: "First Print",
      },
      slug: "berserk-vol-1-dark-horse-comics-first-print",
    },
    {
      title: "Dragon Ball Z Vol. 1 Viz Big Edition — VIZ Media",
      description:
        "Dragon Ball Z Volume 1 in the oversized Viz Big Edition format by VIZ Media. Near mint with collector's slip cover.",
      price: "19.99",
      condition: "NEAR_MINT",
      metadata: {
        volume: 1,
        publisher: "VIZ Media",
        language: "EN",
        edition: "Viz Big Edition",
      },
      slug: "dragon-ball-z-vol-1-viz-big-edition-viz-media",
    },
  ];

  const limitedProducts: ProductSeed[] = [
    {
      title: "Street Fighter 30th Anniversary 1/1000 Polystone Statue — PCS",
      description:
        "Premium Collectibles Studio Street Fighter 30th Anniversary polystone statue, limited to 1000 pieces worldwide. Certificate of Authenticity included. Mint in original packaging.",
      price: "399.99",
      condition: "MINT",
      metadata: {
        editionSize: 1000,
        editionNumber: 247,
        manufacturer: "Premium Collectibles Studio",
        certificate: true,
      },
      slug: "street-fighter-30th-anniversary-1-1000-polystone-statue-pcs",
    },
    {
      title: "Zelda: Tears of the Kingdom Collector's Edition Artbook",
      description:
        "Official artbook from the Zelda: Tears of the Kingdom Collector's Edition. Near mint, stored flat, never displayed.",
      price: "59.99",
      condition: "NEAR_MINT",
      metadata: {
        editionSize: null,
        editionNumber: null,
        publisher: "Nintendo",
        format: "Hardcover Artbook",
      },
      slug: "zelda-tears-of-the-kingdom-collectors-edition-artbook",
    },
    {
      title: "Pokémon 25th Anniversary Celebrations Ultra-Premium Collection",
      description:
        "Pokémon 25th Anniversary Celebrations Ultra-Premium Collection box. Excellent condition — box opened, all packs and accessories inside remain sealed.",
      price: "189.99",
      condition: "EXCELLENT",
      metadata: {
        editionSize: null,
        editionNumber: null,
        publisher: "The Pokémon Company",
        anniversary: "25th",
      },
      slug: "pokemon-25th-anniversary-celebrations-ultra-premium-collection",
    },
  ];

  const retroProducts: ProductSeed[] = [
    {
      title: "The Legend of Zelda: Ocarina of Time — CIB N64",
      description:
        "Complete in Box Nintendo 64 copy of Ocarina of Time. Cartridge, box, and manual all present. Good condition — box has some shelf wear.",
      price: "89.99",
      condition: "GOOD",
      metadata: {
        completeness: "CIB",
        hasBox: true,
        hasManual: true,
        platform: "Nintendo 64",
        region: "NTSC-U",
      },
      slug: "legend-of-zelda-ocarina-of-time-cib-n64",
    },
    {
      title: "Super Mario Bros. / Duck Hunt — CIB NES",
      description:
        "Classic NES dual-game cartridge complete in box. Fair condition — box shows significant wear but is intact. Manual included.",
      price: "49.99",
      condition: "FAIR",
      metadata: {
        completeness: "CIB",
        hasBox: true,
        hasManual: true,
        platform: "Nintendo Entertainment System",
        region: "NTSC-U",
      },
      slug: "super-mario-bros-duck-hunt-cib-nes",
    },
    {
      title: "Final Fantasy VII — Complete PlayStation 1",
      description:
        "Complete Final Fantasy VII for PlayStation 1 with all three discs, case, and manual. Excellent condition — discs scratch-free.",
      price: "79.99",
      condition: "EXCELLENT",
      metadata: {
        completeness: "Complete",
        hasBox: true,
        hasManual: true,
        platform: "PlayStation 1",
        region: "NTSC-U",
      },
      slug: "final-fantasy-vii-complete-playstation-1",
    },
    {
      title: "GoldenEye 007 — Cartridge Only N64",
      description:
        "GoldenEye 007 for Nintendo 64, cartridge only. Good condition — label intact, connector clean.",
      price: "34.99",
      condition: "GOOD",
      metadata: {
        completeness: "Cartridge Only",
        hasBox: false,
        hasManual: false,
        platform: "Nintendo 64",
        region: "NTSC-U",
      },
      slug: "goldeneye-007-cartridge-only-n64",
    },
  ];

  // Map category slug to product list
  const productsByCategorySlug: Record<string, ProductSeed[]> = {
    "tcg": tcgProducts,
    "funko-pop": funkoProducts,
    "anime-figure": animeProducts,
    "manga": mangaProducts,
    "limited-edition": limitedProducts,
    "retro-game": retroProducts,
  };

  // Create all products with 2 images each
  let totalProducts = 0;
  for (const [slug, products] of Object.entries(productsByCategorySlug)) {
    const categoryId = catBySlug[slug];
    if (!categoryId) {
      throw new Error(`Category not found for slug: ${slug}`);
    }

    for (const p of products) {
      await prisma.product.create({
        data: {
          sellerId: seller.id,
          categoryId,
          title: p.title,
          description: p.description,
          price: p.price,
          condition: p.condition,
          listingType: "DIRECT_SALE",
          status: "ACTIVE",
          metadata: p.metadata,
          images: {
            create: [
              {
                url: `https://picsum.photos/seed/${p.slug}/800/800`,
                isPrimary: true,
                sortOrder: 0,
              },
              {
                url: `https://picsum.photos/seed/${p.slug}-2/800/800`,
                isPrimary: false,
                sortOrder: 1,
              },
            ],
          },
        },
      });
      totalProducts++;
    }
  }

  console.log(`Products seeded: ${totalProducts} across 6 categories.`);
  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
