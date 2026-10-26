import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { isSupabaseConfigured } from '../../lib/supabase'
import { iniciarSesion, useAuth } from '../../lib/auth'

export default function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to="/panel" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      setError('Primero configura Supabase (clave en .env) para poder iniciar sesión.')
      return
    }
    setError(null)
    setCargando(true)
    try {
      await iniciarSesion(email.trim(), password)
      navigate('/panel', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink px-4 text-white">
      {/* Video de fondo */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/login-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />
      {/* Capa oscura para legibilidad */}
      <div aria-hidden className="absolute inset-0 bg-ink/65" />

      <div className="relative z-10 flex w-full flex-col items-center">
        <Logo className="mb-6 h-24 w-auto drop-shadow-[0_6px_24px_rgba(229,9,20,0.35)]" />
        <form onSubmit={enviar} className="w-full max-w-sm rounded-2xl border border-line bg-surface/90 p-6 shadow-2xl backdrop-blur-md">
        <h1 className="mb-1 font-display text-3xl font-bold uppercase tracking-wide">Panel</h1>
        <p className="mb-6 text-sm text-muted">Acceso solo para el equipo de la barbería.</p>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">
            Supabase aún no está configurado. Agrega la clave en <code>.env</code> para habilitar el acceso.
          </div>
        )}

        <label className="mb-3 grid gap-1 text-sm">
          <span className="text-muted">Correo</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="rounded-xl border border-line bg-ink-2 px-4 py-3 text-white outline-none focus:border-red"
          />
        </label>
        <label className="mb-4 grid gap-1 text-sm">
          <span className="text-muted">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-xl border border-line bg-ink-2 px-4 py-3 text-white outline-none focus:border-red"
          />
        </label>

        {error && <p className="mb-4 rounded-lg bg-red/15 px-3 py-2 text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-full bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
        <Link to="/" className="mt-6 text-sm text-muted hover:text-white">
          ← Volver al sitio
        </Link>
      </div>
    </div>
  )
}
