import type { EstadoTurno } from '../types'

const MAP: Record<EstadoTurno, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  confirmado: { label: 'Confirmado', color: '#22c55e' },
  completado: { label: 'Completado', color: '#3b82f6' },
  cancelado: { label: 'Cancelado', color: '#e50914' },
  no_show: { label: 'No asistió', color: '#a6a6a6' },
}

export function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  const i = MAP[estado]
  return (
    <span
      className="inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: i.color, backgroundColor: `${i.color}22`, borderColor: `${i.color}55` }}
    >
      {i.label}
    </span>
  )
}
