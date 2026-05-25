# Pet Care Platform

**Language:** English | [Українська](./README.md)

An information system for organising pet-care services with geospatial route analysis.

A web platform that lets pet owners find caretakers (dog-walking, pet-sitting, boarding, grooming), book services and follow walks in real time via GPS tracking with PostGIS-powered geospatial analytics.

> Master's thesis: "Development of an information system for organising pet-care services with geospatial route analysis."

## Key features

- **Caretaker search** — public catalogue with filters by service, location, price and pet type; map view with marker clustering; popularity score based on booking volume.
- **Caretaker profiles** — bio, skills, certificates, spoken languages, photo gallery, tiered pricing with regular/weekend/holiday day types, size-based surcharges, add-on services, per-service-type cancellation policies.
- **Bookings** — order creation, two-sided handover/return confirmation, dynamic pricing that respects Ukrainian public holidays for multi-day stays.
- **GPS walk tracking** — three-level model `TrackingSession → WalkSegment → TrackPoint`, point buffering in Redis, real-time WebSocket streaming, optional safety geofences.
- **Geospatial analysis** — PostGIS calculations for distance, area and zone intersections; nearby search via `ST_DWithin`.
- **Reviews & ratings** — one review per completed booking, 1–5 stars.
- **Chat** — direct messaging between owners and caretakers over WebSocket.
- **Media uploads** — presigned URLs to MinIO/S3, image processing with `sharp`, polymorphic `MediaItem` registry.
- **Favourites** — saved caretakers.

## Tech stack

### Backend (`apps/api`)
- Node.js 20+ · NestJS · TypeScript (strict)
- TypeORM · PostgreSQL 16 + PostGIS · Redis
- JWT (access + refresh) · bcrypt · class-validator
- WebSockets (Socket.IO via `@nestjs/websockets`)
- `@nestjs/schedule` (cron) · Swagger
- MinIO (S3-compatible storage) · `sharp` · `multer`

### Frontend (`apps/web`)
- React 18+ · TypeScript (strict) · Vite
- React Router v7 · Zustand · Axios
- Tailwind CSS · shadcn/ui · Leaflet (maps)

### Shared (`packages/shared`)
- Shared types, enums, templates and validation constants for both backend and frontend

### Infrastructure
- pnpm workspaces (monorepo) · Docker Compose
- PostgreSQL+PostGIS, Redis, MinIO containerised

## Architecture

A modular monolith. All server-side logic lives in a single NestJS application split into isolated modules:

```
apps/api/src/modules/
├── auth/           — sign-up, sign-in, JWT
├── users/          — user profiles, caretaker profiles, certificates, availability
├── pets/           — pet cards
├── services/       — caretaker offerings: tiers, surcharges, add-ons, policies
├── bookings/       — orders, statuses, dynamic pricing
├── tracking/       — GPS ingest, storage, streaming
├── geo/            — geospatial analysis (PostGIS)
├── reviews/        — reviews & ratings
├── storage/        — MinIO/S3 client wrapper
├── media/          — media-item registry
├── chat/           — direct messaging
├── favorites/      — saved caretakers
└── payments/       — payment-flow stub
```

**Communication:**
- REST for CRUD (auth, users, pets, bookings, reviews, search, media, chat history, favorites)
- WebSocket namespaces: `/tracking` (GPS stream) and `/chat` (messaging)

**Data patterns:**
- Repository pattern — data access isolated from business logic
- All geographic data stored as PostGIS `geometry`/`geography`, SRID 4326 (WGS 84)
- GPS points buffered in Redis before batch insertion into Postgres

## Repository layout

```
pet-care-platform/
├── apps/
│   ├── api/                  — NestJS backend
│   └── web/                  — React frontend
├── packages/
│   └── shared/               — shared types, enums, templates
├── tools/
│   └── gps-emulator/         — GPS tracker emulator for testing
├── docker-compose.yml        — Postgres+PostGIS, Redis, MinIO
└── pnpm-workspace.yaml
```

## Requirements

- Node.js 20+
- pnpm 10+
- Docker & Docker Compose

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/teresabacho/pet-care-platform.git
cd pet-care-platform
pnpm install
```

### 2. Configure environment variables

Create a `.env` file at the repository root — see [Environment variables](#environment-variables) below.

### 3. Start infrastructure

```bash
docker compose up -d
```

This launches PostgreSQL+PostGIS (`:5432`), Redis (`:6379`) and MinIO (`:9000` API, `:9001` console). A one-shot `minio-init` container creates the `pet-care-public` and `pet-care-private` buckets automatically.

### 4. Build the shared package

```bash
cd packages/shared && pnpm run build
```

> Run this after **every** change inside `packages/shared/src/`.

### 5. Start the backend (dev mode)

```bash
cd apps/api && pnpm run start:dev
```

The API starts on `http://localhost:3000`. Swagger docs: `http://localhost:3000/api`.

### 6. Start the frontend (dev mode)

```bash
cd apps/web && pnpm run dev
```

Web app: `http://localhost:5173`.

### 7. (Optional) GPS emulator for tracking tests

```bash
cd tools/gps-emulator && pnpm run start
```

## Environment variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petcare
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# App
APP_PORT=3000
FRONTEND_URL=http://localhost:5173

# GPS tracking
BACKGROUND_POINTS_TTL_HOURS=12

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_PUBLIC_BUCKET=pet-care-public
S3_PRIVATE_BUCKET=pet-care-private
S3_PUBLIC_URL_BASE=http://localhost:9000/pet-care-public
S3_FORCE_PATH_STYLE=true

# Presigned URL TTLs (seconds)
PRESIGNED_UPLOAD_TTL_SECONDS=900
PRESIGNED_DOWNLOAD_TTL_SECONDS=3600

# Media limits (bytes)
MEDIA_MAX_AVATAR_BYTES=5242880
MEDIA_MAX_GALLERY_IMAGE_BYTES=10485760
MEDIA_MAX_GALLERY_VIDEO_BYTES=78643200
MEDIA_MAX_REVIEW_IMAGE_BYTES=5242880
MEDIA_MAX_MESSAGE_IMAGE_BYTES=10485760
MEDIA_MAX_MESSAGE_VIDEO_BYTES=104857600
MEDIA_MAX_MESSAGE_DOC_BYTES=20971520
```

## Testing

```bash
# Backend unit tests
cd apps/api && pnpm run test

# Backend end-to-end tests
cd apps/api && pnpm run test:e2e
```

## Conventions

- TypeScript in strict mode; no `any` — use `unknown` when necessary
- Code, comments, identifiers and git commits are in English
- UI-facing strings are in Ukrainian
- Git commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- PostGIS coordinates are always in `longitude, latitude` order (SRID 4326)

## Author

Teresa Bacho · Master's thesis
