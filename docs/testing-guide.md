# Xera FlowBoard — Testing Guide

> A comprehensive guide for **UI Testing**, **API Testing**, **Security Testing**, and **Performance Testing**.

---

## Quick Start

```bash
# Start the app
npm install
npm run dev:backend   # API at http://localhost:3000
npm run dev:frontend  # UI at http://localhost:5173

# Reset database to initial state
curl -X POST http://localhost:3000/api/v1/seed
```

**Test accounts:**

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | `admin@test.com` | `admin123` | Full access, sees all data |
| User | `user@test.com` | `user123` | Sees only projects they belong to |

**API Keys** (printed to console on seed, or retrieved from `/api/v1/seed`):
```bash
curl -s -X POST http://localhost:3000/api/v1/seed | jq '{adminKey: .adminApiKey, userKey: .userApiKey}'
```

**Swagger UI:** http://localhost:3000/docs  
**OpenAPI JSON:** http://localhost:3000/docs/json

---

## 1. UI Testing

### Entry Points

| Page | URL | Login Required |
|------|-----|----------------|
| Login | `/login` | No |
| Register | `/register` | No |
| Dashboard | `/` | Yes |
| Projects list | `/projects` | Yes |
| Project detail (Kanban) | `/projects/:id` | Yes (member) |
| Task detail | `/tasks/:id` | Yes (member) |
| API Keys | `/settings/api-keys` | Yes |
| Profile | `/settings/profile` | Yes |
| Admin Users | `/admin/users` | Yes (admin only) |

### Test Flows

#### Flow 1: Authentication
```
1. Open http://localhost:5173/login
2. Log in with admin@test.com / admin123
   → Expect: redirect to Dashboard, "Admin User" displayed in navbar
3. Sign out
   → Expect: redirect to /login, toast "Signed out successfully"
4. Try accessing / directly while not logged in
   → Expect: redirect to /login
5. Try logging in with wrong password
   → Expect: error message displayed, no redirect
```

#### Flow 2: Register
```
1. Open /register
2. Enter Name: "Test Register", Email: "new@example.com", Password: "password123"
3. Click "Create account"
   → Expect: immediately logged in, redirect to Dashboard
4. Try registering again with the same email
   → Expect: error "Email already in use" or similar
5. Try a password shorter than 8 characters
   → Expect: validation error
```

#### Flow 3: Projects
```
1. Go to /projects
   → Expect: 3 project cards (Website Redesign, Mobile App, API Integration), each showing "2 members"
2. Click "New Project", enter name + description, click Create
   → Expect: redirect to the newly created project
3. Search for a project using the search box
   → Expect: correctly filters by name/description
4. Open a project, verify the Kanban board has 3 columns: Todo, In Progress, Done
5. Filter tasks by Priority=High
   → Expect: only tasks with High priority are shown
```

#### Flow 4: Task Detail
```
1. Click on any task
   → Expect: opens /tasks/:id with all sections: title, description, HTML Notes, Attachments, Comments, sidebar metadata
2. Click the task title → edit inline → blur
   → Expect: auto-saves, title updates immediately
3. Change Status from the sidebar dropdown
   → Expect: updates immediately, badge color changes
4. Change Assignee → select a different member
   → Expect: new assignee name appears below the dropdown
5. Enter HTML in the "HTML Notes" field: <b>bold</b> <a href="#">link</a>
   → Expect: rendered as HTML below the textarea
6. Upload any file
   → Expect: file appears in the list with name, size, type; download link works
7. Write a comment, click "Comment"
   → Expect: comment appears with author name and date
```

#### Flow 5: Admin Panel
```
1. Log in as admin@test.com, go to /admin/users
   → Expect: paginated list of all users
2. Log in as user@test.com, try to access /admin/users
   → Expect: redirect to Dashboard
```

### Responsive Checks
- Test all pages at viewport widths: 375px (mobile), 768px (tablet), 1280px (desktop)
- Kanban board: horizontal scroll when columns overflow on mobile

---

## 2. API Testing

### Get a Token

```bash
# JWT
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | jq -r .access_token)

# API Key (from seed output)
API_KEY="<raw_key_from_seed>"
```

### Usage
```bash
# Bearer JWT
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/auth/me

# API Key
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/v1/projects
```

### Test Scenarios by Endpoint

#### Auth
| Test case | Request | Expected |
|-----------|---------|----------|
| Successful login | POST /auth/login with valid credentials | 200, returns access_token, refresh_token, user |
| Wrong password | POST /auth/login with wrong password | 401 |
| Register new user | POST /auth/register with valid data | 201, returns user |
| Duplicate email | POST /auth/register with existing email | 409 |
| Refresh token | POST /auth/refresh with valid refresh_token | 200, new access_token |
| Logout | POST /auth/logout | 200, refresh token deleted |
| /me with valid token | GET /auth/me | 200, returns user |
| /me without token | GET /auth/me (no auth) | 401 |

#### Projects
| Test case | Request | Expected |
|-----------|---------|----------|
| List projects | GET /projects | 200, paginated list |
| Search | GET /projects?search=website | 200, matches "Website Redesign" only |
| Pagination | GET /projects?page=1&limit=2 | correct meta.totalPages |
| Create project | POST /projects {name: "Test"} | 201, new project |
| Create without name | POST /projects {} | 400 |
| Get own project | GET /projects/project-1 | 200, includes members[] |
| Get inaccessible project | GET /projects/project-1 (user without access) | 403 |
| Edit project | PUT /projects/project-1 {name: "New Name"} | 200, updated project |
| Edit as member | PUT /projects/project-1 as regular user | 403 |
| Delete project | DELETE /projects/project-1 | 200, cascade deleted |

#### Tasks
| Test case | Request | Expected |
|-----------|---------|----------|
| List tasks | GET /projects/project-1/tasks | 200, total: 50, totalPages: 3 |
| Filter by status | GET /projects/project-1/tasks?status=done | Only done tasks |
| Filter by priority | GET /projects/project-1/tasks?priority=high | Only high priority tasks |
| Search | GET /projects/project-1/tasks?search=Design | Tasks with "Design" in title |
| Create task | POST /projects/project-1/tasks {title:"New"} | 201 |
| Create without title | POST /projects/project-1/tasks {} | 400 |
| Update task | PUT /tasks/task-1 {status:"done"} | 200 |
| Delete task | DELETE /tasks/task-1 | 200 |

#### Comments
| Test case | Request | Expected |
|-----------|---------|----------|
| List comments | GET /tasks/task-1/comments | 200, data[] includes author object |
| Create comment | POST /tasks/task-1/comments {body:"hello"} | 201 |
| Empty comment | POST /tasks/task-1/comments {body:""} | 400 |
| Edit own comment | PUT /comments/:id {body:"edited"} | 200 |
| Edit another's comment | PUT /comments/:id (different user) | 403 |
| Delete own comment | DELETE /comments/:id | 200 |
| Admin deletes another's comment | DELETE /comments/:id (admin) | 200 |

#### Attachments
| Test case | Request | Expected |
|-----------|---------|----------|
| Upload file | POST /tasks/task-1/attachments (multipart) | 201, attachment object |
| List attachments | GET /tasks/task-1/attachments | 200, data[] |
| Download file | GET /attachments/:id/download | File stream with Content-Disposition |
| Delete own attachment | DELETE /attachments/:id | 200 |
| Delete another's attachment | DELETE /attachments/:id (different user) | 403 |

#### Pagination
```bash
# Verify response structure
curl "$BASE/projects/project-1/tasks?page=1&limit=10" -H "X-API-Key: $API_KEY" | jq .meta
# → { "page": 1, "limit": 10, "total": 50, "totalPages": 5 }

# Page beyond available data
curl "$BASE/projects/project-1/tasks?page=99&limit=10" -H "X-API-Key: $API_KEY" | jq '.data | length'
# → 0 (empty data, no error)
```

---

## 3. Security Testing

### 3.1 Authentication Bypass

#### JWT — Forged signature
```bash
# Take a valid token, modify the payload, keep the original signature
FORGED="eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InVzZXItYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.invalid_sig"
curl -H "Authorization: Bearer $FORGED" http://localhost:3000/api/v1/auth/me
# → Expect: 401
```

#### JWT — Algorithm `none`
```bash
# Header: {"alg":"none"}, Payload: {"id":"user-admin","role":"admin"}, Signature: ""
NONE_TOKEN="eyJhbGciOiJub25lIn0.eyJpZCI6InVzZXItYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ."
curl -H "Authorization: Bearer $NONE_TOKEN" http://localhost:3000/api/v1/auth/me
# → Expect: 401
```

#### Expired token
```bash
# Reuse an access token after 15 minutes
# → Expect: 401 "Token expired" → client should use the refresh token
```

#### Missing auth header
```bash
curl http://localhost:3000/api/v1/projects
# → Expect: 401
```

---

### 3.2 Broken Object Level Authorization (IDOR)

#### Access another user's project
```bash
# Log in as user@test.com, get token
USER_TOKEN="..."

# Create a project as admin WITHOUT adding user@test.com as a member
PROJECT_ID=$(curl -s -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Secret Project"}' | jq -r .project.id)

# Regular user attempts to access it
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:3000/api/v1/projects/$PROJECT_ID
# → Expect: 403
```

#### Edit another user's comment
```bash
# comment-1 was created by admin; user attempts to edit it
curl -X PUT http://localhost:3000/api/v1/comments/comment-1 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"hacked"}'
# → Expect: 403
```

#### Delete another user's attachment
```bash
# Upload a file as admin, get attachment ID, regular user attempts to delete it
curl -X DELETE http://localhost:3000/api/v1/attachments/$ATT_ID \
  -H "Authorization: Bearer $USER_TOKEN"
# → Expect: 403
```

---

### 3.3 Broken Function Level Authorization

#### Privilege escalation — delete user
```bash
# Regular user attempts to delete another user
curl -X DELETE http://localhost:3000/api/v1/users/user-admin \
  -H "Authorization: Bearer $USER_TOKEN"
# → Expect: 403
```

#### Access admin endpoint
```bash
# Regular user attempts to list all users
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $USER_TOKEN"
# → Expect: 403
```

#### Change user role (non-admin)
```bash
curl -X PUT http://localhost:3000/api/v1/users/user-1 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
# → Expect: 403 (only admin can change roles)
```

---

### 3.4 Injection

#### SQL injection via search parameter
```bash
# Normal request
curl "http://localhost:3000/api/v1/projects?search=website" -H "X-API-Key: $API_KEY"

# Injection attempts
curl "http://localhost:3000/api/v1/projects?search=' OR '1'='1" -H "X-API-Key: $API_KEY"
curl "http://localhost:3000/api/v1/projects?search='; DROP TABLE projects; --" -H "X-API-Key: $API_KEY"
# → Expect: 200, normal results (parameterized queries prevent injection)
```

#### Enum validation bypass
```bash
# Invalid status value
curl "http://localhost:3000/api/v1/projects/project-1/tasks?status=done' OR '1'='1" \
  -H "X-API-Key: $API_KEY"
# → Expect: 400 validation error (schema validation blocks it)
```

#### Stored XSS via HTML Notes
```bash
# Save an XSS payload to the notes field
curl -X PUT http://localhost:3000/api/v1/tasks/task-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"<script>alert(document.cookie)</script>"}'

# Open task-1 in the UI → Expect: script executes (intentional XSS surface)
# Use this to test: CSP headers, XSS sanitization, httpOnly cookies
```

#### Stored XSS via comment body
```bash
# Comment body is plain text (not rendered as HTML) → NOT vulnerable to XSS
curl -X POST http://localhost:3000/api/v1/tasks/task-1/comments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"<script>alert(1)</script>"}'
# → Body is displayed as plain text; script does not execute
```

---

### 3.5 Rate Limiting

#### Auth brute force
```bash
# Send 25 consecutive login requests
for i in $(seq 1 25); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"wrong"}')
  echo "Request $i: $STATUS"
done
# → After the 20th request per minute: 429 Too Many Requests
```

#### API rate limit
```bash
# 505 consecutive requests to a protected endpoint
for i in $(seq 1 505); do
  curl -s -o /dev/null -w "$i:%{http_code}\n" \
    -H "X-API-Key: $API_KEY" \
    http://localhost:3000/api/v1/health
done
# → Request 501+: 429
```

---

### 3.6 File Upload Security

```bash
# Upload a file with no extension
curl -X POST http://localhost:3000/api/v1/tasks/task-1/attachments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/etc/passwd;filename=passwd"
# → Upload succeeds (no MIME validation) — verify server does not execute the file

# Upload a file larger than 10MB
dd if=/dev/urandom bs=1M count=11 of=/tmp/bigfile.bin
curl -X POST http://localhost:3000/api/v1/tasks/task-1/attachments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/tmp/bigfile.bin"
# → Expect: 413 Payload Too Large

# Upload an HTML file (potential stored XSS via download)
echo "<script>alert(1)</script>" > /tmp/xss.html
curl -X POST http://localhost:3000/api/v1/tasks/task-1/attachments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/tmp/xss.html"
# → Open download URL in browser → check the Content-Type header

# Path traversal in filename
curl -X POST http://localhost:3000/api/v1/tasks/task-1/attachments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/tmp/test.txt;filename=../../server.ts"
# → Expect: file stored safely (UUID prefix prevents path traversal)
```

---

### 3.7 Seed endpoint in production
```bash
NODE_ENV=production npm run dev:backend &  # start in production mode
curl -X POST http://localhost:3000/api/v1/seed
# → Expect: 404 Not Found
```

---

## 4. Performance Testing

### Baseline (no auth required)
```bash
# Health check — no DB hit
time curl http://localhost:3000/health
# → Expect: < 5ms

# Metrics — in-memory aggregation
curl http://localhost:3000/api/v1/metrics | jq .
# → Returns p50/p95/p99 latency per route
```

### Load test with pagination
```bash
API_KEY="<key>"

# Single request
time curl "http://localhost:3000/api/v1/projects/project-1/tasks?limit=50" \
  -H "X-API-Key: $API_KEY"

# Concurrent requests (10 parallel)
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{time_total}\n" \
    "http://localhost:3000/api/v1/projects/project-1/tasks?limit=50&page=$i" \
    -H "X-API-Key: $API_KEY" &
done
wait
```

### Auth endpoint load test
```bash
# Rate limit kicks in after 20 req/min on /auth/login
# Measure throughput before throttling
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{time_total}\n" \
    -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"admin123"}'
done
```

### Read metrics after load test
```bash
curl http://localhost:3000/api/v1/metrics | jq '
  to_entries[] |
  select(.key | contains("/tasks")) |
  {route: .key, p50: .value.p50, p95: .value.p95, p99: .value.p99}
'
```

### Expected Baselines

| Endpoint | p50 | p95 | Notes |
|----------|-----|-----|-------|
| GET /health | < 2ms | < 5ms | No DB |
| GET /metrics | < 2ms | < 5ms | In-memory |
| POST /auth/login | < 80ms | < 150ms | bcrypt hashing |
| GET /projects | < 20ms | < 50ms | Small dataset |
| GET /projects/:id/tasks | < 30ms | < 60ms | 50 tasks |
| GET /tasks/:id/comments | < 15ms | < 30ms | With author join |

---

## 5. Test Data Reference

### Seeded IDs (after POST /api/v1/seed)

**Users:**
- Admin: `id=user-admin`, email=`admin@test.com`
- User: `id=user-1`, email=`user@test.com`

**Projects:**
- `project-1` — Website Redesign (owner: user-admin)
- `project-2` — Mobile App (owner: user-admin)
- `project-3` — API Integration (owner: user-admin)

**Tasks:** `task-1` … `task-15` (named) + auto-generated (50 total per project)

**Comments:** `comment-1` … `comment-10` (on named tasks)

**Labels:**
- `label-1` Feature (#3b82f6), `label-2` Bug (#ef4444) — project-1
- `label-3` Enhancement (#8b5cf6), `label-4` Design (#f59e0b) — project-2
- `label-5` Backend (#10b981), `label-6` Frontend (#f97316) — project-3

### Create isolation data for security tests
```bash
# Create a project only admin can access
PRIVATE_PROJECT=$(curl -s -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Private","description":"admin only"}' | jq -r .project.id)

# Create a task in the private project
TASK_ID=$(curl -s -X POST http://localhost:3000/api/v1/projects/$PRIVATE_PROJECT/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Secret task","status":"todo","priority":"high"}' | jq -r .task.id)

# Attempt access as regular user — expect 403
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:3000/api/v1/tasks/$TASK_ID
```
