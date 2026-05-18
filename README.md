# Collectavo

A collectibles marketplace platform for buyers and sellers of Funko figures, Trading Card Games (Pokémon, One Piece, Yu-Gi-Oh), anime figures, manga, limited edition collectibles, and retro video game items.

## Architecture

Three independent applications:

- **Angular 20 frontend** — buyer/seller UI (`apps/frontend/`, port 4200)
- **NestJS BFF** — API gateway / reverse proxy (`apps/bff/`, port 3000)
- **NestJS Core API** — business logic and database access (`apps/core-api/`, port 3001)
- **PostgreSQL 17** — database (port 5432)

All services run together via Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2)
- Node.js 22+ and npm (for running CLI commands outside Docker)

## Local Development Setup

### 1. Copy and configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set real values for `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`. The defaults in `.env.example` are fine for local development.

### 2. Start all services

```bash
docker compose up -d --wait
```

This starts PostgreSQL, Core API, BFF, and the Angular frontend. The `--wait` flag waits until all healthchecks pass before returning.

### 3. Run database migrations (first-time setup)

Wait for the Core API container to show "Nest application successfully started" in logs, then:

```bash
docker compose exec core-api npx prisma migrate dev --name init
```

> Note: `prisma migrate dev` is intentional here (not `prisma db push`). Migration files are committed to source control for a reproducible, reviewable history.

### 4. Seed the database

```bash
docker compose exec core-api npx prisma db seed
```

This creates 6 product categories, one Seller account, and one Buyer account (see credentials below).

## Development URLs

| Service   | URL                   | Description                      |
|-----------|-----------------------|----------------------------------|
| Frontend  | http://localhost:4200 | Angular dev server               |
| BFF       | http://localhost:3000 | NestJS API gateway               |
| Core API  | http://localhost:3001 | NestJS business logic API        |
| Postgres  | localhost:5432        | PostgreSQL (dev tooling access)  |

## Seeded Developer Accounts

After running `prisma db seed`:

| Role   | Email                     | Password    |
|--------|---------------------------|-------------|
| Seller | seller@collectavo.dev     | Seller123!  |
| Buyer  | buyer@collectavo.dev      | Buyer123!   |

## Useful Commands

```bash
# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f core-api

# Stop all services
docker compose down

# Stop and delete volumes (full reset)
docker compose down -v

# Open Prisma Studio (database GUI)
docker compose exec core-api npx prisma studio

# Run the Core API tests
docker compose exec core-api npm test
```

## Hot Reload

Source file changes are detected automatically:

- **NestJS services** (BFF, Core API): `nest start --watch` with polling-based file watching
- **Angular frontend**: `ng serve` with `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true`

> Windows users: Hot reload uses polling (not inotify) because Windows filesystem events do not propagate to Docker's Linux VM. This works correctly out of the box.

## Project Structure

```
collectavo/
├── docker-compose.yml        # all 4 services
├── .env                      # gitignored — real credentials
├── .env.example              # committed — placeholder values
├── .gitignore
├── README.md
└── apps/
    ├── frontend/             # Angular 20
    │   ├── Dockerfile.dev
    │   ├── package.json
    │   └── src/
    ├── bff/                  # NestJS BFF (API gateway)
    │   ├── Dockerfile.dev
    │   ├── package.json
    │   └── src/
    └── core-api/             # NestJS Core API
        ├── Dockerfile.dev
        ├── package.json
        ├── prisma/           # schema + migrations + seed
        └── src/
```
