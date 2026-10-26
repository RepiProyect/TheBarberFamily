// Edge Function: envío de mensajes de WhatsApp (Meta Cloud API)
// para BARBER THE FAMILY.
//
// Acciones (POST con JSON):
//   { "action": "confirmacion", "turno_id": "<uuid>" }  -> confirma un turno
//   { "action": "recordatorios" }                        -> envía recordatorios (para el cron)
//
// Secrets requeridos (Supabase > Project Settings > Edge Functions > Secrets):
//   WHATSAPP_TOKEN        token permanente de Meta (WhatsApp Business API)
//   WHATSAPP_PHONE_ID     ID del número de WhatsApp Business (Phone number ID)
//   WHATSAPP_TPL_LANG     (opcional) idioma de las plantillas, por defecto "es"
//   RECORDATORIO_HORAS    (opcional) horas de anticipación del recordatorio, por defecto "3"
//   CRON_SECRET           (opcional) protege la acción "recordatorios" (cabecera x-cron-secret)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v21.0'
const TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID') ?? ''
const TPL_LANG = Deno.env.get('WHATSAPP_TPL_LANG') ?? 'es'
const REM_HORAS = Number(Deno.env.get('RECORDATORIO_HORAS') ?? '3')
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const TZ = 'America/Bogota'

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function soloDigitos(tel: string): string {
  return (tel || '').replace(/\D/g, '')
}

function fechaHoraLegible(iso: string): string {
  const d = new Date(iso)
  const f = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
  const h = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
  return `${f} a las ${h}`
}

async function enviarPlantilla(to: string, plantilla: string, params: string[]) {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: plantilla,
        language: { code: TPL_LANG },
        components: [
          { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
        ],
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message ?? 'Error al enviar WhatsApp')
  return data
}

// deno-lint-ignore no-explicit-any
async function registrar(
  turnoId: string | null,
  clienteId: string | null,
  tipo: string,
  destino: string,
  estado: string,
  error?: string,
  payload?: any,
) {
  await db.from('mensajes_wpp').insert({
    turno_id: turnoId,
    cliente_id: clienteId,
    tipo,
    destino,
    estado,
    error: error ?? null,
    payload: payload ?? null,
    enviado_at: estado === 'enviado' ? new Date().toISOString() : null,
  })
}

async function confirmarTurno(turnoId: string) {
  const { data: t, error } = await db
    .from('turnos')
    .select('id, inicio, cliente:clientes(id,nombre,telefono), servicio:servicios(nombre)')
    .eq('id', turnoId)
    .single()
  if (error || !t) throw new Error('Turno no encontrado')
  // deno-lint-ignore no-explicit-any
  const cli: any = t.cliente
  // deno-lint-ignore no-explicit-any
  const serv: any = t.servicio
  const to = soloDigitos(cli?.telefono ?? '')
  if (!to) throw new Error('Cliente sin teléfono')
  try {
    const r = await enviarPlantilla(to, 'confirmacion_turno', [
      cli?.nombre ?? '',
      serv?.nombre ?? '',
      fechaHoraLegible(t.inicio),
    ])
    await registrar(t.id, cli?.id ?? null, 'confirmacion', to, 'enviado', undefined, r)
    return { ok: true }
  } catch (e) {
    await registrar(t.id, cli?.id ?? null, 'confirmacion', to, 'fallido', String(e))
    throw e
  }
}

async function enviarRecordatorios() {
  const ahora = new Date()
  const limite = new Date(ahora.getTime() + REM_HORAS * 3600_000)
  const { data: turnos, error } = await db
    .from('turnos')
    .select('id, inicio, cliente:clientes(id,nombre,telefono), servicio:servicios(nombre)')
    .in('estado', ['pendiente', 'confirmado'])
    .eq('recordatorio_enviado', false)
    .gte('inicio', ahora.toISOString())
    .lte('inicio', limite.toISOString())
  if (error) throw error

  let enviados = 0
  for (const t of turnos ?? []) {
    // deno-lint-ignore no-explicit-any
    const cli: any = t.cliente
    // deno-lint-ignore no-explicit-any
    const serv: any = t.servicio
    const to = soloDigitos(cli?.telefono ?? '')
    if (!to) continue
    try {
      const r = await enviarPlantilla(to, 'recordatorio_turno', [
        cli?.nombre ?? '',
        serv?.nombre ?? '',
        fechaHoraLegible(t.inicio),
      ])
      await registrar(t.id, cli?.id ?? null, 'recordatorio', to, 'enviado', undefined, r)
      await db.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
      enviados++
    } catch (e) {
      await registrar(t.id, cli?.id ?? null, 'recordatorio', to, 'fallido', String(e))
    }
  }
  return { ok: true, enviados, revisados: turnos?.length ?? 0 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  try {
    if (!TOKEN || !PHONE_ID) {
      throw new Error('Faltan los secrets WHATSAPP_TOKEN / WHATSAPP_PHONE_ID')
    }
    const body = await req.json().catch(() => ({}))
    switch (body.action) {
      case 'confirmacion':
        if (!body.turno_id) throw new Error('Falta turno_id')
        return json(await confirmarTurno(body.turno_id))
      case 'recordatorios':
        if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
          return json({ error: 'No autorizado' }, 401)
        }
        return json(await enviarRecordatorios())
      default:
        return json({ error: 'Acción no válida' }, 400)
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
