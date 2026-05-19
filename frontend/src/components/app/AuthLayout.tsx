import React from 'react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex flex-col justify-between bg-ink text-canvas p-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 20%, #fff 0, transparent 40%), radial-gradient(circle at 75% 80%, #fff 0, transparent 35%)',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-canvas text-ink grid place-items-center font-semibold">F</div>
            <span className="text-lg font-semibold tracking-tight">FlowBoard</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Plan, track, and ship work together.
          </h2>
          <p className="mt-4 text-sm text-canvas/70 leading-relaxed">
            A lightweight project management workspace for teams that prefer clarity over ceremony.
          </p>

          <ul className="mt-10 space-y-4 text-sm">
            <Feature title="Kanban boards" desc="Drag tasks across Todo, In Progress, and Done." />
            <Feature title="Roles & API keys" desc="JWT auth, RBAC, and per-user API keys for tooling." />
            <Feature title="Built for testing" desc="A realistic target for the Xera testing framework." />
          </ul>
        </div>

        <div className="relative text-xs text-canvas/50">© FlowBoard · Sample app</div>
      </aside>

      <main className="flex items-center justify-center bg-canvas-soft px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden text-center mb-8">
            <h1 className="text-2xl font-semibold text-ink">FlowBoard</h1>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            <p className="text-sm text-mute mt-1">{subtitle}</p>
          </div>

          <div className="bg-canvas rounded-xl border border-hairline shadow-card p-6">{children}</div>

          <p className="text-center text-sm text-mute mt-4">{footer}</p>
        </div>
      </main>
    </div>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 rounded-full bg-canvas/80 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-canvas/60 mt-0.5">{desc}</p>
      </div>
    </li>
  )
}
