import React, { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

export function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const toast = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => usersApi.update(user!.id, data),
    onSuccess: (updated) => {
      if (accessToken && refreshToken) {
        setAuth(updated, accessToken, refreshToken)
      }
      toast.success('Profile updated!')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; password: string }) =>
      usersApi.update(user!.id, data as never),
    onSuccess: () => {
      toast.success('Password changed!')
      setCurrentPassword('')
      setNewPassword('')
    },
    onError: () => toast.error('Failed to change password'),
  })

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ name, email })
  }

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault()
    passwordMutation.mutate({ currentPassword, password: newPassword })
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8 flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink">Profile</h1>

      <Card>
        <h2 className="text-sm font-semibold text-ink mb-4">Personal info</h2>
        <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={updateMutation.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-ink mb-4">Change password</h2>
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            placeholder="8+ characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={passwordMutation.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}
