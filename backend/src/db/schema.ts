import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user'),
  createdAt: integer('created_at'),
})

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
})

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  lastUsedAt: integer('last_used_at'),
  createdAt: integer('created_at'),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at'),
})

export const projectMembers = sqliteTable('project_members', {
  projectId: text('project_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').default('member'),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('todo'),
  priority: text('priority').default('medium'),
  assigneeId: text('assignee_id'),
  dueDate: text('due_date'),
  createdAt: integer('created_at'),
})

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  authorId: text('author_id').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at'),
})

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
})

export const taskLabels = sqliteTable('task_labels', {
  taskId: text('task_id').notNull(),
  labelId: text('label_id').notNull(),
})
