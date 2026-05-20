import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { authApi } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Avatar } from '../ui/Avatar'

export function NavBar() {
  const { user, isAdmin, clearAuth, refreshToken } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
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
      'relative text-sm font-medium transition-colors px-1 py-4',
      isActive
        ? 'text-ink after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] after:bg-ink after:rounded-full'
        : 'text-mute hover:text-ink',
    ].join(' ')

  return (
    <header className="h-16 bg-canvas/90 backdrop-blur-md border-b border-hairline sticky top-0 z-40">
      <div className="mx-auto max-w-6xl h-full px-6 flex items-center gap-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Xera FlowBoard">
          <span className="h-7 w-7 rounded-lg bg-ink inline-flex items-end justify-center gap-[2px] p-1.5 shadow-sm">
            <span className="w-[3px] h-2 rounded-sm bg-canvas/40" />
            <span className="w-[3px] h-3 rounded-sm bg-canvas/70" />
            <span className="w-[3px] h-4 rounded-sm bg-canvas" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[9px] font-semibold tracking-[0.24em] uppercase text-mute">
              Xera
            </span>
            <span className="text-sm font-bold tracking-tight text-ink mt-0.5">FlowBoard</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6 flex-1 h-full">
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

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 h-10 pl-1 pr-2.5 rounded-pill hover:bg-canvas-soft transition-colors"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar name={user?.name ?? '?'} size="sm" />
            <span className="flex flex-col items-start leading-none">
              <span className="text-xs font-medium text-ink">{user?.name}</span>
              <span className="text-[10px] text-mute capitalize mt-0.5">{user?.role}</span>
            </span>
            <svg
              viewBox="0 0 20 20"
              className={[
                'h-3 w-3 text-mute transition-transform ml-0.5',
                menuOpen ? 'rotate-180' : '',
              ].join(' ')}
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-canvas border border-hairline shadow-modal py-1 overflow-hidden"
            >
              <div className="px-3 py-2.5 border-b border-hairline">
                <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
                <p className="text-xs text-mute truncate">{user?.email}</p>
              </div>
              <MenuItem to="/settings/profile" onClick={() => setMenuOpen(false)}>
                Profile
              </MenuItem>
              <MenuItem to="/settings/api-keys" onClick={() => setMenuOpen(false)}>
                API keys
              </MenuItem>
              <div className="border-t border-hairline my-1" />
              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full text-left px-3 py-2 text-sm text-body hover:bg-canvas-soft hover:text-ink transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuItem({
  to,
  onClick,
  children,
}: {
  to: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="block px-3 py-2 text-sm text-body hover:bg-canvas-soft hover:text-ink transition-colors"
    >
      {children}
    </Link>
  )
}
