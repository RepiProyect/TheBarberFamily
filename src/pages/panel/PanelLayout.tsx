import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { BarberStripe } from '../../components/BarberStripe'
import { cerrarSesion } from '../../lib/auth'

const tabs = [
  { to: '/panel', label: 'Agenda', end: true },
  { to: '/panel/clientes', label: 'Clientes', end: false },
  { to: '/panel/ajustes', label: 'Ajustes', end: false },
]

export default function PanelLayout() {
  const navigate = useNavigate()

  async function salir() {
    await cerrarSesion()
    navigate('/panel/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-ink text-white">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <span className="hidden font-display text-lg font-bold uppercase tracking-wide text-muted sm:block">
              Panel
            </span>
          </div>
          <button onClick={salir} className="text-sm text-muted transition hover:text-white">
            Cerrar sesión
          </button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'border-red text-white' : 'border-transparent text-muted hover:text-white'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <BarberStripe />
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
