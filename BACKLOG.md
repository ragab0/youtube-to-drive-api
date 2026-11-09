# 📋 Project Backlog — yt-2-drive API

> Legend: ✅ Done · 🟡 Partial · ⬜ Not started
> Stack: NestJS 12 (ESM) · TypeORM + Postgres (Neon) · Google OAuth · nestjs-pino · Zod

---

## 🗄️ Epic 1 — Database & Persistence

| #   | Feature                                                                                    | Status | Location                           |
| --- | ------------------------------------------------------------------------------------------ | ------ | ---------------------------------- |
| 1.1 | TypeORM Postgres connection (`forRootAsync`) reading `DATABASE_URL`                        | ✅     | `src/app.module.ts`                |
| 1.2 | `User` entity — uuid PK, unique `googleSub`, `email`, nullable `refreshToken`, `createdAt` | ✅     | `src/users/user.entity.ts`         |
| 1.3 | `synchronize` gated to development only                                                    | ✅     | `src/app.module.ts`                |
| 1.4 | Neon serverless SQL client (`DatabaseService`) for raw queries                             | ✅     | `src/database/database.service.ts` |
| 1.5 | Migrations strategy (replace dev `synchronize`)                                            | ⬜     | —                                  |

## ⚙️ Epic 2 — Configuration & Environment

| #   | Feature                                                        | Status | Location                      |
| --- | -------------------------------------------------------------- | ------ | ----------------------------- |
| 2.1 | Global `ConfigModule` (`isGlobal: true`, `cache: true`)        | ✅     | `src/config/config.module.ts` |
| 2.2 | Boot-time env validation with Zod, fail-fast + treeified error | ✅     | `src/config/configuration.ts` |
| 2.3 | Typed config keys (client IDs, keys, URLs, `PORT`, `NODE_ENV`) | ✅     | `src/config/configuration.ts` |
| 2.4 | `.env.example` / documentation of required vars                | ⬜     | —                             |

## 🔐 Epic 3 — Authentication (Google OAuth)

| #   | Feature                                                         | Status | Location                      |
| --- | --------------------------------------------------------------- | ------ | ----------------------------- |
| 3.1 | `GET /api/auth/google` — generate consent URL with CSRF `state` | ✅     | `src/auth/auth.controller.ts` |
| 3.2 | `GET /api/auth/google/callback` — state check + code exchange   | ✅     | `src/auth/auth.controller.ts` |
| 3.3 | Google ID token verification + `drive.file` scope enforcement   | ✅     | `src/auth/auth.service.ts`    |
| 3.4 | User upsert by `googleSub` with offline refresh token           | ✅     | `src/auth/auth.service.ts`    |
| 3.5 | `POST /api/auth/logout` — clears session                        | ✅     | `src/auth/auth.controller.ts` |
| 3.6 | `GET /api/auth/me` — session-aware user info                    | ✅     | `src/auth/auth.controller.ts` |
| 3.7 | `AuthGuard` + `@CurrentUser()` decorator                        | ✅     | `src/auth/auth.guard.ts`      |
| 3.8 | Refresh-token rotation / token refresh flow                     | ⬜     | —                             |
| 3.9 | JWT issuance (package present, not wired)                       | 🟡     | `@nestjs/jwt` in deps         |

## 🔒 Epic 4 — Security & Crypto

| #   | Feature                                                           | Status | Location                      |
| --- | ----------------------------------------------------------------- | ------ | ----------------------------- |
| 4.1 | AES-256-GCM `CryptoService` (encrypt/decrypt)                     | ✅     | `src/crypto.ts`               |
| 4.2 | Encrypted refresh tokens at rest                                  | ✅     | `src/auth/auth.service.ts`    |
| 4.3 | Signed `cookie-session` (httpOnly, sameSite=lax, secure in https) | ✅     | `src/main.ts`                 |
| 4.4 | OAuth CSRF protection via `state`                                 | ✅     | `src/auth/auth.controller.ts` |
| 4.5 | Rate limiting / throttler                                         | ⬜     | —                             |

## 👤 Epic 5 — Users Module

| #   | Feature                                                                  | Status | Location                     |
| --- | ------------------------------------------------------------------------ | ------ | ---------------------------- |
| 5.1 | `UsersModule` with `TypeOrmModule.forFeature([User])`                    | ✅     | `src/users/users.module.ts`  |
| 5.2 | `getById`, `getBySub`, `getByEmail` (case-insensitive), `list`, `delete` | ✅     | `src/users/users.service.ts` |
| 5.3 | User-facing REST endpoints (profile, etc.)                               | ⬜     | no `UsersController` yet     |

## 📊 Epic 6 — Observability & Logging

| #   | Feature                                                   | Status | Location            |
| --- | --------------------------------------------------------- | ------ | ------------------- |
| 6.1 | `nestjs-pino` logger with request redaction (auth/cookie) | ✅     | `src/app.module.ts` |
| 6.2 | Pretty logs in dev, JSON in prod (transport gating)       | ✅     | `src/app.module.ts` |
| 6.3 | `@nestjs/observe` traces/errors/metrics integration       | ✅     | `src/app.module.ts` |
| 6.4 | Health check endpoint (`@nestjs/terminus`)                | ⬜     | —                   |

## 🚀 Epic 7 — App Bootstrap & Infrastructure

| #   | Feature                                                       | Status | Location                     |
| --- | ------------------------------------------------------------- | ------ | ---------------------------- |
| 7.1 | Global `/api` route prefix                                    | ✅     | `src/main.ts`                |
| 7.2 | Graceful shutdown hooks (`enableShutdownHooks`)               | ✅     | `src/main.ts`                |
| 7.3 | Configurable port (`PORT`, default 8080)                      | ✅     | `src/main.ts`                |
| 7.4 | ESM project setup (`.js` imports, Vitest)                     | ✅     | `package.json`               |
| 7.5 | Tests for services/controllers (only boilerplate spec exists) | 🟡     | `src/app.controller.spec.ts` |
| 7.6 | CI pipeline                                                   | ⬜     | —                            |

## 📁 Epic 8 — Drive (Core Product)

| #   | Feature                                               | Status | Location                   |
| --- | ----------------------------------------------------- | ------ | -------------------------- |
| 8.1 | `drive.file` scope requested + validated              | ✅     | `src/auth/auth.service.ts` |
| 8.2 | Upload YouTube → Drive transfer logic                 | ⬜     | —                          |
| 8.3 | Drive folder management / file listing                | ⬜     | —                          |
| 8.4 | Background job queue for transfers (`@nestjs/bullmq`) | ⬜     | —                          |

---

## 🎯 Suggested Next Steps (priority order)

1. **8.2 / 8.4** — Core drive upload flow + queue (the actual product).
2. **3.8** — Refresh-token rotation (tokens currently stored but never refreshed).
3. **5.3** — `UsersController` to expose the service.
4. **1.5** — Migrations to safely evolve the schema beyond dev `synchronize`.
5. **7.5 / 7.6** — Real tests + CI.

---

## 🔍 Code Observations

- **Unused dependency**: `@nestjs/jwt` is installed but there's no JWT usage — auth is currently session-based. Worth either wiring it or removing it.
- **`DatabaseService` is currently sample code** — `getData()` runs `SELECT NOW()` and isn't consumed anywhere in the app yet, so it may be premature.
- **TypeORM + Neon + raw `neon()`** coexist — you have two DB access paths. Decide which is canonical to avoid confusion.
