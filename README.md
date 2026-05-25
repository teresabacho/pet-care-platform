# Pet Care Platform

**Мова:** Українська | [English](./README.en.md)

Інформаційна система для організації послуг догляду за тваринами з геопросторовим аналізом маршрутів.

Веб-платформа дозволяє власникам тварин знаходити доглядальників (вигул, перетримка, передержка вдома, грумінг), бронювати послуги та відстежувати прогулянки у реальному часі через GPS-трекінг із геопросторовою аналітикою на базі PostGIS.

> Магістерська дипломна робота на тему «Розробка інформаційної системи для організації послуг догляду за тваринами з геопросторовим аналізом маршрутів».

## Ключові можливості

- **Пошук доглядальників** — публічний каталог із фільтрами за послугами, локацією, ціною та видом тварини; карта пропозицій із кластеризацією; популярність на основі бронювань.
- **Профілі доглядальників** — біографія, навички, сертифікати, мовні навички, фото-галерея, цінові тарифи з днями типу «вихідний/свято», доплати за розмір тварини, додаткові послуги, політики скасування для кожного типу послуги.
- **Бронювання** — створення замовлень, двосторонні підтвердження «передача — повернення», динамічний розрахунок ціни з урахуванням святкових днів.
- **GPS-трекінг прогулянок** — трирівнева модель `TrackingSession → WalkSegment → TrackPoint`, буферизація точок у Redis, WebSocket-стрім у реальному часі, опціональні гео-зони безпеки (geofences).
- **Геопросторовий аналіз** — PostGIS-обчислення відстаней, площ, перетинів зон; пошук поблизу через `ST_DWithin`.
- **Відгуки та рейтинги** — один відгук на завершене бронювання, оцінка 1–5.
- **Чат** — особисті повідомлення між власниками та доглядальниками через WebSocket.
- **Завантаження медіа** — пресайн-URL до MinIO/S3, обробка зображень через `sharp`, поліморфний реєстр `MediaItem`.
- **Обране** — збереження доглядальників.

## Технологічний стек

### Backend (`apps/api`)
- Node.js 20+ · NestJS · TypeScript (strict)
- TypeORM · PostgreSQL 16 + PostGIS · Redis
- JWT (access + refresh) · bcrypt · class-validator
- WebSocket (Socket.IO via `@nestjs/websockets`)
- `@nestjs/schedule` (cron) · Swagger
- MinIO (S3-сумісне сховище) · `sharp` · `multer`

### Frontend (`apps/web`)
- React 18+ · TypeScript (strict) · Vite
- React Router v7 · Zustand · Axios
- Tailwind CSS · shadcn/ui · Leaflet (карти)

### Shared (`packages/shared`)
- Спільні типи, enum-и, шаблони, валідаційні константи для backend і frontend

### Інфраструктура
- pnpm workspaces (monorepo) · Docker Compose
- PostgreSQL+PostGIS, Redis, MinIO у Docker

## Архітектура

Модульний моноліт. Уся серверна логіка — в одному NestJS-застосунку, розділеному на ізольовані модулі:

```
apps/api/src/modules/
├── auth/           — реєстрація, логін, JWT
├── users/          — профілі користувачів, доглядальників, сертифікати, доступність
├── pets/           — картки тварин
├── services/       — послуги доглядальника: тарифи, доплати, додатки, політики
├── bookings/       — замовлення, статуси, динамічна ціна
├── tracking/       — GPS: прийом, зберігання, стрім
├── geo/            — геопросторовий аналіз (PostGIS)
├── reviews/        — відгуки та рейтинги
├── storage/        — клієнт до MinIO/S3
├── media/          — реєстр медіа-файлів
├── chat/           — особисті повідомлення
├── favorites/      — обрані доглядальники
└── payments/       — заглушка платіжного потоку
```

**Комунікація:**
- REST для CRUD (auth, users, pets, bookings, reviews, search, media, chat-історія, favorites)
- WebSocket-неймспейси: `/tracking` (GPS-стрім) і `/chat` (повідомлення)

**Робота з даними:**
- Repository-патерн (доступ до даних ізольовано від бізнес-логіки)
- Усі гео-дані — як `geometry`/`geography` PostGIS, SRID 4326 (WGS 84)
- GPS-точки буферизуються в Redis перед batch-вставкою у Postgres

## Структура репозиторію

```
pet-care-platform/
├── apps/
│   ├── api/                  — NestJS backend
│   └── web/                  — React frontend
├── packages/
│   └── shared/               — спільні типи, enum-и, шаблони
├── tools/
│   └── gps-emulator/         — емулятор GPS-трекера для тестів
├── docker-compose.yml        — Postgres+PostGIS, Redis, MinIO
└── pnpm-workspace.yaml
```

## Вимоги

- Node.js 20+
- pnpm 10+
- Docker та Docker Compose

## Запуск проєкту

### 1. Клонування та встановлення залежностей

```bash
git clone https://github.com/teresabacho/pet-care-platform.git
cd pet-care-platform
pnpm install
```

### 2. Налаштування змінних оточення

Створіть файл `.env` у корені проєкту. Список змінних — див. розділ [Змінні оточення](#змінні-оточення).

### 3. Запуск інфраструктури

```bash
docker compose up -d
```

Підніме контейнери: PostgreSQL+PostGIS (`:5432`), Redis (`:6379`), MinIO (`:9000` API, `:9001` консоль). MinIO-init автоматично створить бакети `pet-care-public` і `pet-care-private`.

### 4. Збірка спільного пакета

```bash
cd packages/shared && pnpm run build
```

> Виконуйте після **кожної** зміни в `packages/shared/src/`.

### 5. Запуск backend (dev-режим)

```bash
cd apps/api && pnpm run start:dev
```

API стартує на `http://localhost:3000`. Swagger-документація: `http://localhost:3000/api`.

### 6. Запуск frontend (dev-режим)

```bash
cd apps/web && pnpm run dev
```

Веб-застосунок: `http://localhost:5173`.

### 7. (Опційно) GPS-емулятор для тестування трекінгу

```bash
cd tools/gps-emulator && pnpm run start
```

## Змінні оточення

```bash
# База даних
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

# Застосунок
APP_PORT=3000
FRONTEND_URL=http://localhost:5173

# GPS-трекінг
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

# TTL пресайн-URL (секунди)
PRESIGNED_UPLOAD_TTL_SECONDS=900
PRESIGNED_DOWNLOAD_TTL_SECONDS=3600

# Ліміти медіа (байти)
MEDIA_MAX_AVATAR_BYTES=5242880
MEDIA_MAX_GALLERY_IMAGE_BYTES=10485760
MEDIA_MAX_GALLERY_VIDEO_BYTES=78643200
MEDIA_MAX_REVIEW_IMAGE_BYTES=5242880
MEDIA_MAX_MESSAGE_IMAGE_BYTES=10485760
MEDIA_MAX_MESSAGE_VIDEO_BYTES=104857600
MEDIA_MAX_MESSAGE_DOC_BYTES=20971520
```

## Тестування

```bash
# Unit-тести backend
cd apps/api && pnpm run test

# E2E-тести backend
cd apps/api && pnpm run test:e2e
```

## Конвенції

- TypeScript у strict-режимі; без `any` — використовуйте `unknown` за потреби
- Код, коментарі, імена змінних і git-комміти — англійською
- UI-тексти — українською
- Git-комміти — Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- PostGIS-координати — завжди в порядку `longitude, latitude` (SRID 4326)

## Автор

Тереза Бачо · магістерська робота
