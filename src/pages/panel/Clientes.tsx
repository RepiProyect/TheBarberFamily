import { useEffect, useState } from 'react'
import type { Cliente, TurnoDetalle } from '../../types'
import { getClientes, getTurnosCliente, getConfig } from '../../lib/db'
import { EstadoBadge } from '../../components/EstadoBadge'
import { fechaLarga, horaEnZona } from '../../lib/fecha'

const TZ_DEFECTO = 'America/Bogota'

function isoAFecha(iso: string): string {
  return iso.slice(0, 10)
}
function linkWpp(telefono: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, '')}`
}

export default function Clientes() {
  const [tz, setTz] = useState(TZ_DEFECTO)
  const [busqueda, setBusqueda] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [historial, setHistorial] = useState<Record<string, TurnoDetalle[]>>({})

  useEffect(() => {
    getConfig().then((c) => c && setTz(c.zona_horaria)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      setCargando(true)
      setError(null)
      try {
        setClientes(await getClientes(busqueda))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes')
      } finally {
        setCargando(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [busqueda])

  async function alternar(id: string) {
    if (abierto === id) {
      setAbierto(null)
      return
    }
    setAbierto(id)
    if (!historial[id]) {
      try {
        const h = await getTurnosCliente(id)
        setHistorial((prev) => ({ ...prev, [id]: h }))
      } catch {
        setHistorial((prev) => ({ ...prev, [id]: [] }))
      }
    }
  }

  return (
    <div>
      <h1 className="mb-5 font-display text-3xl font-bold uppercase tracking-wide">Clientes</h1>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o teléfono…"
        className="mb-5 w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-white outline-none focus:border-red"
      />

      {error && <p className="mb-4 rounded-lg bg-red/15 px-4 py-2 text-sm text-red">{error}</p>}

      {cargando ? (
        <p className="py-16 text-center text-muted">Cargando…</p>
      ) : clientes.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {busqueda ? 'Sin resultados.' : 'Todavía no hay clientes.'}
        </p>
      ) : (
        <ul className="grid gap-3">
          {clientes.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => alternar(c.id)} className="text-left">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-muted">{c.telefono}</p>
                </button>
                <div className="flex items-center gap-2">
                  <a
                    href={linkWpp(c.telefono)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-red"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => alternar(c.id)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-red"
                  >
                    {abierto === c.id ? 'Ocultar' : 'Historial'}
                  </button>
                </div>
              </div>

              {abierto === c.id && (
                <div className="mt-3 border-t border-line pt-3">
                  {!historial[c.id] ? (
                    <p className="text-sm text-muted">Cargando…</p>
                  ) : historial[c.id].length === 0 ? (
                    <p className="text-sm text-muted">Sin turnos registrados.</p>
                  ) : (
                    <ul className="grid gap-2">
                      {historial[c.id].map((t) => (
                        <li key={t.id} className="flex items-center justify-between text-sm">
                          <span className="capitalize text-muted">
                            {fechaLarga(isoAFecha(t.inicio))} · {horaEnZona(t.inicio, tz)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span>{t.servicio?.nombre}</span>
                            <EstadoBadge estado={t.estado} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
