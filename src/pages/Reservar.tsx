import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { BarberStripe } from '../components/BarberStripe'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  getConfig,
  getServiciosActivos,
  getHorarios,
  getSlotsDisponibles,
  crearReserva,
  enviarConfirmacionWpp,
} from '../lib/db'
import type { Config, Servicio, Horario } from '../types'
import {
  hoyEnZona,
  sumarDias,
  diaSemana,
  etiquetaDia,
  fechaLarga,
  horaEnZona,
  formatoPrecio,
} from '../lib/fecha'

type Paso = 'servicio' | 'fecha' | 'hora' | 'datos' | 'ok'
type Slot = { iso: string; label: string }

// ---- Datos de respaldo (modo demo, sin Supabase configurado) ----
const DEMO_CONFIG: Config = {
  id: 1,
  nombre: 'BARBER THE FAMILY',
  direccion: '',
  ciudad: 'Neiva',
  telefono_wpp: import.meta.env.VITE_WHATSAPP_PHONE || '',
  zona_horaria: 'America/Bogota',
  slot_min: 15,
  anticipacion_min: 60,
  dias_max: 30,
}
const DEMO_SERVICIOS: Servicio[] = [
  { id: 'demo-1', nombre: 'Corte clásico', descripcion: 'Máquina y tijera, lavado y peinado.', precio: 25000, duracion_min: 40, activo: true, orden: 1 },
  { id: 'demo-2', nombre: 'Corte + barba', descripcion: 'Corte completo y perfilado de barba.', precio: 35000, duracion_min: 60, activo: true, orden: 2 },
  { id: 'demo-3', nombre: 'Barba', descripcion: 'Perfilado, toalla caliente y aceites.', precio: 15000, duracion_min: 30, activo: true, orden: 3 },
  { id: 'demo-4', nombre: 'Corte niño', descripcion: 'Para los más pequeños de la familia.', precio: 20000, duracion_min: 30, activo: true, orden: 4 },
  { id: 'demo-5', nombre: 'Diseño / líneas', descripcion: 'Figuras y líneas personalizadas.', precio: 30000, duracion_min: 45, activo: true, orden: 5 },
  { id: 'demo-6', nombre: 'Mascarilla negra', descripcion: 'Limpieza facial y puntos negros.', precio: 18000, duracion_min: 20, activo: true, orden: 6 },
]
const DEMO_HORARIOS: Horario[] = [
  { dia_semana: 0, abierto: false, apertura: '09:00', cierre: '20:00' },
  { dia_semana: 1, abierto: true, apertura: '09:00', cierre: '20:00' },
  { dia_semana: 2, abierto: true, apertura: '09:00', cierre: '20:00' },
  { dia_semana: 3, abierto: true, apertura: '09:00', cierre: '20:00' },
  { dia_semana: 4, abierto: true, apertura: '09:00', cierre: '20:00' },
  { dia_semana: 5, abierto: true, apertura: '09:00', cierre: '20:00' },
  { dia_semana: 6, abierto: true, apertura: '08:00', cierre: '21:00' },
]

function horaAMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutosALabel(min: number): string {
  const d = new Date(Date.UTC(2000, 0, 1, Math.floor(min / 60), min % 60))
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(d)
}

export default function Reservar() {
  const [paso, setPaso] = useState<Paso>('servicio')
  const [config, setConfig] = useState<Config>(DEMO_CONFIG)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [cargando, setCargando] = useState(true)
  const [demo, setDemo] = useState(false)

  const [servicioSel, setServicioSel] = useState<Servicio | null>(null)
  const [fechaSel, setFechaSel] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotSel, setSlotSel] = useState<Slot | null>(null)
  const [cargandoSlots, setCargandoSlots] = useState(false)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carga inicial
  useEffect(() => {
    let vivo = true
    async function cargar() {
      if (!isSupabaseConfigured) {
        setConfig(DEMO_CONFIG)
        setServicios(DEMO_SERVICIOS)
        setHorarios(DEMO_HORARIOS)
        setDemo(true)
        setCargando(false)
        return
      }
      try {
        const [c, s, h] = await Promise.all([getConfig(), getServiciosActivos(), getHorarios()])
        if (!vivo) return
        setConfig(c ?? DEMO_CONFIG)
        setServicios(s.length ? s : DEMO_SERVICIOS)
        setHorarios(h.length ? h : DEMO_HORARIOS)
        setDemo(s.length === 0)
      } catch {
        if (!vivo) return
        setConfig(DEMO_CONFIG)
        setServicios(DEMO_SERVICIOS)
        setHorarios(DEMO_HORARIOS)
        setDemo(true)
      } finally {
        if (vivo) setCargando(false)
      }
    }
    cargar()
    return () => {
      vivo = false
    }
  }, [])

  // Días disponibles (abiertos) hacia adelante
  const dias = useMemo(() => {
    const hoy = hoyEnZona(config.zona_horaria)
    const abiertos = new Set(horarios.filter((h) => h.abierto).map((h) => h.dia_semana))
    const out: string[] = []
    for (let i = 0; i < config.dias_max && out.length < 21; i++) {
      const f = sumarDias(hoy, i)
      if (abiertos.has(diaSemana(f))) out.push(f)
    }
    return out
  }, [config, horarios])

  async function elegirFecha(f: string) {
    setFechaSel(f)
    setSlotSel(null)
    setPaso('hora')
    if (!servicioSel) return
    setCargandoSlots(true)
    setError(null)
    try {
      if (demo || !isSupabaseConfigured) {
        // Generación local solo para previsualizar la interfaz
        const h = horarios.find((x) => x.dia_semana === diaSemana(f))
        const out: Slot[] = []
        if (h?.abierto) {
          const fin = horaAMin(h.cierre) - servicioSel.duracion_min
          for (let m = horaAMin(h.apertura); m <= fin; m += config.slot_min) {
            out.push({ iso: '', label: minutosALabel(m) })
          }
        }
        setSlots(out)
      } else {
        const isos = await getSlotsDisponibles(f, servicioSel.id)
        setSlots(isos.map((iso) => ({ iso, label: horaEnZona(iso, config.zona_horaria) })))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los horarios')
      setSlots([])
    } finally {
      setCargandoSlots(false)
    }
  }

  async function confirmar() {
    if (!servicioSel || !slotSel) return
    if (nombre.trim().length < 2) {
      setError('Escribe tu nombre.')
      return
    }
    if (telefono.replace(/\D/g, '').length < 7) {
      setError('Escribe un número de teléfono válido.')
      return
    }
    setError(null)

    if (demo || !isSupabaseConfigured || !slotSel.iso) {
      setError('Modo demo: para reservar de verdad configura Supabase (clave en .env y SQL en el panel).')
      return
    }

    setEnviando(true)
    try {
      const turnoId = await crearReserva({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        servicioId: servicioSel.id,
        inicio: slotSel.iso,
      })
      enviarConfirmacionWpp(turnoId)
      setPaso('ok')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la reserva')
    } finally {
      setEnviando(false)
    }
  }

  const pasos: Paso[] = ['servicio', 'fecha', 'hora', 'datos']
  const pasoIdx = pasos.indexOf(paso)

  const linkWhatsApp = useMemo(() => {
    const tel = config.telefono_wpp
    if (!tel || !servicioSel || !fechaSel || !slotSel) return null
    const hora = slotSel.iso ? horaEnZona(slotSel.iso, config.zona_horaria) : slotSel.label
    const texto = `Hola! Soy ${nombre}. Reservé ${servicioSel.nombre} para el ${fechaLarga(fechaSel)} a las ${hora}. Mi número: ${telefono}.`
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
  }, [config, servicioSel, fechaSel, slotSel, nombre, telefono])

  return (
    <div className="min-h-dvh bg-ink text-white">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-10 w-auto" />
          </Link>
          <Link to="/" className="text-sm text-muted transition hover:text-white">
            ← Inicio
          </Link>
        </div>
        <BarberStripe />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Indicador de pasos */}
        {paso !== 'ok' && (
          <div className="mb-8 flex items-center gap-2">
            {pasos.map((p, i) => (
              <div key={p} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i <= pasoIdx ? 'bg-red text-white' : 'bg-surface text-muted'
                  }`}
                >
                  {i + 1}
                </div>
                {i < pasos.length - 1 && (
                  <div className={`h-0.5 flex-1 ${i < pasoIdx ? 'bg-red' : 'bg-line'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {demo && paso !== 'ok' && (
          <div className="mb-6 rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            Modo demo (sin conexión a la base de datos). Los horarios son de ejemplo;
            la reserva real se activa al configurar Supabase.
          </div>
        )}

        {cargando ? (
          <p className="py-20 text-center text-muted">Cargando…</p>
        ) : (
          <>
            {/* Paso 1: servicio */}
            {paso === 'servicio' && (
              <section>
                <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-wide">Elige tu servicio</h1>
                <div className="grid gap-3">
                  {servicios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setServicioSel(s)
                        setPaso('fecha')
                      }}
                      className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition hover:border-red ${
                        servicioSel?.id === s.id ? 'border-red bg-surface' : 'border-line bg-surface'
                      }`}
                    >
                      <div>
                        <p className="font-display text-xl font-semibold uppercase tracking-wide">{s.nombre}</p>
                        <p className="text-sm text-muted">{s.descripcion}</p>
                        <p className="mt-1 text-xs uppercase tracking-widest text-muted">{s.duracion_min} min</p>
                      </div>
                      <span className="shrink-0 font-semibold text-red">{formatoPrecio(s.precio)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Paso 2: fecha */}
            {paso === 'fecha' && (
              <section>
                <button onClick={() => setPaso('servicio')} className="mb-4 text-sm text-muted hover:text-white">
                  ← Cambiar servicio
                </button>
                <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-wide">Elige el día</h1>
                {dias.length === 0 ? (
                  <p className="text-muted">No hay días disponibles configurados.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {dias.map((f) => {
                      const e = etiquetaDia(f)
                      return (
                        <button
                          key={f}
                          onClick={() => elegirFecha(f)}
                          className={`flex flex-col items-center rounded-xl border py-3 transition hover:border-red ${
                            fechaSel === f ? 'border-red bg-surface' : 'border-line bg-surface'
                          }`}
                        >
                          <span className="text-xs uppercase text-muted">{e.dow}</span>
                          <span className="font-display text-2xl font-bold tracking-wide">{e.dia}</span>
                          <span className="text-xs uppercase text-muted">{e.mes}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Paso 3: hora */}
            {paso === 'hora' && (
              <section>
                <button onClick={() => setPaso('fecha')} className="mb-4 text-sm text-muted hover:text-white">
                  ← Cambiar día
                </button>
                <h1 className="mb-1 font-display text-4xl font-bold uppercase tracking-wide">Elige la hora</h1>
                {fechaSel && <p className="mb-6 capitalize text-muted">{fechaLarga(fechaSel)}</p>}
                {cargandoSlots ? (
                  <p className="py-10 text-center text-muted">Buscando horarios…</p>
                ) : slots.length === 0 ? (
                  <p className="py-10 text-center text-muted">No hay horarios disponibles ese día. Prueba otro.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {slots.map((s, i) => (
                      <button
                        key={s.iso || `${s.label}-${i}`}
                        onClick={() => {
                          setSlotSel(s)
                          setPaso('datos')
                        }}
                        className={`rounded-xl border px-2 py-3 text-sm font-semibold transition hover:border-red ${
                          slotSel === s ? 'border-red bg-surface text-red' : 'border-line bg-surface'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Paso 4: datos */}
            {paso === 'datos' && servicioSel && fechaSel && slotSel && (
              <section>
                <button onClick={() => setPaso('hora')} className="mb-4 text-sm text-muted hover:text-white">
                  ← Cambiar hora
                </button>
                <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-wide">Tus datos</h1>

                <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
                  <p className="font-display text-xl font-semibold uppercase tracking-wide text-red">{servicioSel.nombre}</p>
                  <p className="mt-1 text-sm capitalize text-muted">
                    {fechaLarga(fechaSel)} · {slotSel.label}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {servicioSel.duracion_min} min · {formatoPrecio(servicioSel.precio)}
                  </p>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted">Nombre</span>
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="rounded-xl border border-line bg-ink-2 px-4 py-3 text-white outline-none focus:border-red"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted">WhatsApp / teléfono</span>
                    <input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      inputMode="tel"
                      placeholder="300 123 4567"
                      className="rounded-xl border border-line bg-ink-2 px-4 py-3 text-white outline-none focus:border-red"
                    />
                  </label>
                </div>

                {error && <p className="mt-4 rounded-lg bg-red/15 px-4 py-2 text-sm text-red">{error}</p>}

                <button
                  onClick={confirmar}
                  disabled={enviando}
                  className="mt-6 w-full rounded-full bg-red px-8 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
                >
                  {enviando ? 'Reservando…' : 'Confirmar reserva'}
                </button>
              </section>
            )}

            {/* Paso 5: ok */}
            {paso === 'ok' && servicioSel && fechaSel && slotSel && (
              <section className="py-6 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red text-3xl text-white">
                  ✓
                </div>
                <h1 className="font-display text-4xl font-bold uppercase tracking-wide">¡Turno reservado!</h1>
                <p className="mt-3 text-muted">Te esperamos, {nombre.split(' ')[0]}.</p>

                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-line bg-surface p-5 text-left">
                  <p className="font-display text-xl font-semibold uppercase tracking-wide text-red">{servicioSel.nombre}</p>
                  <p className="mt-1 text-sm capitalize text-muted">
                    {fechaLarga(fechaSel)} · {slotSel.label}
                  </p>
                  <p className="mt-1 text-sm text-muted">{formatoPrecio(servicioSel.precio)}</p>
                </div>

                {linkWhatsApp && (
                  <a
                    href={linkWhatsApp}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex rounded-full bg-red px-8 py-3 font-semibold text-white transition hover:bg-red-dark"
                  >
                    Confirmar por WhatsApp
                  </a>
                )}
                <div className="mt-4">
                  <Link to="/" className="text-sm text-muted hover:text-white">
                    Volver al inicio
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
