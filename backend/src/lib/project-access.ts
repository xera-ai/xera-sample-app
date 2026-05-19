import { db } from '../db/index.js'
import { projects, projectMembers } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import type { FastifyReply } from 'fastify'

export async function checkProjectAccess(
  userId: string,
  projectId: string,
  userRole: string,
  reply: FastifyReply
): Promise<{ project: typeof projects.$inferSelect; memberRole: string | null } | null> {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get()

  if (!project) {
    reply.code(404).send({ error: 'Project not found' })
    return null
  }

  // Admins can access all projects
  if (userRole === 'admin') {
    return { project, memberRole: 'admin' }
  }

  // Check if user is owner
  if (project.ownerId === userId) {
    return { project, memberRole: 'owner' }
  }

  // Check if user is a member
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get()

  if (!member) {
    reply.code(403).send({ error: 'Access denied to this project' })
    return null
  }

  return { project, memberRole: member.role }
}

export async function checkProjectOwnerOrAdmin(
  userId: string,
  projectId: string,
  userRole: string,
  reply: FastifyReply
): Promise<boolean> {
  if (userRole === 'admin') return true

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get()

  if (!project) {
    reply.code(404).send({ error: 'Project not found' })
    return false
  }

  if (project.ownerId === userId) return true

  // Check if member has owner role
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get()

  if (member && member.role === 'owner') return true

  reply.code(403).send({ error: 'Only project owners or admins can perform this action' })
  return false
}
