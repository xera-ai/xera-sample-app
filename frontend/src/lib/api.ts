import axios from 'axios'

// --- Types ---

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: number
}

export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: number
  members?: Member[]
}

export interface Member {
  userId: string
  role: string
  name?: string
  email?: string
  user?: User
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigneeId?: string
  dueDate?: string
  createdAt: number
  notes?: string
  labels?: Label[]
}

export interface Comment {
  id: string
  taskId: string
  authorId: string
  body: string
  createdAt: number
  author?: User
}

export interface Label {
  id: string
  projectId: string
  name: string
  color: string
}

export interface Attachment {
  id: string
  taskId: string
  uploadedBy: string
  originalName: string
  mimeType?: string
  size?: number
  createdAt: number
}

export interface ApiKey {
  id: string
  name: string
  lastUsedAt?: number
  createdAt: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// --- Axios instance ---

const api = axios.create({
  baseURL: '/api/v1',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) return Promise.reject(error)

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
        const newToken = data.access_token
        localStorage.setItem('access_token', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// --- Auth API ---

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ user: User }>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api
      .post<{ access_token: string; refresh_token: string; user: User }>('/auth/login', data)
      .then((r) => r.data),

  refresh: (refresh_token: string) =>
    api.post<{ access_token: string }>('/auth/refresh', { refresh_token }).then((r) => r.data),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }).then(() => undefined),

  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
}

// --- Projects API ---

export const projectsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Project>>('/projects', { params }).then((r) => r.data),

  get: (id: string) => api.get<{ project: Project }>(`/projects/${id}`).then((r) => r.data.project),

  create: (data: { name: string; description?: string }) =>
    api.post<{ project: Project }>('/projects', data).then((r) => r.data.project),

  update: (id: string, data: Partial<Pick<Project, 'name' | 'description'>>) =>
    api.patch<{ project: Project }>(`/projects/${id}`, data).then((r) => r.data.project),

  delete: (id: string) => api.delete(`/projects/${id}`).then(() => undefined),

  getMembers: (id: string) =>
    api.get<{ data: Member[] }>(`/projects/${id}/members`).then((r) => r.data.data),

  addMember: (id: string, data: { userId: string; role?: string }) =>
    api.post<Member>(`/projects/${id}/members`, data).then((r) => r.data),

  removeMember: (id: string, userId: string) =>
    api.delete(`/projects/${id}/members/${userId}`).then(() => undefined),
}

// --- Tasks API ---

export const tasksApi = {
  list: (
    projectId: string,
    params?: { status?: string; priority?: string; page?: number; limit?: number }
  ) =>
    api
      .get<PaginatedResponse<Task>>(`/projects/${projectId}/tasks`, { params })
      .then((r) => r.data),

  get: (id: string) => api.get<{ task: Task }>(`/tasks/${id}`).then((r) => r.data.task),

  create: (projectId: string, data: Partial<Task>) =>
    api.post<{ task: Task }>(`/projects/${projectId}/tasks`, data).then((r) => r.data.task),

  update: (id: string, data: Partial<Task>) =>
    api.patch<{ task: Task }>(`/tasks/${id}`, data).then((r) => r.data.task),

  delete: (id: string) => api.delete(`/tasks/${id}`).then(() => undefined),
}

// --- Comments API ---

export const commentsApi = {
  list: (taskId: string) =>
    api.get<PaginatedResponse<Comment>>(`/tasks/${taskId}/comments`).then((r) => r.data),

  create: (taskId: string, data: { body: string }) =>
    api.post<{ comment: Comment }>(`/tasks/${taskId}/comments`, data).then((r) => r.data.comment),

  update: (id: string, data: { body: string }) =>
    api.patch<{ comment: Comment }>(`/comments/${id}`, data).then((r) => r.data.comment),

  delete: (id: string) => api.delete(`/comments/${id}`).then(() => undefined),
}

// --- Users API ---

export const usersApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),

  get: (id: string) => api.get<{ user: User }>(`/users/${id}`).then((r) => r.data.user),

  update: (id: string, data: Partial<User>) =>
    api.patch<{ user: User }>(`/users/${id}`, data).then((r) => r.data.user),

  delete: (id: string) => api.delete(`/users/${id}`).then(() => undefined),
}

// --- Attachments API ---

export const attachmentsApi = {
  list: (taskId: string) =>
    api.get<{ data: Attachment[] }>(`/tasks/${taskId}/attachments`).then((r) => r.data.data),

  upload: (taskId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ attachment: Attachment }>(`/tasks/${taskId}/attachments`, form).then((r) => r.data.attachment)
  },

  downloadUrl: (id: string) => `/api/v1/attachments/${id}/download`,

  delete: (id: string) => api.delete(`/attachments/${id}`).then(() => undefined),
}

// --- API Keys ---

export const apiKeysApi = {
  list: () => api.get<ApiKey[]>('/api-keys').then((r) => r.data),

  create: (data: { name: string }) =>
    api.post<ApiKey & { rawKey: string }>('/api-keys', data).then((r) => r.data),

  delete: (id: string) => api.delete(`/api-keys/${id}`).then(() => undefined),
}

export default api
