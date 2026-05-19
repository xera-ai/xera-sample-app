import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { authApi } from '../../lib/api'
import { useToast } from '../ui/Toast'

export function NavBar() {
  const { user, isAdmin, clearAuth, refreshToken } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // ignore
    }
    clearAuth()
    navigate('/login')
    toast.success('Signed out successfully')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'text-sm font-medium transition-colors px-1 py-0.5',
      isActive ? 'text-ink' : 'text-mute hover:text-ink',
    ].join(' ')

  return (
    <header className="h-16 bg-canvas border-b border-hairline sticky top-0 z-40">
      <div className="mx-auto max-w-6xl h-full px-6 flex items-center gap-8">
        {/* Logo */}
        <Link to="/" className="text-base font-semibold text-ink tracking-tight shrink-0">
          TaskFlow
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6 flex-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={linkClass}>
            Projects
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            to="/settings/profile"
            className="text-sm text-body hover:text-ink transition-colors font-medium"
          >
            {user?.name}
          </Link>
          <button
            onClick={handleLogout}
            className="h-8 px-3 text-xs font-medium rounded-pill border border-hairline bg-canvas text-body hover:text-ink hover:border-hairline-strong transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
