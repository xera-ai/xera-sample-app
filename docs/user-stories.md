# FlowBoard — User Stories

> This document is intended for Business Analysts, Product Owners, and Testers to understand system features and write user stories / acceptance criteria.

---

## Personas

| Persona | Description | System Role |
|---------|-------------|-------------|
| **Admin** | System administrator | `admin` — full access to all resources |
| **Member** | Project participant | `user` — can only operate on projects they belong to |
| **Project Owner** | Project creator / manager | `user` with `owner` role within the project |
| **Guest** | Not logged in | Can only view login/register pages |

---

## Epic 1: Authentication & Account

### US-101 — Register an Account
> **As a** Guest,  
> **I want to** create a new account with a name, email, and password,  
> **So that** I can log in and use the system.

**Acceptance Criteria:**
- [ ] Form has 3 fields: Name, Email, Password (≥8 characters)
- [ ] Email must be valid and not already registered in the system
- [ ] After successful registration, automatically log in and redirect to Dashboard
- [ ] Display a clear error if the email is already taken (409)
- [ ] Display an error if the password is fewer than 8 characters (400)

---

### US-102 — Log In
> **As a** Guest,  
> **I want to** log in with my email and password,  
> **So that** I can access my account.

**Acceptance Criteria:**
- [ ] Form has Email and Password fields
- [ ] Successful login → redirect to Dashboard
- [ ] Invalid credentials → display "Invalid credentials" error (401)
- [ ] Session is persisted after page reload
- [ ] After 15 minutes of inactivity, the access token is automatically refreshed
- [ ] Rate limit: blocked after 20 failed attempts per minute (429)

---

### US-103 — Log Out
> **As a** Member,  
> **I want to** log out of the system,  
> **So that** my account is protected on shared machines.

**Acceptance Criteria:**
- [ ] "Sign out" button is always visible in the navigation bar
- [ ] After logging out, redirect to the login page
- [ ] Refresh token is immediately invalidated
- [ ] Old access tokens cannot be reused after logout

---

### US-104 — Manage API Keys
> **As a** Member,  
> **I want to** create and revoke API keys,  
> **So that** I can access the API from external tools (Postman, scripts) without a password.

**Acceptance Criteria:**
- [ ] The `/settings/api-keys` page displays a list of existing keys
- [ ] Creating a new key requires entering a name (label)
- [ ] The raw key is displayed **only once** after creation — it cannot be viewed again
- [ ] Any key can be revoked (deleted)
- [ ] A revoked key stops working immediately

---

### US-105 — Update Profile
> **As a** Member,  
> **I want to** update my name and password,  
> **So that** my account information stays current.

**Acceptance Criteria:**
- [ ] The `/settings/profile` page allows changing the display name
- [ ] Changing the password requires entering a new password (≥8 characters)
- [ ] Successful save → display a confirmation message

---

## Epic 2: Project Management

### US-201 — View Project List
> **As a** Member,  
> **I want to** see all projects I am part of,  
> **So that** I have an overview of my ongoing work.

**Acceptance Criteria:**
- [ ] The `/projects` page displays projects in a card grid layout
- [ ] Each card shows: name, description (if any), member count
- [ ] Admin sees **all** projects in the system
- [ ] Regular users only see projects where they are owner or member
- [ ] Supports search by name and description (`?search=`)
- [ ] Displays "No projects yet" when there are no projects

---

### US-202 — Create a New Project
> **As a** Member,  
> **I want to** create a new project with a name and description,  
> **So that** I can start managing work for a team.

**Acceptance Criteria:**
- [ ] "New Project" button on the Projects page opens a creation modal
- [ ] Name is required; description is optional
- [ ] After creation, automatically redirect to the project detail page
- [ ] The creator automatically becomes the `owner` of the project

---

### US-203 — Manage Project Members
> **As a** Project Owner,  
> **I want to** add and remove members from the project,  
> **So that** only relevant people have access.

**Acceptance Criteria:**
- [ ] The project detail page shows a list of members and their roles
- [ ] Owner can add users by userId
- [ ] Adding a user who is already a member → error 409 "User is already a member"
- [ ] Adding a non-existent userId → error 404 "User not found"
- [ ] Owner can remove any member (except themselves)
- [ ] Removed users can no longer see or access the project

---

### US-204 — Edit and Delete a Project
> **As a** Project Owner,  
> **I want to** update the name/description and optionally delete the project,  
> **So that** I control the project's lifecycle.

**Acceptance Criteria:**
- [ ] Only Owner or Admin can edit/delete
- [ ] Deleting a project → automatically deletes all tasks, comments, labels, and members (cascade)
- [ ] Regular members attempting to edit/delete → error 403 Forbidden

---

## Epic 3: Task Management

### US-301 — View Kanban Board
> **As a** Member,  
> **I want to** view tasks on a Kanban board organized by status,  
> **So that** I can easily track the team's progress.

**Acceptance Criteria:**
- [ ] The project detail page has 3 columns: **Todo**, **In Progress**, **Done**
- [ ] Each task card shows: title, priority badge, assignee, label
- [ ] Filter by status and priority is available in the filter bar
- [ ] Supports searching tasks by title
- [ ] Each column displays the task count

---

### US-302 — Create a Task
> **As a** Member,  
> **I want to** create a new task in a project,  
> **So that** work is recorded and tracked.

**Acceptance Criteria:**
- [ ] Task creation button on the Kanban board
- [ ] Required: task title
- [ ] Optional: description, status, priority, assignee, due date, labels
- [ ] Default status is `todo`, default priority is `medium`
- [ ] New task appears on the board immediately without a page reload

---

### US-303 — View and Edit a Task
> **As a** Member,  
> **I want to** view task details and edit task information,  
> **So that** I can update progress and add information.

**Acceptance Criteria:**
- [ ] Clicking a task → opens `/tasks/:id` with full details: title, description, HTML Notes, Attachments, Comments, sidebar metadata
- [ ] Title is editable inline (click to edit)
- [ ] Description has a textarea that auto-saves on blur
- [ ] Sidebar has dropdowns: Status, Priority, Assignee, Due date
- [ ] Changes are saved immediately (no Save button needed)
- [ ] Labels attached to the task are displayed

---

### US-304 — Assign Labels to Tasks
> **As a** Member,  
> **I want to** assign color labels to tasks,  
> **So that** I can categorize and filter work by topic.

**Acceptance Criteria:**
- [ ] Each project has its own set of labels (name + hex color)
- [ ] Multiple labels can be assigned to a single task
- [ ] New labels can be created on the project detail page
- [ ] Labels are displayed on task cards in the Kanban board

---

### US-305 — Assign Tasks (Assignee)
> **As a** Project Owner,  
> **I want to** assign tasks to project members,  
> **So that** each person knows what work is theirs.

**Acceptance Criteria:**
- [ ] The Assignee dropdown in task detail lists all project members
- [ ] Select "Unassigned" to remove the assignment
- [ ] Assignee name is displayed on the task card in the Kanban board
- [ ] Tasks can be filtered by assignee (`?assigneeId=`)

---

### US-306 — File Attachments
> **As a** Member,  
> **I want to** attach files to a task,  
> **So that** related documents are stored directly within the task.

**Acceptance Criteria:**
- [ ] "+ Upload file" button in task detail
- [ ] Supports all file types (no MIME type restriction), up to 10MB
- [ ] File list shows: name, size, MIME type
- [ ] Files can be downloaded via link
- [ ] Files can be deleted (only by the uploader or Admin)

---

### US-307 — HTML Notes
> **As a** Member,  
> **I want to** write HTML-formatted notes for a task,  
> **So that** I can present information more richly than plain text.

**Acceptance Criteria:**
- [ ] "HTML Notes" field in task detail accepts raw HTML
- [ ] Content is rendered as HTML below the textarea
- [ ] Supported tags include: `<b>`, `<a>`, `<ul>`, `<img>`, `<table>`
- [ ] Auto-saves on blur

---

### US-308 — Delete a Task
> **As a** Member,  
> **I want to** delete tasks that are no longer needed,  
> **So that** the board always reflects current work.

**Acceptance Criteria:**
- [ ] "Delete task" button (red) in task detail
- [ ] Confirmation dialog displayed before deletion
- [ ] Successful deletion → redirect to the project page
- [ ] Deleting a task → automatically deletes all comments and attachments for that task

---

## Epic 4: Collaboration

### US-401 — Comment on a Task
> **As a** Member,  
> **I want to** write comments on a task,  
> **So that** the team can discuss and record decisions directly in the task's context.

**Acceptance Criteria:**
- [ ] Comments section is displayed below task detail
- [ ] Each comment shows: avatar, author name, timestamp, content
- [ ] Textarea + "Comment" button to post a new comment
- [ ] Empty comment → Comment button is disabled
- [ ] New comment appears immediately after posting

---

### US-402 — Edit and Delete Comments
> **As a** Member,  
> **I want to** edit or delete my own comments,  
> **So that** I can fix mistakes or remove outdated information.

**Acceptance Criteria:**
- [ ] Only the author can edit their own comment (403 if someone else tries)
- [ ] Author or Admin can delete a comment
- [ ] Regular members cannot delete other users' comments (403)

---

## Epic 5: Administration

### US-501 — User Management (Admin)
> **As an** Admin,  
> **I want to** view, edit, and delete user accounts,  
> **So that** I control system access.

**Acceptance Criteria:**
- [ ] The `/admin/users` page is only visible to Admin accounts
- [ ] Regular users accessing `/admin/users` → redirect to Dashboard (403)
- [ ] List includes pagination
- [ ] Admin can change the name, email, and role of any user
- [ ] Admin can delete accounts (except their own)

---

### US-502 — Overview Dashboard
> **As a** Member,  
> **I want to** see a work overview immediately upon login,  
> **So that** I can quickly understand the status of my tasks.

**Acceptance Criteria:**
- [ ] Displays 3 statistics: Total Tasks, In Progress, Completed
- [ ] List of 5 most recent tasks with Status, Priority, and creation date
- [ ] Tasks can be clicked to open task detail
- [ ] "View all" link to see all tasks
- [ ] Figures only count tasks in projects the user belongs to

---

## Feature Matrix

| Feature | Guest | Member | Project Owner | Admin |
|---------|-------|--------|---------------|-------|
| Register / Log in | ✅ | — | — | — |
| View own projects | ❌ | ✅ | ✅ | ✅ (all) |
| Create project | ❌ | ✅ | ✅ | ✅ |
| Edit / Delete project | ❌ | ❌ | ✅ | ✅ |
| Manage members | ❌ | ❌ | ✅ | ✅ |
| Create / Edit task | ❌ | ✅ | ✅ | ✅ |
| Delete task | ❌ | ✅ | ✅ | ✅ |
| Upload file | ❌ | ✅ | ✅ | ✅ |
| Post comment | ❌ | ✅ | ✅ | ✅ |
| Delete others' comments | ❌ | ❌ | ❌ | ✅ |
| Manage users (admin panel) | ❌ | ❌ | ❌ | ✅ |
| View all projects | ❌ | ❌ | ❌ | ✅ |
