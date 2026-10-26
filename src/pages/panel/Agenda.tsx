import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Config, Servicio, TurnoDetalle, EstadoTurno } from '../../types'
import {
  getConfig,
  getTurnosDia,
  cambiarEstadoTurno,
  eliminarTurno,
  getServiciosActivos,
  getSlotsDisponibles,
  crearTurnoPanel,
  enviarConfirmacionWpp,
} from '../../lib/db'
import { EstadoBadge } from '../../components/EstadoBadge'
import {
  hoyEnZona,
  sumarDias,
  fechaLarga,
  horaEnZona,
  formatoPrecio,
} from '../../lib/fecha'

const TZ_DEFECTO = 'America/Bogota'

function linkWpp(telefono: string, texto: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}

export default function Agenda() {
  const [config, setConfig] = useState<Config | null>(null)
  const tz = config?.zona_horaria ?? TZ_DEFECTO
  const [fecha, setFecha] = useState<string>(() => hoyEnZona(TZ_DEFECTO))
  const [turnos, setTurnos] = useState<TurnoDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setTurnos(await getTurnosDia(fecha, tz))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los turnos')
      setTurnos([])
    } finally {
      setCargando(false)
    }
  }, [fecha, tz])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function accion(id: string, estado: EstadoTurno) {
    await cambiarEstadoTurno(id, estado)
    cargar()
  }
  async function borrar(id: string) {
    if (!confirm('¿Eliminar este turno definitivamente?')) return
    await eliminarTurno(id)
    cargar()
  }

  const hoy = hoyEnZona(tz)

  return (
    <div>
      {/* Navegación de fecha */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFecha(sumarDias(fecha, -1))}
            className="rounded-full border border-line px-3 py-1.5 text-sm transition hover:border-red"
          >
            ‹
          </button>
          <button
            onClick={() => setFecha(sumarDias(fecha, 1))}
            className="rounded-full border border-line px-3 py-1.5 text-sm transition hover:border-red"
          >
            ›
          </button>
          {fecha !== hoy && (
            <button
              onClick={() => setFecha(hoy)}
              className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-red hover:text-white"
            >
              Hoy
            </button>
          )}
        </div>
        <button
          onClick={() => setNuevoAbierto((v) => !v)}
          className="rounded-full bg-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-dark"
        >
          {nuevoAbierto ? 'Cerrar' : '+ Nuevo turno'}
        </button>
      </div>

      <h1 className="mb-5 font-display text-3xl font-bold capitalize tracking-wide">{fechaLarga(fecha)}</h1>

      {nuevoAbierto && config && (
        <NuevoTurnoForm
          config={config}
          fechaInicial={fecha}
          onCreado={() => {
            setNuevoAbierto(false)
            cargar()
          }}
        />
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red/15 px-4 py-2 text-sm text-red">{error}</p>
      )}

      {cargando ? (
        <p className="py-16 text-center text-muted">Cargando…</p>
      ) : turnos.length === 0 ? (
        <p className="py-16 text-center text-muted">No hay turnos para este día.</p>
      ) : (
        <ul className="grid gap-3">
          {turnos.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl font-bold tracking-wide text-red">
                      {horaEnZona(t.inicio, tz)}
                    </span>
                    <EstadoBadge estado={t.estado} />
                  </div>
                  <p className="mt-1 font-semibold">{t.servicio?.nombre ?? 'Servicio'}</p>
                  <p className="text-sm text-muted">
                    {t.cliente?.nombre ?? 'Cliente'} · {t.cliente?.telefono ?? ''}
                  </p>
                  {t.servicio && (
                    <p className="mt-0.5 text-xs text-muted">
                      {t.servicio.duracion_min} min · {formatoPrecio(t.servicio.precio)}
                    </p>
                  )}
                </div>
                {t.cliente?.telefono && (
                  <a
                    href={linkWpp(
                      t.cliente.telefono,
                      `Hola ${t.cliente.nombre}, te escribimos de BARBER THE FAMILY sobre tu turno del ${fechaLarga(fecha)} a las ${horaEnZona(t.inicio, tz)}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-red"
                  >
                    WhatsApp
                  </a>
                )}
              </div>

              {/* Acciones */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3 text-xs">
                <AccionBtn activo={t.estado === 'confirmado'} onClick={() => accion(t.id, 'confirmado')}>
                  Confirmar
                </AccionBtn>
                <AccionBtn activo={t.estado === 'completado'} onClick={() => accion(t.id, 'completado')}>
                  Completado
                </AccionBtn>
                <AccionBtn activo={t.estado === 'no_show'} onClick={() => accion(t.id, 'no_show')}>
                  No asistió
                </AccionBtn>
                <AccionBtn activo={t.estado === 'cancelado'} onClick={() => accion(t.id, 'cancelado')}>
                  Cancelar
                </AccionBtn>
                <button
                  onClick={() => borrar(t.id)}
                  className="ml-auto rounded-full px-3 py-1.5 text-muted transition hover:text-red"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AccionBtn({
  children,
  activo,
  onClick,
}: {
  children: ReactNode
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-semibold transition ${
        activo ? 'border-red bg-red/15 text-red' : 'border-line text-muted hover:border-red hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function NuevoTurnoForm({
  config,
  fechaInicial,
  onCreado,
}: {
  config: Config
  fechaInicial: string
  onCreado: () => void
}) {
  const tz = config.zona_horaria
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [servicioId, setServicioId] = useState('')
  const [fecha, setFecha] = useState(fechaInicial)
  const [slots, setSlots] = useState<string[]>([])
  const [slotIso, setSlotIso] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getServiciosActivos().then(setServicios).catch(() => {})
  }, [])

  useEffect(() => {
    setSlotIso('')
    if (!servicioId) {
      setSlots([])
      return
    }
    getSlotsDisponibles(fecha, servicioId)
      .then(setSlots)
      .catch(() => setSlots([]))
  }, [servicioId, fecha])

  async function guardar() {
    const servicio = servicios.find((s) => s.id === servicioId)
    if (!servicio || !slotIso) {
      setError('Elige servicio y hora.')
      return
    }
    if (nombre.trim().length < 2 || telefono.replace(/\D/g, '').length < 7) {
      setError('Escribe nombre y teléfono válidos.')
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const turno = await crearTurnoPanel({ nombre, telefono, servicio, inicio: slotIso })
      enviarConfirmacionWpp(turno.id)
      onCreado()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el turno')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Nuevo turno</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Servicio</span>
          <select
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red"
          >
            <option value="">Elegir…</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} · {formatoPrecio(s.precio)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Hora</span>
          <select
            value={slotIso}
            onChange={(e) => setSlotIso(e.target.value)}
            disabled={!servicioId}
            className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red disabled:opacity-50"
          >
            <option value="">{servicioId ? (slots.length ? 'Elegir…' : 'Sin horarios libres') : 'Elige servicio'}</option>
            {slots.map((iso) => (
              <option key={iso} value={iso}>
                {horaEnZona(iso, tz)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Nombre del cliente</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red"
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted">WhatsApp / teléfono</span>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            inputMode="tel"
            className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red"
          />
        </label>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red/15 px-3 py-2 text-sm text-red">{error}</p>}

      <button
        onClick={guardar}
        disabled={guardando}
        className="mt-4 rounded-full bg-red px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Crear turno'}
      </button>
    </div>
  )
}
