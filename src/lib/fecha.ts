// Utilidades de fecha y zona horaria (sin dependencias externas).
// Las "fechas" son cadenas 'YYYY-MM-DD' que representan un día de calendario.

/** Hoy en la zona horaria dada, como 'YYYY-MM-DD'. */
export function hoyEnZona(tz: string): string {
  // en-CA produce el formato YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Suma n días a una fecha 'YYYY-MM-DD'. */
export function sumarDias(fecha: string, n: number): string {
  const d = new Date(fecha + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Día de la semana (0=Domingo ... 6=Sábado) de una fecha 'YYYY-MM-DD'. */
export function diaSemana(fecha: string): number {
  return new Date(fecha + 'T00:00:00Z').getUTCDay()
}

/** Etiquetas cortas para una tarjeta de día: { dow:'lun', dia:'27', mes:'oct' }. */
export function etiquetaDia(fecha: string): { dow: string; dia: string; mes: string } {
  const d = new Date(fecha + 'T12:00:00Z')
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...opts }).format(d)
  return {
    dow: fmt({ weekday: 'short' }).replace('.', ''),
    dia: fmt({ day: '2-digit' }),
    mes: fmt({ month: 'short' }).replace('.', ''),
  }
}

/** Fecha larga legible: "lunes, 27 de octubre". */
export function fechaLarga(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

/** Hora legible de un timestamp ISO, en la zona dada: "9:30 a. m.". */
export function horaEnZona(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

/** Formatea pesos colombianos: 25000 -> "$25.000". */
export function formatoPrecio(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

/** Offset de una zona para una fecha, como "-05:00". */
export function offsetISO(tz: string, fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  const nombre =
    new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
  const m = nombre.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!m) return '+00:00'
  const signo = m[1]
  const hh = m[2].padStart(2, '0')
  const mm = (m[3] ?? '00').padStart(2, '0')
  return `${signo}${hh}:${mm}`
}

/** Rango [desde, hasta) en ISO que cubre un día de calendario en la zona dada. */
export function rangoDiaISO(fecha: string, tz: string): { desde: string; hasta: string } {
  const off = offsetISO(tz, fecha)
  return {
    desde: `${fecha}T00:00:00${off}`,
    hasta: `${sumarDias(fecha, 1)}T00:00:00${off}`,
  }
}

/** Construye un ISO a partir de fecha + "HH:MM" en la zona dada. */
export function isoDesdeHora(fecha: string, hhmm: string, tz: string): string {
  return `${fecha}T${hhmm}:00${offsetISO(tz, fecha)}`
}
