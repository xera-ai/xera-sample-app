# AGENTS.md — Xera FlowBoard Sample Test App

This file instructs AI agents (Claude Code, Copilot, Gemini CLI, etc.) on how to work in this repository.

---

## What This App Is

Xera FlowBoard is a full-stack task-management application built as a **realistic test target** for UI, API, security, and performance testing. It is not a production product — it is intentionally designed to expose testable patterns: authentication flows, RBAC, CRUD across related entities, pagination, search, and a full browser UI.

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

## Data Model

Nine tables. Relationships:

```
users (1) ──< refresh_tokens
users (1) ──< api_keys
users (1) ──< project_members >── projects
projects (1) ──< project_members
projects (1) ──< tasks
projects (1) ──< labels
tasks (1) ──< comments
tasks (1) ──< task_labels >── labels
```

### users
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | display name |
| email | TEXT UNIQUE | |
| password | TEXT | bcrypt hash |
| role | TEXT | `'admin'` or `'user'` |
| createdAt | INTEGER | Unix timestamp |

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | |
| description | TEXT | nullable |
| ownerId | TEXT FK | → users.id |
| createdAt | INTEGER | |

### project_members
| Column | Type | Notes |
|--------|------|-------|
| projectId | TEXT PK | → projects.id |
| userId | TEXT PK | → users.id |
| role | TEXT | `'owner'` or `'member'` |

### tasks
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| projectId | TEXT FK | → projects.id |
| title | TEXT | |
| description | TEXT | nullable |
| status | TEXT | `'todo'` \| `'in_progress'` \| `'done'` |
| priority | TEXT | `'low'` \| `'medium'` \| `'high'` |
| assigneeId | TEXT FK | → users.id, nullable |
| dueDate | TEXT | ISO date string, nullable |
| createdAt | INTEGER | |
| updatedAt | INTEGER | nullable |

### comments
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| taskId | TEXT FK | → tasks.id |
| authorId | TEXT FK | → users.id |
| body | TEXT | |
| createdAt | INTEGER | |

### labels
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| projectId | TEXT FK | → projects.id |
| name | TEXT | |
| color | TEXT | hex color |

### task_labels (join)
| Column | Type |
|--------|------|
| taskId | TEXT PK |
| labelId | TEXT PK |

### refresh_tokens
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| userId | TEXT FK | |
| tokenHash | TEXT | SHA-256 of raw token |
| expiresAt | INTEGER | Unix timestamp |

### api_keys
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| userId | TEXT FK | |
| name | TEXT | user-visible label |
| keyHash | TEXT | SHA-256 of raw key |
| lastUsedAt | INTEGER | nullable |
| createdAt | INTEGER | |

---

## Complete API Routes

All routes require auth (`Authorization: Bearer <token>` or `X-API-Key: <key>`) unless noted.

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/auth/register` | none | returns `{ user }` |
| POST | `/api/v1/auth/login` | none | returns `{ access_token, refresh_token, user }` |
| POST | `/api/v1/auth/refresh` | none | body `{ refresh_token }` → `{ access_token }` |
| POST | `/api/v1/auth/logout` | required | revokes refresh token |
| GET | `/api/v1/auth/me` | required | returns `{ user }` |

### Projects
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/api/v1/projects` | member/admin | `?page&limit&search` |
| POST | `/api/v1/projects` | any | auto-adds creator as `owner` member |
| GET | `/api/v1/projects/:id` | member/admin | includes `members[]` |
| PUT | `/api/v1/projects/:id` | owner/admin | update name/description |
| DELETE | `/api/v1/projects/:id` | owner/admin | cascades tasks, comments, labels |
| GET | `/api/v1/projects/:id/members` | member/admin | |
| POST | `/api/v1/projects/:id/members` | owner/admin | body `{ userId, role? }` |
| DELETE | `/api/v1/projects/:id/members/:userId` | owner/admin | |

### Tasks
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/api/v1/projects/:id/tasks` | member/admin | `?status&priority&assigneeId&search&page&limit` |
| POST | `/api/v1/projects/:id/tasks` | member/admin | |
| GET | `/api/v1/tasks/:id` | member/admin | includes `labels[]` |
| PUT | `/api/v1/tasks/:id` | member/admin | partial update |
| DELETE | `/api/v1/tasks/:id` | member/admin | |
| POST | `/api/v1/tasks/:id/labels` | member/admin | body `{ labelId }` |
| DELETE | `/api/v1/tasks/:id/labels/:labelId` | member/admin | |

### Comments
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/api/v1/tasks/:id/comments` | member/admin | `?page&limit`; includes `author` |
| POST | `/api/v1/tasks/:id/comments` | member/admin | body `{ body }` |
| PUT | `/api/v1/comments/:id` | author only | edit own comment |
| DELETE | `/api/v1/comments/:id` | author or admin | |

### Labels
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/api/v1/projects/:id/labels` | member/admin | |
| POST | `/api/v1/projects/:id/labels` | owner/admin | body `{ name, color }` |
| DELETE | `/api/v1/labels/:id` | owner/admin | |

### Users
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/api/v1/users` | admin only | `?page&limit` |
| GET | `/api/v1/users/:id` | self or admin | |
| PUT | `/api/v1/users/:id` | self or admin | |
| DELETE | `/api/v1/users/:id` | admin only | |

### API Keys
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/api-keys` | list own keys |
| POST | `/api/v1/api-keys` | body `{ name }`; raw key returned once |
| DELETE | `/api/v1/api-keys/:id` | revoke key |

### System
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/health` | none | `{ status: "ok" }` |
| GET | `/api/v1/metrics` | none | p50/p95/p99 per route |
| POST | `/api/v1/seed` | none | dev only; resets + seeds DB |

---

## Seed Data

Running `POST /api/v1/seed` (or auto-seed on first boot) creates:

**Users:**
| id | name | email | password | role |
|----|------|-------|----------|------|
| `user-admin` | Admin User | admin@test.com | admin123 | admin |
| `user-1` | Test User | user@test.com | user123 | user |

**Projects** (all have both users as members):
| id | name | ownerId |
|----|------|---------|
| `project-1` | Website Redesign | user-admin |
| `project-2` | Mobile App | user-admin |
| `project-3` | API Integration | user-admin |

**Tasks** (5 per project = 15 total). IDs follow `task-1` through `task-15`. Status distribution per project: 2 `todo`, 2 `done`, 1 `in_progress`. Priority: 2 `high`, 2 `medium`, 1 `low`.

**Labels** (2 per project):
- project-1: `label-1` (Feature, #3b82f6), `label-2` (Bug, #ef4444)
- project-2: `label-3` (Enhancement, #8b5cf6), `label-4` (Design, #f59e0b)
- project-3: `label-5` (Backend, #10b981), `label-6` (Frontend, #f97316)

**Comments:** 2–4 comments per task, alternating authors between admin and user.

**API keys:** One key per user — raw keys printed to backend console on first boot and returned by `/seed`.

---

## UI Pages

| Page | Route | Entry |
|------|-------|-------|
| Login | `/login` | public |
| Register | `/register` | public |
| Dashboard | `/` | stats + 5 recent tasks |
| Projects list | `/projects` | card grid, member count |
| Project detail | `/projects/:id` | Kanban board (columns by status) |
| Task detail | `/tasks/:id` | inline edit, comments, labels, metadata sidebar |
| API Keys | `/settings/api-keys` | list/create/revoke |
| Profile | `/settings/profile` | update name/email/password |
| Admin — Users | `/admin/users` | admin only; list, edit, delete users |

Navigation flow: Login → Dashboard → Projects → Project detail (Kanban) → Task detail

---

## Test Scenarios by Category

### UI Test Flows
1. **Login flow** — visit `/login`, enter `admin@test.com` / `admin123`, assert redirect to dashboard
2. **Create project** — click "New Project", fill name + description, assert card appears in grid
3. **Kanban drag** — open a project, drag a task from "Todo" to "In Progress", assert status badge updates
4. **Task detail** — click a task title, assert description/comments/labels load; edit title inline
5. **Add comment** — type in comment box, click "Comment", assert comment appears with correct author name
6. **Register new user** — visit `/register`, create account, assert redirect to dashboard
7. **Admin user management** — login as admin, visit `/admin/users`, assert user list; delete a user

### API Test Flows
1. **Auth cycle** — `POST /auth/login` → save `access_token` → `GET /auth/me` → `POST /auth/logout`
2. **Token refresh** — wait for access token expiry (or force 401), `POST /auth/refresh` with refresh token
3. **CRUD project** — create → get → update → delete; assert 404 after delete
4. **Pagination** — `GET /projects?page=1&limit=2`, assert `meta.totalPages`
5. **Search** — `GET /projects?search=website`, assert only matching projects returned
6. **Label assignment** — create label, `POST /tasks/:id/labels`, assert label in `GET /tasks/:id`

### Security Test Scenarios
| Scenario | How to test | Expected |
|----------|-------------|----------|
| JWT forged signature | Modify payload, keep same header/sig | 401 |
| JWT `alg: none` | Set `alg: "none"`, remove signature | 401 |
| IDOR — access other user's project | Login as `user@test.com`, GET project owned by different user not in members | 403 |
| IDOR — edit another user's comment | `PUT /comments/<admin-comment-id>` as user | 403 |
| Privilege escalation | `DELETE /users/:id` as `user` role | 403 |
| Missing auth header | Any protected route without token | 401 |
| Expired access token | Use token after 15 min (or tamper `exp`) | 401 |
| API key brute force | Rapid `X-API-Key` guesses on any route | 429 after 500/min |
| Auth brute force | Rapid `POST /auth/login` | 429 after 20/min |
| SQL injection in search | `?search=' OR '1'='1` | safe (parameterized) |
| SQL injection in status filter | `?status=done' OR '1'='1` | 400 (enum validation) |
| Access seed in production | Set `NODE_ENV=production`, `POST /seed` | 404 |

### Performance Baselines
| Endpoint | Expectation |
|----------|-------------|
| `GET /health` | < 5 ms, no DB |
| `GET /metrics` | < 5 ms, in-memory |
| `GET /projects/:id/tasks?limit=100` | < 50 ms |
| `POST /auth/login` | < 100 ms |
| `GET /metrics` response | includes `p50`, `p95`, `p99` per route |

---

## Full Design Spec

See [`docs/superpowers/specs/2026-05-19-sample-app-design.md`](docs/superpowers/specs/2026-05-19-sample-app-design.md) for the original design document.
