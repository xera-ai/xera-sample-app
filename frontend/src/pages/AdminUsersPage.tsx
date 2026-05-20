import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { useToast } from '../components/ui/Toast'
import { useAuthStore } from '../store/auth'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const PAGE_SIZE = 10

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user: currentUser } = useAuthStore()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.list({ page, limit: PAGE_SIZE }),
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const users = data?.data ?? []
  const meta = data?.meta
  const adminCount = users.filter((u) => u.role === 'admin').length

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-mute">
            Administration
          </p>
          <h1 className="text-2xl font-semibold text-ink mt-1">Users</h1>
          <p className="text-sm text-mute mt-1">
            {meta?.total ?? users.length} total users
            {adminCount > 0 && ` · ${adminCount} admin${adminCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-mute">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-mute">No users.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-canvas-soft/60">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                  User
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Role
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Joined
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  className={[
                    'hover:bg-canvas-soft/50 transition-colors',
                    i < users.length - 1 ? 'border-b border-hairline' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">
                          {u.name}
                          {u.id === currentUser?.id && (
                            <span className="ml-2 text-[10px] text-mute font-normal">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-mute truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role} />
                  </td>
                  <td className="px-4 py-3 text-mute">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u.id)
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-mute">
            Page {page} of {meta.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p: number) => p - 1)}
              disabled={page === 1}
            >
              ← Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p: number) => p + 1)}
              disabled={page === meta.totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
