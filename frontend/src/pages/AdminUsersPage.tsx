import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Users</h1>

      <div className="bg-canvas rounded-xl border border-hairline shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-mute">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Joined</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={i < users.length - 1 ? 'border-b border-hairline' : ''}>
                  <td className="px-4 py-2.5 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-2.5 text-body">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={u.role} />
                  </td>
                  <td className="px-4 py-2.5 text-mute">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
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
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-mute">
            {meta.total} total users
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
            <span className="text-mute">
              {page} / {meta.totalPages}
            </span>
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
