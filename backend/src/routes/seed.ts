import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { db } from '../db/index.js'
import {
  users,
  projects,
  projectMembers,
  tasks,
  comments,
  labels,
  taskLabels,
  refreshTokens,
  apiKeys,
} from '../db/schema.js'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export default async function seedRoutes(fastify: FastifyInstance) {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  fastify.post('/seed', {
    schema: {
      tags: ['seed'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            adminApiKey: { type: 'string' },
            userApiKey: { type: 'string' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // Delete all data in FK-safe order
    await db.delete(taskLabels)
    await db.delete(comments)
    await db.delete(tasks)
    await db.delete(labels)
    await db.delete(projectMembers)
    await db.delete(projects)
    await db.delete(apiKeys)
    await db.delete(refreshTokens)
    await db.delete(users)

    const now = Math.floor(Date.now() / 1000)

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10)
    await db.insert(users).values({
      id: 'user-admin-1',
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      createdAt: now,
    })

    // Create regular user
    const userPasswordHash = await bcrypt.hash('user123', 10)
    await db.insert(users).values({
      id: 'user-1',
      name: 'Test User',
      email: 'user@test.com',
      passwordHash: userPasswordHash,
      role: 'user',
      createdAt: now,
    })

    // Create 3 projects owned by admin
    const projectIds = ['project-1', 'project-2', 'project-3']
    const projectData = [
      { id: 'project-1', name: 'Website Redesign', description: 'Redesign the company website' },
      { id: 'project-2', name: 'Mobile App', description: 'Build a mobile app' },
      { id: 'project-3', name: 'API Integration', description: 'Integrate third-party APIs' },
    ]

    for (const p of projectData) {
      await db.insert(projects).values({
        ...p,
        ownerId: 'user-admin-1',
        createdAt: now,
      })
    }

    // Add admin and user as members of all 3 projects
    for (const projectId of projectIds) {
      await db.insert(projectMembers).values({ projectId, userId: 'user-admin-1', role: 'owner' })
      await db.insert(projectMembers).values({ projectId, userId: 'user-1', role: 'member' })
    }

    // Create 6 labels (2 per project)
    const labelData = [
      { id: 'label-1', projectId: 'project-1', name: 'Bug', color: '#ef4444' },
      { id: 'label-2', projectId: 'project-1', name: 'Feature', color: '#3b82f6' },
      { id: 'label-3', projectId: 'project-2', name: 'UI', color: '#8b5cf6' },
      { id: 'label-4', projectId: 'project-2', name: 'Backend', color: '#f59e0b' },
      { id: 'label-5', projectId: 'project-3', name: 'Integration', color: '#10b981' },
      { id: 'label-6', projectId: 'project-3', name: 'Security', color: '#f97316' },
    ]

    for (const l of labelData) {
      await db.insert(labels).values(l)
    }

    // Create 15 tasks spread across projects
    const taskData = [
      // Project 1 - 5 tasks
      { id: 'task-1', projectId: 'project-1', title: 'Design homepage mockup', status: 'done', priority: 'high', assigneeId: 'user-1' },
      { id: 'task-2', projectId: 'project-1', title: 'Implement navigation bar', status: 'in_progress', priority: 'medium', assigneeId: 'user-admin-1' },
      { id: 'task-3', projectId: 'project-1', title: 'Fix footer layout bug', status: 'todo', priority: 'low', assigneeId: null },
      { id: 'task-4', projectId: 'project-1', title: 'Add dark mode support', status: 'todo', priority: 'medium', assigneeId: 'user-1' },
      { id: 'task-5', projectId: 'project-1', title: 'Write landing page copy', status: 'done', priority: 'low', assigneeId: 'user-admin-1' },
      // Project 2 - 5 tasks
      { id: 'task-6', projectId: 'project-2', title: 'Setup React Native project', status: 'done', priority: 'high', assigneeId: 'user-admin-1' },
      { id: 'task-7', projectId: 'project-2', title: 'Implement login screen', status: 'in_progress', priority: 'high', assigneeId: 'user-1' },
      { id: 'task-8', projectId: 'project-2', title: 'Add push notifications', status: 'todo', priority: 'medium', assigneeId: null },
      { id: 'task-9', projectId: 'project-2', title: 'Create onboarding flow', status: 'todo', priority: 'low', assigneeId: 'user-1' },
      { id: 'task-10', projectId: 'project-2', title: 'Fix iOS build errors', status: 'in_progress', priority: 'high', assigneeId: 'user-admin-1' },
      // Project 3 - 5 tasks
      { id: 'task-11', projectId: 'project-3', title: 'Integrate Stripe payment', status: 'done', priority: 'high', assigneeId: 'user-admin-1' },
      { id: 'task-12', projectId: 'project-3', title: 'Add OAuth2 provider', status: 'in_progress', priority: 'medium', assigneeId: 'user-1' },
      { id: 'task-13', projectId: 'project-3', title: 'Setup webhook endpoints', status: 'todo', priority: 'medium', assigneeId: null },
      { id: 'task-14', projectId: 'project-3', title: 'Write API documentation', status: 'todo', priority: 'low', assigneeId: 'user-1' },
      { id: 'task-15', projectId: 'project-3', title: 'Security audit', status: 'todo', priority: 'high', assigneeId: 'user-admin-1' },
    ]

    for (const t of taskData) {
      await db.insert(tasks).values({
        ...t,
        description: `Description for ${t.title}`,
        dueDate: null,
        createdAt: now,
      })
    }

    // Attach some labels to tasks
    await db.insert(taskLabels).values({ taskId: 'task-3', labelId: 'label-1' })
    await db.insert(taskLabels).values({ taskId: 'task-1', labelId: 'label-2' })
    await db.insert(taskLabels).values({ taskId: 'task-7', labelId: 'label-3' })
    await db.insert(taskLabels).values({ taskId: 'task-10', labelId: 'label-4' })
    await db.insert(taskLabels).values({ taskId: 'task-12', labelId: 'label-5' })
    await db.insert(taskLabels).values({ taskId: 'task-15', labelId: 'label-6' })

    // Create 10 comments
    const commentData = [
      { id: 'comment-1', taskId: 'task-1', authorId: 'user-admin-1', body: 'Looks great! Approved.' },
      { id: 'comment-2', taskId: 'task-1', authorId: 'user-1', body: 'Thanks for the review.' },
      { id: 'comment-3', taskId: 'task-2', authorId: 'user-1', body: 'Working on this now.' },
      { id: 'comment-4', taskId: 'task-3', authorId: 'user-admin-1', body: 'Can you reproduce this on Safari?' },
      { id: 'comment-5', taskId: 'task-7', authorId: 'user-1', body: 'Need design specs for this.' },
      { id: 'comment-6', taskId: 'task-7', authorId: 'user-admin-1', body: 'Specs shared in Figma.' },
      { id: 'comment-7', taskId: 'task-10', authorId: 'user-admin-1', body: 'Issue is with the build config.' },
      { id: 'comment-8', taskId: 'task-11', authorId: 'user-1', body: 'Tested in staging - works!' },
      { id: 'comment-9', taskId: 'task-12', authorId: 'user-1', body: 'Using Auth0 for this.' },
      { id: 'comment-10', taskId: 'task-15', authorId: 'user-admin-1', body: 'Need to review OWASP checklist.' },
    ]

    for (const c of commentData) {
      await db.insert(comments).values({ ...c, createdAt: now })
    }

    // Create 1 API key per user
    const adminRawKey = randomBytes(32).toString('hex')
    const adminKeyHash = sha256(adminRawKey)
    await db.insert(apiKeys).values({
      id: 'apikey-admin-1',
      userId: 'user-admin-1',
      name: 'Admin Default Key',
      keyHash: adminKeyHash,
      createdAt: now,
    })

    const userRawKey = randomBytes(32).toString('hex')
    const userKeyHash = sha256(userRawKey)
    await db.insert(apiKeys).values({
      id: 'apikey-user-1',
      userId: 'user-1',
      name: 'User Default Key',
      keyHash: userKeyHash,
      createdAt: now,
    })

    return reply.send({
      message: 'Seeded',
      adminApiKey: adminRawKey,
      userApiKey: userRawKey,
    })
  })
}
