import { useEffect, useState } from 'react'
import type { Config, Servicio, Horario } from '../../types'
import {
  getConfig,
  getServiciosTodos,
  getHorarios,
  actualizarConfig,
  guardarServicio,
  guardarHorario,
} from '../../lib/db'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Ajustes() {
  const [config, setConfig] = useState<Config | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getConfig(), getServiciosTodos(), getHorarios()])
      .then(([c, s, h]) => {
        setConfig(c)
        setServicios(s)
        setHorarios(h)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setCargando(false))
  }, [])

  function flash(msg: string) {
    setAviso(msg)
    setTimeout(() => setAviso(null), 2500)
  }

  async function guardarNegocio() {
    if (!config) return
    try {
      await actualizarConfig({
        nombre: config.nombre,
        direccion: config.direccion,
        ciudad: config.ciudad,
        telefono_wpp: config.telefono_wpp,
        anticipacion_min: config.anticipacion_min,
        dias_max: config.dias_max,
        slot_min: config.slot_min,
      })
      flash('Datos del negocio guardados.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  async function guardarServ(s: Servicio) {
    try {
      await guardarServicio(s)
      flash(`"${s.nombre}" guardado.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar servicio')
    }
  }

  async function nuevoServicio() {
    await guardarServicio({ nombre: 'Nuevo servicio', precio: 0, duracion_min: 30 })
    setServicios(await getServiciosTodos())
  }

  async function guardarDia(h: Horario) {
    try {
      await guardarHorario(h)
      flash(`${DIAS[h.dia_semana]} guardado.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar horario')
    }
  }

  if (cargando) return <p className="py-16 text-center text-muted">Cargando…</p>

  return (
    <div className="grid gap-8">
      {error && <p className="rounded-lg bg-red/15 px-4 py-2 text-sm text-red">{error}</p>}
      {aviso && (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red px-5 py-2 text-sm font-semibold text-white shadow-lg">
          {aviso}
        </p>
      )}

      {/* Negocio */}
      {config && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Negocio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Nombre" value={config.nombre} onChange={(v) => setConfig({ ...config, nombre: v })} />
            <Campo
              label="WhatsApp (ej. 573001234567)"
              value={config.telefono_wpp}
              onChange={(v) => setConfig({ ...config, telefono_wpp: v })}
            />
            <Campo label="Dirección" value={config.direccion} onChange={(v) => setConfig({ ...config, direccion: v })} />
            <Campo label="Ciudad" value={config.ciudad} onChange={(v) => setConfig({ ...config, ciudad: v })} />
            <CampoNum
              label="Antelación mínima (min)"
              value={config.anticipacion_min}
              onChange={(v) => setConfig({ ...config, anticipacion_min: v })}
            />
            <CampoNum
              label="Días reservables hacia adelante"
              value={config.dias_max}
              onChange={(v) => setConfig({ ...config, dias_max: v })}
            />
            <CampoNum
              label="Intervalo de turnos (min)"
              value={config.slot_min}
              onChange={(v) => setConfig({ ...config, slot_min: v })}
            />
          </div>
          <button
            onClick={guardarNegocio}
            className="mt-4 rounded-full bg-red px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-dark"
          >
            Guardar negocio
          </button>
        </section>
      )}

      {/* Servicios */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Servicios</h2>
          <button
            onClick={nuevoServicio}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-red"
          >
            + Añadir
          </button>
        </div>
        <div className="grid gap-3">
          {servicios.map((s, i) => (
            <div key={s.id} className="grid items-end gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
              <Campo
                label="Nombre"
                value={s.nombre}
                onChange={(v) => setServicios(upd(servicios, i, { nombre: v }))}
              />
              <CampoNum
                label="Precio"
                value={s.precio}
                onChange={(v) => setServicios(upd(servicios, i, { precio: v }))}
              />
              <CampoNum
                label="Min"
                value={s.duracion_min}
                onChange={(v) => setServicios(upd(servicios, i, { duracion_min: v }))}
              />
              <label className="flex items-center gap-2 pb-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={s.activo}
                  onChange={(e) => setServicios(upd(servicios, i, { activo: e.target.checked }))}
                  className="h-4 w-4 accent-red"
                />
                Activo
              </label>
              <button
                onClick={() => guardarServ(s)}
                className="mb-0.5 rounded-full bg-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-dark"
              >
                Guardar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Horario */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Horario</h2>
        <div className="grid gap-2">
          {horarios.map((h, i) => (
            <div key={h.dia_semana} className="grid items-center gap-2 border-t border-line pt-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
              <span className="font-semibold">{DIAS[h.dia_semana]}</span>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={h.abierto}
                  onChange={(e) => setHorarios(upd(horarios, i, { abierto: e.target.checked }))}
                  className="h-4 w-4 accent-red"
                />
                Abierto
              </label>
              <input
                type="time"
                value={h.apertura.slice(0, 5)}
                disabled={!h.abierto}
                onChange={(e) => setHorarios(upd(horarios, i, { apertura: e.target.value }))}
                className="rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-sm text-white outline-none focus:border-red disabled:opacity-40"
              />
              <input
                type="time"
                value={h.cierre.slice(0, 5)}
                disabled={!h.abierto}
                onChange={(e) => setHorarios(upd(horarios, i, { cierre: e.target.value }))}
                className="rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-sm text-white outline-none focus:border-red disabled:opacity-40"
              />
              <button
                onClick={() => guardarDia(h)}
                className="rounded-full bg-red px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-dark"
              >
                Guardar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function upd<T>(arr: T[], i: number, campos: Partial<T>): T[] {
  return arr.map((x, idx) => (idx === i ? { ...x, ...campos } : x))
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red"
      />
    </label>
  )
}

function CampoNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-white outline-none focus:border-red"
      />
    </label>
  )
}
