import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeysApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ApiKeysPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [rawKey, setRawKey] = useState('')
  const [showRawKey, setShowRawKey] = useState(false)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeysApi.list,
  })

  const createMutation = useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setRawKey(data.rawKey)
      setShowCreate(false)
      setKeyName('')
      setShowRawKey(true)
    },
    onError: () => toast.error('Failed to create API key'),
  })

  const deleteMutation = useMutation({
    mutationFn: apiKeysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key deleted')
    },
    onError: () => toast.error('Failed to delete API key'),
  })

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">API Keys</h1>
          <p className="text-sm text-mute mt-0.5">Manage your API keys for programmatic access.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Key</Button>
      </div>

      <div className="bg-canvas rounded-xl border border-hairline shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-mute">Loading…</div>
        ) : !keys || keys.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-ink">No API keys</p>
            <p className="text-sm text-mute mt-1">Create a key to access the API programmatically.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Created</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Last used</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {keys.map((key, i) => (
                <tr key={key.id} className={i < keys.length - 1 ? 'border-b border-hairline' : ''}>
                  <td className="px-4 py-2.5 font-medium text-ink">{key.name}</td>
                  <td className="px-4 py-2.5 text-mute">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-2.5 text-mute">
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this API key?')) deleteMutation.mutate(key.id)
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create API Key">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate({ name: keyName })
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Key name"
            placeholder="My integration"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            required
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Raw key modal */}
      <Modal
        open={showRawKey}
        onClose={() => setShowRawKey(false)}
        title="API Key Created"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Copy your API key now — it won't be shown again.
          </p>
          <code className="block bg-canvas-soft-2 rounded-md border border-hairline px-3 py-2 font-mono text-xs text-ink break-all">
            {rawKey}
          </code>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(rawKey)
              toast.success('Copied to clipboard!')
            }}
            variant="secondary"
          >
            Copy
          </Button>
          <Button onClick={() => setShowRawKey(false)}>Done</Button>
        </div>
      </Modal>
    </main>
  )
}
