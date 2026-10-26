// Tipos del dominio de THE BARBER FAMILY (reflejan el esquema de Supabase).

export type EstadoTurno =
  | 'pendiente'
  | 'confirmado'
  | 'completado'
  | 'cancelado'
  | 'no_show'

export type OrigenTurno = 'cliente' | 'panel'

export interface Config {
  id: number
  nombre: string
  direccion: string
  ciudad: string
  telefono_wpp: string
  zona_horaria: string
  slot_min: number
  anticipacion_min: number
  dias_max: number
}

export interface Servicio {
  id: string
  nombre: string
  descripcion: string
  precio: number
  duracion_min: number
  activo: boolean
  orden: number
}

export interface Horario {
  dia_semana: number // 0=Domingo ... 6=Sábado
  abierto: boolean
  apertura: string // "HH:MM"
  cierre: string // "HH:MM"
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  email: string | null
  notas: string
  ultima_visita: string | null
  created_at: string
}

export interface Turno {
  id: string
  cliente_id: string
  servicio_id: string
  inicio: string // ISO timestamptz
  fin: string
  estado: EstadoTurno
  origen: OrigenTurno
  notas: string
  created_at: string
}

/** Turno con los datos del cliente y servicio ya resueltos (para el panel). */
export interface TurnoDetalle extends Turno {
  cliente: Pick<Cliente, 'nombre' | 'telefono'> | null
  servicio: Pick<Servicio, 'nombre' | 'duracion_min' | 'precio'> | null
}
