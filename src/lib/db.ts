import { supabase } from './supabase'
import type { Config, Servicio, Horario, Cliente, Turno, TurnoDetalle, EstadoTurno } from '../types'
import { rangoDiaISO } from './fecha'

// ======================= Catálogo público =======================

export async function getConfig(): Promise<Config | null> {
  const { data, error } = await supabase.from('config').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export async function getServiciosActivos(): Promise<Servicio[]> {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getHorarios(): Promise<Horario[]> {
  const { data, error } = await supabase
    .from('horarios')
    .select('*')
    .order('dia_semana', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ======================= Reserva pública (RPC) =======================

/** Horas de inicio disponibles para una fecha (YYYY-MM-DD) y un servicio. */
export async function getSlotsDisponibles(fecha: string, servicioId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('fn_slots_disponibles', {
    p_fecha: fecha,
    p_servicio_id: servicioId,
  })
  if (error) throw error
  return (data ?? []).map((r: { inicio: string }) => r.inicio)
}

/** Crea una reserva pública. Devuelve el id del turno creado. */
export async function crearReserva(params: {
  nombre: string
  telefono: string
  servicioId: string
  inicio: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('fn_crear_reserva', {
    p_nombre: params.nombre,
    p_telefono: params.telefono,
    p_servicio_id: params.servicioId,
    p_inicio: params.inicio,
  })
  if (error) throw error
  return data as string
}

/**
 * Dispara la confirmación por WhatsApp (Edge Function "whatsapp").
 * No falla la reserva si la función aún no está desplegada: se ignora el error.
 */
export async function enviarConfirmacionWpp(turnoId: string): Promise<void> {
  try {
    await supabase.functions.invoke('whatsapp', {
      body: { action: 'confirmacion', turno_id: turnoId },
    })
  } catch {
    // La mensajería automática puede no estar configurada todavía: no bloquea la reserva.
  }
}

// ======================= Panel: turnos =======================

const TURNO_SELECT =
  '*, cliente:clientes(nombre,telefono), servicio:servicios(nombre,duracion_min,precio)'

/** Turnos de un día de calendario (con cliente y servicio embebidos). */
export async function getTurnosDia(fecha: string, tz: string): Promise<TurnoDetalle[]> {
  const { desde, hasta } = rangoDiaISO(fecha, tz)
  const { data, error } = await supabase
    .from('turnos')
    .select(TURNO_SELECT)
    .gte('inicio', desde)
    .lt('inicio', hasta)
    .order('inicio', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as TurnoDetalle[]
}

export async function cambiarEstadoTurno(id: string, estado: EstadoTurno): Promise<void> {
  const { error } = await supabase.from('turnos').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function eliminarTurno(id: string): Promise<void> {
  const { error } = await supabase.from('turnos').delete().eq('id', id)
  if (error) throw error
}

/** Crea un turno desde el panel (upsert del cliente por teléfono). */
export async function crearTurnoPanel(params: {
  nombre: string
  telefono: string
  servicio: Servicio
  inicio: string
  notas?: string
}): Promise<Turno> {
  const { data: cli, error: e1 } = await supabase
    .from('clientes')
    .upsert({ nombre: params.nombre.trim(), telefono: params.telefono.trim() }, { onConflict: 'telefono' })
    .select('id')
    .single()
  if (e1) throw e1

  const inicio = new Date(params.inicio)
  const fin = new Date(inicio.getTime() + params.servicio.duracion_min * 60000).toISOString()

  const { data, error } = await supabase
    .from('turnos')
    .insert({
      cliente_id: cli.id,
      servicio_id: params.servicio.id,
      inicio: params.inicio,
      fin,
      estado: 'confirmado',
      origen: 'panel',
      notas: params.notas ?? '',
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Turno
}

// ======================= Panel: clientes =======================

export async function getClientes(busqueda?: string): Promise<Cliente[]> {
  let q = supabase.from('clientes').select('*').order('created_at', { ascending: false })
  if (busqueda && busqueda.trim()) {
    const b = `%${busqueda.trim()}%`
    q = q.or(`nombre.ilike.${b},telefono.ilike.${b}`)
  }
  const { data, error } = await q.limit(200)
  if (error) throw error
  return data ?? []
}

export async function getTurnosCliente(clienteId: string): Promise<TurnoDetalle[]> {
  const { data, error } = await supabase
    .from('turnos')
    .select(TURNO_SELECT)
    .eq('cliente_id', clienteId)
    .order('inicio', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as unknown as TurnoDetalle[]
}

export async function actualizarCliente(
  id: string,
  campos: Partial<Pick<Cliente, 'nombre' | 'telefono' | 'email' | 'notas'>>,
): Promise<void> {
  const { error } = await supabase.from('clientes').update(campos).eq('id', id)
  if (error) throw error
}

// ======================= Panel: ajustes =======================

export async function getServiciosTodos(): Promise<Servicio[]> {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .order('orden', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function guardarServicio(s: Partial<Servicio> & { id?: string }): Promise<void> {
  if (s.id) {
    const { id, ...campos } = s
    const { error } = await supabase.from('servicios').update(campos).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('servicios').insert({
      nombre: s.nombre ?? 'Nuevo servicio',
      descripcion: s.descripcion ?? '',
      precio: s.precio ?? 0,
      duracion_min: s.duracion_min ?? 30,
      activo: s.activo ?? true,
      orden: s.orden ?? 99,
    })
    if (error) throw error
  }
}

export async function actualizarConfig(
  campos: Partial<Pick<Config, 'nombre' | 'direccion' | 'ciudad' | 'telefono_wpp' | 'slot_min' | 'anticipacion_min' | 'dias_max'>>,
): Promise<void> {
  const { error } = await supabase.from('config').update(campos).eq('id', 1)
  if (error) throw error
}

export async function guardarHorario(h: Horario): Promise<void> {
  const { error } = await supabase
    .from('horarios')
    .update({ abierto: h.abierto, apertura: h.apertura, cierre: h.cierre })
    .eq('dia_semana', h.dia_semana)
  if (error) throw error
}
