# AGENTS.md — TaskFlow Sample Test App

This file instructs AI agents (Claude Code, Copilot, Gemini CLI, etc.) on how to work in this repository.

---

## What This App Is

TaskFlow is a full-stack task-management application built as a **realistic test target** for UI, API, security, and performance testing. It is not a production product — it is intentionally designed to expose testable patterns: authentication flows, RBAC, CRUD across related entities, pagination, search, and a full browser UI.

Do not simplify or strip features for the sake of "cleanliness." Testability requires realistic complexity.

---

## Stack

| Layer | Technology |
|-------|-----------|
| API | Node.js 20 + Fastify 5 + TypeScript |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM |
| Frontend | React 18 + Vite + TailwindCSS |
| Design system | `DESIGN.md` — Vercel-inspired token set |
| Auth | JWT (`@fastify/jwt`) + API key (`X-API-Key` header) |
| API docs | `@fastify/swagger` + `@fastify/swagger-ui` at `/docs` |
| Monorepo | npm workspaces (`backend/`, `frontend/`) |

---

## Repository Layout

```
sample-app/
├── AGENTS.md           ← this file
├── DESIGN.md           ← design system tokens (Vercel-inspired)
├── package.json        ← root npm workspace
├── backend/
│   ├── src/
│   │   ├── db/         ← Drizzle schema + DB connection
│   │   ├── plugins/    ← Fastify plugins (auth, swagger, cors, rate-limit)
│   │   ├── routes/     ← One file per resource group
│   │   ├── middleware/ ← authenticate.ts (JWT + API key resolver)
│   │   └── hooks/      ← rbac.ts (role-based access)
│   └── data/           ← SQLite file (git-ignored)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/     ← Primitives mapped from DESIGN.md tokens
    │   │   └── app/    ← Feature components
    │   ├── pages/      ← Route-level components
    │   ├── hooks/      ← Data fetching hooks
    │   └── lib/api.ts  ← Typed API client
    └── ...
```

---

## Design System

**All UI work must use tokens from `DESIGN.md`.** Key rules:

- Background: `canvas-soft` (`#fafafa`) for pages, `canvas` (`#ffffff`) for cards
- Text: `ink` (`#171717`) for headings/body, `body` (`#4d4d4d`) for secondary
- Primary CTA: `button-primary` — black pill (`rounded.pill` 100px), `button-primary-sm` for nav-scale
- Forms: `form-input` (40px height, `rounded.sm` 6px, hairline border)
- Cards: `card-marketing` (`rounded.md` 8px, `spacing.lg` padding)
- Auth pages: `ex-auth-form-card` chrome
- Tables: `ex-data-table-cell` pattern (mono header, `body-sm` rows)
- Toasts: `ex-toast` surface
- Modals: `ex-modal-card` surface
- Empty states: `ex-empty-state-card`
- Font: Geist (geometric sans) + Geist Mono (technical labels/code only)
- Never use weight > 600, never all-caps headlines, never a single heavy drop-shadow

---

## API Conventions

- Base path: `/api/v1`
- All request/response bodies are JSON
- Auth: `Authorization: Bearer <jwt>` OR `X-API-Key: <key>`
- Pagination: `?page=1&limit=20` → `{ data: [...], meta: { page, limit, total, totalPages } }`
- Errors: `{ statusCode, error, message }`
- OpenAPI spec: `GET /docs/json`, Swagger UI: `GET /docs`

### Auth endpoints
- `POST /api/v1/auth/login` → `{ access_token, refresh_token, user }`
- `POST /api/v1/auth/refresh` → `{ access_token }`
- `POST /api/v1/auth/logout` (JWT required)
- `GET /api/v1/auth/me` (JWT or API Key)

### System endpoints
- `GET /api/v1/health` — no auth required
- `GET /api/v1/metrics` — no auth required
- `POST /api/v1/seed` — resets and seeds DB, **dev only** (`NODE_ENV !== 'production'`)

---

## Authentication Design

Two auth mechanisms, both supported on all protected routes:

1. **JWT** — `Authorization: Bearer <token>`. Access token expires in 15 min. Refresh token (7 days) stored hashed in `refresh_tokens` table.
2. **API Key** — `X-API-Key: <raw_key>` header. Key stored as SHA-256 hash. Raw key shown once on creation.

`middleware/authenticate.ts` resolves in this order: Bearer → X-API-Key → unauthenticated.

**RBAC:**
- `admin`: full access to all resources
- `user`: access to own data + projects they are members of
- Project `owner` role: can update/delete project and manage members

---

## Seed Accounts

After `POST /api/v1/seed`:

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@test.com` | `admin123` |
| user | `user@test.com` | `user123` |

Seed response also includes raw API keys for both users.

---

## Running the App

```bash
# Install all dependencies (from repo root)
npm install

# Start backend on :3000
npm run dev -w backend

# Start frontend on :5173
npm run dev -w frontend

# Reset and seed the database
curl -X POST http://localhost:3000/api/v1/seed

# Open API docs
open http://localhost:3000/docs
```

Environment variables (backend):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `JWT_SECRET` | — | Required in production |
| `NODE_ENV` | `development` | Set to `production` to disable seed endpoint |
| `DB_PATH` | `./data/app.db` | SQLite file path |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

---

## Code Style

- TypeScript strict mode throughout
- Fastify routes use inline JSON Schema for all request/response shapes — this is what generates the OpenAPI spec, do not skip it
- Drizzle schema is the single source of truth for the DB — no raw SQL for schema changes
- No `any` types
- Keep route files focused on a single resource; shared logic goes in `middleware/` or `hooks/`
- Frontend components in `ui/` must be stateless and accept only props derived from DESIGN.md tokens
- No `console.log` in committed code — use Fastify's built-in `request.log`

---

## Testing Guidance for External Testers

This app is a test target. Common test entry points:

- **UI testing**: Login at `http://localhost:5173/login` with seed credentials
- **API testing**: Import `http://localhost:3000/docs/json` into Postman/Insomnia
- **Security testing**: Auth bypass attempts, IDOR on `/tasks/:id`, SQL injection on filter params, JWT algorithm confusion, API key brute-force (rate limited at 20/min on auth routes)
- **Performance testing**: `GET /projects/:id/tasks` with large seed data, `GET /metrics` for baseline latency stats

---

## Full Design Spec

See [`docs/superpowers/specs/2026-05-19-sample-app-design.md`](docs/superpowers/specs/2026-05-19-sample-app-design.md) for the complete design including all data models, route tables, and UI page specs.
