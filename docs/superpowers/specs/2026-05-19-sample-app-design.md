# TaskFlow — Sample Test App Design Spec

**Date:** 2026-05-19
**Status:** Approved
**Purpose:** A realistic full-stack application for UI, API, security, and performance testing.

---

## 1. Overview

TaskFlow is a project and task management application. It exists as a stable, realistic test target — not a production product. It covers the patterns testers need: authentication flows, RBAC, CRUD across related entities, pagination, search, file-less but content-rich responses, and a real browser UI.

---

## 2. Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| API runtime | Node.js 20 + Fastify 5 + TypeScript | Schema-first → OpenAPI is auto-generated, no drift |
| Database | SQLite via `better-sqlite3` | Zero-server, portable, no setup required |
| ORM | Drizzle ORM | Type-safe, lightweight, works well with SQLite |
| Frontend | React 18 + Vite + TailwindCSS | Fast dev server, modern |
| Design system | DESIGN.md (Vercel-inspired) | Consistent, documented token set |
| Auth | `@fastify/jwt` (JWT) + API key middleware | Dual-auth for security testing coverage |
| API docs | `@fastify/swagger` + `@fastify/swagger-ui` | Live OpenAPI spec at `/docs` |
| Monorepo | npm workspaces | Single repo, two packages |

---

## 3. Repository Structure

```
sample-app/
├── AGENTS.md                    ← AI agent instructions
├── DESIGN.md                    ← Design system tokens
├── package.json                 ← Root workspace
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts        ← Drizzle schema definitions
│   │   │   └── index.ts         ← DB connection singleton
│   │   ├── plugins/
│   │   │   ├── auth.ts          ← JWT plugin + decorators
│   │   │   ├── swagger.ts       ← OpenAPI config
│   │   │   ├── cors.ts          ← CORS config
│   │   │   └── rate-limit.ts    ← Rate limiting
│   │   ├── routes/
│   │   │   ├── auth.ts          ← /auth/*
│   │   │   ├── users.ts         ← /users/*
│   │   │   ├── projects.ts      ← /projects/*
│   │   │   ├── tasks.ts         ← /tasks/*
│   │   │   ├── comments.ts      ← /comments/*
│   │   │   ├── api-keys.ts      ← /api-keys/*
│   │   │   ├── health.ts        ← /health
│   │   │   ├── metrics.ts       ← /metrics
│   │   │   └── seed.ts          ← /seed (dev only)
│   │   ├── middleware/
│   │   │   └── authenticate.ts  ← JWT + API key resolver
│   │   ├── hooks/
│   │   │   └── rbac.ts          ← Role-based access hook
│   │   └── server.ts            ← Fastify app factory
│   ├── data/                    ← SQLite file (git-ignored)
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/              ← Primitives from DESIGN.md tokens
    │   │   └── app/             ← Feature components
    │   ├── pages/               ← Route-level page components
    │   ├── hooks/               ← Data fetching hooks
    │   ├── lib/
    │   │   └── api.ts           ← Typed API client
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## 4. Data Model

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| name | TEXT | NOT NULL |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | bcrypt, NOT NULL |
| role | TEXT | `admin` \| `user`, default `user` |
| created_at | INTEGER | Unix timestamp |

### `refresh_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| user_id | TEXT | FK → users |
| token_hash | TEXT | SHA-256 of token |
| expires_at | INTEGER | Unix timestamp |

### `api_keys`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| user_id | TEXT | FK → users |
| name | TEXT | Human label |
| key_hash | TEXT | SHA-256 of raw key |
| last_used_at | INTEGER | Nullable |
| created_at | INTEGER | Unix timestamp |

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| name | TEXT | NOT NULL |
| description | TEXT | Nullable |
| owner_id | TEXT | FK → users |
| created_at | INTEGER | Unix timestamp |

### `project_members`
| Column | Type | Notes |
|--------|------|-------|
| project_id | TEXT | FK → projects |
| user_id | TEXT | FK → users |
| role | TEXT | `owner` \| `member` |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| project_id | TEXT | FK → projects |
| title | TEXT | NOT NULL |
| description | TEXT | Nullable |
| status | TEXT | `todo` \| `in_progress` \| `done` |
| priority | TEXT | `low` \| `medium` \| `high` |
| assignee_id | TEXT | FK → users, nullable |
| due_date | TEXT | ISO date string, nullable |
| created_at | INTEGER | Unix timestamp |

### `comments`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| task_id | TEXT | FK → tasks |
| author_id | TEXT | FK → users |
| body | TEXT | NOT NULL |
| created_at | INTEGER | Unix timestamp |

### `labels`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| project_id | TEXT | FK → projects |
| name | TEXT | NOT NULL |
| color | TEXT | Hex color |

### `task_labels`
| Column | Type | Notes |
|--------|------|-------|
| task_id | TEXT | FK → tasks |
| label_id | TEXT | FK → labels |

---

## 5. API Routes

Base path: `/api/v1`

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Returns `access_token` (JWT, 15 min) + `refresh_token` (7 days) |
| POST | `/auth/refresh` | — | Exchange refresh token for new access token |
| POST | `/auth/logout` | JWT | Revoke refresh token |
| GET | `/auth/me` | JWT\|Key | Returns current user |

### Users (admin-only for list/delete)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | JWT admin | List all users, paginated |
| GET | `/users/:id` | JWT | Get user by id |
| PUT | `/users/:id` | JWT (self or admin) | Update name/email |
| DELETE | `/users/:id` | JWT admin | Delete user |

### API Keys

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api-keys` | JWT | List current user's keys |
| POST | `/api-keys` | JWT | Create key — returns raw key ONCE |
| DELETE | `/api-keys/:id` | JWT | Revoke key |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects` | JWT\|Key | List accessible projects |
| POST | `/projects` | JWT\|Key | Create project |
| GET | `/projects/:id` | JWT\|Key | Get project + members |
| PUT | `/projects/:id` | JWT\|Key | Update project (owner/admin) |
| DELETE | `/projects/:id` | JWT\|Key | Delete project (owner/admin) |
| GET | `/projects/:id/members` | JWT\|Key | List members |
| POST | `/projects/:id/members` | JWT\|Key | Add member |
| DELETE | `/projects/:id/members/:userId` | JWT\|Key | Remove member |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:id/tasks` | JWT\|Key | List tasks (filter: status, priority, assignee; paginate) |
| POST | `/projects/:id/tasks` | JWT\|Key | Create task |
| GET | `/tasks/:id` | JWT\|Key | Get task + labels |
| PUT | `/tasks/:id` | JWT\|Key | Update task |
| DELETE | `/tasks/:id` | JWT\|Key | Delete task |
| POST | `/tasks/:id/labels` | JWT\|Key | Attach label |
| DELETE | `/tasks/:id/labels/:labelId` | JWT\|Key | Detach label |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tasks/:id/comments` | JWT\|Key | List comments |
| POST | `/tasks/:id/comments` | JWT\|Key | Add comment |
| PUT | `/comments/:id` | JWT\|Key | Edit comment (author only) |
| DELETE | `/comments/:id` | JWT\|Key | Delete comment (author or admin) |

### Labels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:id/labels` | JWT\|Key | List project labels |
| POST | `/projects/:id/labels` | JWT\|Key | Create label |
| DELETE | `/labels/:id` | JWT\|Key | Delete label |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | `{ status: "ok", uptime, db: "ok" }` |
| GET | `/metrics` | — | Request count, p50/p95/p99 latency per route |
| POST | `/seed` | — (dev only) | Reset DB and seed test data |

---

## 6. Authentication Design

### JWT Flow
1. `POST /auth/login` → server issues `access_token` (15 min JWT, HS256) + `refresh_token` (opaque UUID, 7 days, stored hashed in DB)
2. Client sends `Authorization: Bearer <access_token>` on every request
3. On 401, client calls `POST /auth/refresh` with `{ refresh_token }` → gets new access token
4. `POST /auth/logout` deletes the refresh token row

### API Key Flow
1. `POST /api-keys` → server generates a 32-byte random key, returns it raw ONCE, stores SHA-256 hash
2. Client sends `X-API-Key: <raw_key>` header
3. Server hashes incoming key and looks up `key_hash` in DB; updates `last_used_at`

### Middleware Resolution Order
`authenticate.ts` checks in this order:
1. `Authorization: Bearer` → validate JWT
2. `X-API-Key` → hash and lookup
3. Neither → request is unauthenticated (some routes allow this)

### RBAC
- `admin` role: full access to all routes
- `user` role: access to own data + projects they are members of
- Project `owner`: can update/delete the project and manage members

### Rate Limits
- Auth routes (`/auth/login`, `/auth/register`): 20 req/min per IP
- All other routes: 500 req/min per IP
- Returns `429` with `Retry-After` header

---

## 7. OpenAPI Spec

- Live Swagger UI: `http://localhost:3000/docs`
- Raw JSON spec: `http://localhost:3000/docs/json`
- Every route has full JSON Schema for request body, params, query, and response
- Security schemes defined: `bearerAuth` (JWT) and `apiKeyAuth` (`X-API-Key` header)

---

## 8. UI Pages

Design tokens from `DESIGN.md` (Vercel design language). All pages use `canvas-soft` background, `ink` text, Geist font family.

| Page | Route | Key Components |
|------|-------|----------------|
| Login | `/login` | `ex-auth-form-card`, `form-input`, `button-primary` pill |
| Register | `/register` | Same as login |
| Dashboard | `/` | Summary stat cards, recent tasks table |
| Projects | `/projects` | `card-marketing` 3-up grid, empty state |
| Project Detail | `/projects/:id` | Kanban board: 3 columns (todo / in_progress / done) |
| Task Detail | `/tasks/:id` | 2-col layout: body + metadata sidebar, comment thread below |
| API Keys | `/settings/api-keys` | `ex-data-table-cell` table, create key modal |
| Profile | `/settings/profile` | `form-input` fields for name/email/password |
| Admin — Users | `/admin/users` | `ex-data-table-cell` table with role badge, admin-only |

### Nav Structure
- Top `nav-bar` (64px): logo left, main links centre, user avatar + logout right
- `nav-link` tokens for all links, `nav-cta-signup` style for primary CTA buttons
- Admin link visible only for `admin` role

### Feedback Patterns
- `ex-toast` for success/error notifications
- `ex-modal-card` for confirmation dialogs (delete project, revoke key)
- `ex-empty-state-card` when lists are empty

---

## 9. Seed Data

`POST /api/v1/seed` resets the database and inserts:

| Entity | Count |
|--------|-------|
| Users | 2 (1 admin: `admin@test.com` / `admin123`, 1 user: `user@test.com` / `user123`) |
| Projects | 3 |
| Tasks | 15 (mix of statuses and priorities) |
| Comments | 10 |
| Labels | 6 |
| API Keys | 1 per user (raw key printed in response) |

Only available when `NODE_ENV !== 'production'`.

---

## 10. Error Responses

All errors follow:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Task not found"
}
```

Standard codes used: `400` (validation), `401` (unauthenticated), `403` (forbidden), `404` (not found), `409` (conflict e.g. duplicate email), `429` (rate limited), `500` (server error).

---

## 11. Pagination

List endpoints support:
- `?page=1&limit=20` (default limit 20, max 100)
- Response envelope:
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 47, "totalPages": 3 }
}
```

---

## 12. Running Locally

```bash
# Install all dependencies
npm install

# Start backend (port 3000)
npm run dev -w backend

# Start frontend (port 5173)
npm run dev -w frontend

# Seed database
curl -X POST http://localhost:3000/api/v1/seed

# View API docs
open http://localhost:3000/docs
```
