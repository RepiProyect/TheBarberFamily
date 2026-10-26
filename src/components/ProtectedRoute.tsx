import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink text-muted">Cargando…</div>
    )
  }
  if (!session) {
    return <Navigate to="/panel/login" replace />
  }
  return <>{children}</>
}
