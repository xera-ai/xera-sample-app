import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { db } from '../db/index.js'
import {
  users, projects, projectMembers, tasks, comments,
  labels, taskLabels, refreshTokens, apiKeys,
} from '../db/schema.js'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function runSeed(): Promise<{ adminApiKey: string; userApiKey: string }> {
  const now = Math.floor(Date.now() / 1000)

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

  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  await db.insert(users).values({
    id: 'user-admin-1', name: 'Admin User', email: 'admin@test.com',
    passwordHash: adminPasswordHash, role: 'admin', createdAt: now,
  })

  const userPasswordHash = await bcrypt.hash('user123', 10)
  await db.insert(users).values({
    id: 'user-1', name: 'Test User', email: 'user@test.com',
    passwordHash: userPasswordHash, role: 'user', createdAt: now,
  })

  const projectData = [
    { id: 'project-1', name: 'Website Redesign', description: 'Redesign the company website' },
    { id: 'project-2', name: 'Mobile App', description: 'Build a cross-platform mobile app' },
    { id: 'project-3', name: 'API Integration', description: 'Integrate third-party APIs' },
  ]
  for (const p of projectData) {
    await db.insert(projects).values({ ...p, ownerId: 'user-admin-1', createdAt: now })
  }

  for (const projectId of projectData.map(p => p.id)) {
    await db.insert(projectMembers).values({ projectId, userId: 'user-admin-1', role: 'owner' })
    await db.insert(projectMembers).values({ projectId, userId: 'user-1', role: 'member' })
  }

  const labelData = [
    { id: 'label-1', projectId: 'project-1', name: 'Bug', color: '#ef4444' },
    { id: 'label-2', projectId: 'project-1', name: 'Feature', color: '#3b82f6' },
    { id: 'label-3', projectId: 'project-2', name: 'UI', color: '#8b5cf6' },
    { id: 'label-4', projectId: 'project-2', name: 'Backend', color: '#f59e0b' },
    { id: 'label-5', projectId: 'project-3', name: 'Integration', color: '#10b981' },
    { id: 'label-6', projectId: 'project-3', name: 'Security', color: '#f97316' },
  ]
  for (const l of labelData) await db.insert(labels).values(l)

  const taskData = [
    { id: 'task-1',  projectId: 'project-1', title: 'Design homepage mockup',        status: 'done',        priority: 'high',   assigneeId: 'user-1' },
    { id: 'task-2',  projectId: 'project-1', title: 'Implement navigation bar',       status: 'in_progress', priority: 'medium', assigneeId: 'user-admin-1' },
    { id: 'task-3',  projectId: 'project-1', title: 'Fix footer layout bug',          status: 'todo',        priority: 'low',    assigneeId: null },
    { id: 'task-4',  projectId: 'project-1', title: 'Add dark mode support',          status: 'todo',        priority: 'medium', assigneeId: 'user-1' },
    { id: 'task-5',  projectId: 'project-1', title: 'Write landing page copy',        status: 'done',        priority: 'low',    assigneeId: 'user-admin-1' },
    { id: 'task-6',  projectId: 'project-2', title: 'Setup React Native project',     status: 'done',        priority: 'high',   assigneeId: 'user-admin-1' },
    { id: 'task-7',  projectId: 'project-2', title: 'Implement login screen',         status: 'in_progress', priority: 'high',   assigneeId: 'user-1' },
    { id: 'task-8',  projectId: 'project-2', title: 'Add push notifications',         status: 'todo',        priority: 'medium', assigneeId: null },
    { id: 'task-9',  projectId: 'project-2', title: 'Create onboarding flow',         status: 'todo',        priority: 'low',    assigneeId: 'user-1' },
    { id: 'task-10', projectId: 'project-2', title: 'Fix iOS build errors',           status: 'in_progress', priority: 'high',   assigneeId: 'user-admin-1' },
    { id: 'task-11', projectId: 'project-3', title: 'Integrate Stripe payment',       status: 'done',        priority: 'high',   assigneeId: 'user-admin-1' },
    { id: 'task-12', projectId: 'project-3', title: 'Add OAuth2 provider',            status: 'in_progress', priority: 'medium', assigneeId: 'user-1' },
    { id: 'task-13', projectId: 'project-3', title: 'Setup webhook endpoints',        status: 'todo',        priority: 'medium', assigneeId: null },
    { id: 'task-14', projectId: 'project-3', title: 'Write API documentation',        status: 'todo',        priority: 'low',    assigneeId: 'user-1' },
    { id: 'task-15', projectId: 'project-3', title: 'Security audit',                 status: 'todo',        priority: 'high',   assigneeId: 'user-admin-1' },
  ]
  for (const t of taskData) {
    await db.insert(tasks).values({
      ...t, description: `Description for: ${t.title}`,
      dueDate: null, createdAt: now, updatedAt: now,
    })
  }

  await db.insert(taskLabels).values([
    { taskId: 'task-3',  labelId: 'label-1' },
    { taskId: 'task-1',  labelId: 'label-2' },
    { taskId: 'task-7',  labelId: 'label-3' },
    { taskId: 'task-10', labelId: 'label-4' },
    { taskId: 'task-12', labelId: 'label-5' },
    { taskId: 'task-15', labelId: 'label-6' },
  ])

  const commentData = [
    { id: 'comment-1',  taskId: 'task-1',  authorId: 'user-admin-1', body: 'Looks great! Approved.' },
    { id: 'comment-2',  taskId: 'task-1',  authorId: 'user-1',       body: 'Thanks for the review.' },
    { id: 'comment-3',  taskId: 'task-2',  authorId: 'user-1',       body: 'Working on this now.' },
    { id: 'comment-4',  taskId: 'task-3',  authorId: 'user-admin-1', body: 'Can you reproduce this on Safari?' },
    { id: 'comment-5',  taskId: 'task-7',  authorId: 'user-1',       body: 'Need design specs for this.' },
    { id: 'comment-6',  taskId: 'task-7',  authorId: 'user-admin-1', body: 'Specs shared in Figma.' },
    { id: 'comment-7',  taskId: 'task-10', authorId: 'user-admin-1', body: 'Issue is with the build config.' },
    { id: 'comment-8',  taskId: 'task-11', authorId: 'user-1',       body: 'Tested in staging — works!' },
    { id: 'comment-9',  taskId: 'task-12', authorId: 'user-1',       body: 'Using Auth0 for this.' },
    { id: 'comment-10', taskId: 'task-15', authorId: 'user-admin-1', body: 'Need to review OWASP checklist.' },
  ]
  for (const c of commentData) {
    await db.insert(comments).values({ ...c, createdAt: now, updatedAt: now })
  }

  // Generate 45 additional tasks per project (to reach 50 total per project)
  const statuses = ['todo', 'in_progress', 'done'] as const
  const priorities = ['low', 'medium', 'high'] as const
  const assignees = ['user-admin-1', 'user-1'] as const
  const shortNames = [
    'Implement feature', 'Fix bug', 'Write tests', 'Code review', 'Deploy update',
    'Update docs', 'Refactor code', 'Add logging', 'Optimize query', 'Security audit',
  ]

  let taskCounter = 16 // next task id after task-15
  let commentCounter = 11 // next comment id after comment-10

  for (const projectId of projectData.map(p => p.id)) {
    for (let i = 1; i <= 45; i++) {
      const globalI = taskCounter
      const taskId = `task-${globalI}`
      const shortName = shortNames[(i - 1) % shortNames.length]
      const title = `Task ${globalI}: ${shortName}`
      const status = statuses[(i - 1) % statuses.length]
      const priority = priorities[(i - 1) % priorities.length]
      const assigneeId = assignees[(i - 1) % assignees.length]
      const createdAt = Math.floor(Date.now() / 1000) - i * 3600

      await db.insert(tasks).values({
        id: taskId,
        projectId,
        title,
        description: `Description for task ${globalI} in project ${projectId}`,
        status,
        priority,
        assigneeId,
        dueDate: null,
        createdAt,
        updatedAt: createdAt,
      })

      // Add 1 comment per new task, alternating author
      const commentAuthor = assignees[(i - 1) % assignees.length]
      await db.insert(comments).values({
        id: `comment-${commentCounter}`,
        taskId,
        authorId: commentAuthor,
        body: `Comment on task ${globalI}: ${shortName}`,
        createdAt,
        updatedAt: createdAt,
      })

      taskCounter++
      commentCounter++
    }
  }

  const adminRawKey = randomBytes(32).toString('hex')
  await db.insert(apiKeys).values({
    id: 'apikey-admin-1', userId: 'user-admin-1', name: 'Admin Default Key',
    keyHash: sha256(adminRawKey), createdAt: now,
  })

  const userRawKey = randomBytes(32).toString('hex')
  await db.insert(apiKeys).values({
    id: 'apikey-user-1', userId: 'user-1', name: 'User Default Key',
    keyHash: sha256(userRawKey), createdAt: now,
  })

  return { adminApiKey: adminRawKey, userApiKey: userRawKey }
}

export async function isDbEmpty(): Promise<boolean> {
  const result = await db.select().from(users).limit(1)
  return result.length === 0
}
