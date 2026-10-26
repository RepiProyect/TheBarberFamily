-- =====================================================================
-- THE BARBER FAMILY · Esquema inicial
-- Pegar COMPLETO en: Supabase Dashboard > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- =====================  TABLAS  ======================================

-- Configuración general de la barbería (una sola fila, id = 1)
create table if not exists public.config (
  id             int primary key default 1 check (id = 1),
  nombre         text not null default 'THE BARBER FAMILY',
  direccion      text default '',
  ciudad         text default '',
  telefono_wpp   text default '',            -- formato internacional sin "+", ej: 573001234567
  zona_horaria   text not null default 'America/Bogota',
  slot_min       int  not null default 15,   -- granularidad de los horarios ofrecidos
  anticipacion_min int not null default 60,  -- antelación mínima para reservar (minutos)
  dias_max       int  not null default 30,   -- cuántos días hacia adelante se puede reservar
  created_at     timestamptz not null default now()
);

-- Servicios ofrecidos
create table if not exists public.servicios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique,
  descripcion  text default '',
  precio       int  not null default 0,      -- en pesos (COP)
  duracion_min int  not null default 30,
  activo       boolean not null default true,
  orden        int  not null default 0,
  created_at   timestamptz not null default now()
);

-- Clientes
create table if not exists public.clientes (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  telefono       text not null unique,       -- identificador natural del cliente
  email          text,
  notas          text default '',
  ultima_visita  timestamptz,
  created_at     timestamptz not null default now()
);

-- Horario semanal (una fila por día; 0=Domingo ... 6=Sábado, igual que EXTRACT(DOW))
create table if not exists public.horarios (
  dia_semana int primary key check (dia_semana between 0 and 6),
  abierto    boolean not null default true,
  apertura   time not null default '09:00',
  cierre     time not null default '20:00'
);

-- Bloqueos / ausencias (vacaciones, almuerzo, día libre puntual)
create table if not exists public.bloqueos (
  id         uuid primary key default gen_random_uuid(),
  inicio     timestamptz not null,
  fin        timestamptz not null,
  motivo     text default '',
  created_at timestamptz not null default now(),
  check (fin > inicio)
);

-- Turnos / citas
create table if not exists public.turnos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  servicio_id uuid not null references public.servicios(id) on delete restrict,
  inicio      timestamptz not null,
  fin         timestamptz not null,
  estado      text not null default 'pendiente'
              check (estado in ('pendiente','confirmado','completado','cancelado','no_show')),
  origen      text not null default 'cliente' check (origen in ('cliente','panel')),
  notas       text default '',
  created_at  timestamptz not null default now(),
  check (fin > inicio),
  -- Evita doble reserva: ningún turno activo puede solaparse con otro
  constraint turnos_no_solape
    exclude using gist (tstzrange(inicio, fin) with &&) where (estado <> 'cancelado')
);

create index if not exists turnos_inicio_idx on public.turnos (inicio);
create index if not exists turnos_cliente_idx on public.turnos (cliente_id);
create index if not exists turnos_estado_idx on public.turnos (estado);

-- Log de mensajes de WhatsApp (confirmaciones / recordatorios)
create table if not exists public.mensajes_wpp (
  id          uuid primary key default gen_random_uuid(),
  turno_id    uuid references public.turnos(id) on delete set null,
  cliente_id  uuid references public.clientes(id) on delete set null,
  tipo        text not null check (tipo in ('confirmacion','recordatorio','manual')),
  destino     text not null,
  estado      text not null default 'pendiente'
              check (estado in ('pendiente','enviado','fallido')),
  payload     jsonb,
  error       text,
  enviado_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists mensajes_turno_idx on public.mensajes_wpp (turno_id);

-- =====================  SEGURIDAD (RLS)  =============================
-- Público (anon): solo lee servicios/horario/config y reserva vía funciones.
-- Dueño (authenticated): acceso total al panel.

alter table public.config       enable row level security;
alter table public.servicios    enable row level security;
alter table public.clientes     enable row level security;
alter table public.horarios     enable row level security;
alter table public.bloqueos     enable row level security;
alter table public.turnos       enable row level security;
alter table public.mensajes_wpp enable row level security;

-- Lectura pública de catálogo y horario
drop policy if exists config_public_read on public.config;
create policy config_public_read on public.config
  for select using (true);

drop policy if exists servicios_public_read on public.servicios;
create policy servicios_public_read on public.servicios
  for select using (activo = true);

drop policy if exists horarios_public_read on public.horarios;
create policy horarios_public_read on public.horarios
  for select using (true);

-- Acceso total del dueño (cualquier usuario autenticado)
do $$
declare t text;
begin
  foreach t in array array['config','servicios','clientes','horarios','bloqueos','turnos','mensajes_wpp']
  loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated using (true) with check (true)',
      t, t);
  end loop;
end $$;

-- =====================  FUNCIONES (RPC)  =============================

-- Devuelve las horas de inicio disponibles para una fecha y servicio.
-- SECURITY DEFINER: puede leer turnos/bloqueos aunque el anon no tenga acceso directo.
create or replace function public.fn_slots_disponibles(p_fecha date, p_servicio_id uuid)
returns table(inicio timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dur int; v_slot int; v_antic int;
  v_abierto boolean; v_ap time; v_cie time;
  v_dow int; v_tz text;
begin
  select duracion_min into v_dur from servicios where id = p_servicio_id and activo;
  if v_dur is null then return; end if;

  select slot_min, anticipacion_min, zona_horaria
    into v_slot, v_antic, v_tz from config where id = 1;
  v_slot  := coalesce(v_slot, 15);
  v_antic := coalesce(v_antic, 60);
  v_tz    := coalesce(v_tz, 'America/Bogota');

  v_dow := extract(dow from p_fecha)::int;
  select abierto, apertura, cierre into v_abierto, v_ap, v_cie
    from horarios where dia_semana = v_dow;
  if not coalesce(v_abierto, false) then return; end if;

  return query
  with base as (
    select gs as t
    from generate_series(
      (p_fecha + v_ap) at time zone v_tz,
      ((p_fecha + v_cie) at time zone v_tz) - make_interval(mins => v_dur),
      make_interval(mins => v_slot)
    ) as gs
  )
  select b.t
  from base b
  where b.t >= now() + make_interval(mins => v_antic)
    and not exists (
      select 1 from turnos x
      where x.estado <> 'cancelado'
        and tstzrange(x.inicio, x.fin) && tstzrange(b.t, b.t + make_interval(mins => v_dur))
    )
    and not exists (
      select 1 from bloqueos z
      where tstzrange(z.inicio, z.fin) && tstzrange(b.t, b.t + make_interval(mins => v_dur))
    )
  order by b.t;
end;
$$;

-- Crea una reserva desde la app pública: upsert del cliente + inserta el turno.
create or replace function public.fn_crear_reserva(
  p_nombre text,
  p_telefono text,
  p_servicio_id uuid,
  p_inicio timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dur int; v_fin timestamptz; v_cliente uuid; v_turno uuid;
begin
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_telefono), '') = '' then
    raise exception 'Nombre y teléfono son obligatorios';
  end if;

  select duracion_min into v_dur from servicios where id = p_servicio_id and activo;
  if v_dur is null then raise exception 'Servicio no válido'; end if;

  v_fin := p_inicio + make_interval(mins => v_dur);

  if p_inicio < now() then
    raise exception 'No se puede reservar en el pasado';
  end if;

  if exists (
    select 1 from turnos x
    where x.estado <> 'cancelado'
      and tstzrange(x.inicio, x.fin) && tstzrange(p_inicio, v_fin)
  ) then
    raise exception 'Ese horario ya fue reservado';
  end if;

  insert into clientes (nombre, telefono)
    values (trim(p_nombre), trim(p_telefono))
    on conflict (telefono) do update set nombre = excluded.nombre
    returning id into v_cliente;

  insert into turnos (cliente_id, servicio_id, inicio, fin, estado, origen)
    values (v_cliente, p_servicio_id, p_inicio, v_fin, 'pendiente', 'cliente')
    returning id into v_turno;

  return v_turno;
end;
$$;

grant execute on function public.fn_slots_disponibles(date, uuid) to anon, authenticated;
grant execute on function public.fn_crear_reserva(text, text, uuid, timestamptz) to anon, authenticated;

-- =====================  DATOS INICIALES (SEED)  ======================

insert into public.config (id) values (1) on conflict (id) do nothing;

-- Horario: Lun–Sáb abierto, Domingo cerrado
insert into public.horarios (dia_semana, abierto, apertura, cierre) values
  (1, true,  '09:00', '20:00'),   -- Lunes
  (2, true,  '09:00', '20:00'),   -- Martes
  (3, true,  '09:00', '20:00'),   -- Miércoles
  (4, true,  '09:00', '20:00'),   -- Jueves
  (5, true,  '09:00', '20:00'),   -- Viernes
  (6, true,  '08:00', '21:00'),   -- Sábado
  (0, false, '09:00', '20:00')    -- Domingo (cerrado)
on conflict (dia_semana) do nothing;

insert into public.servicios (nombre, descripcion, precio, duracion_min, orden) values
  ('Corte clásico',   'Máquina y tijera, lavado y peinado.',       25000, 40, 1),
  ('Corte + barba',   'Corte completo y perfilado de barba.',      35000, 60, 2),
  ('Barba',           'Perfilado, toalla caliente y aceites.',     15000, 30, 3),
  ('Corte niño',      'Para los más pequeños de la familia.',      20000, 30, 4),
  ('Diseño / líneas', 'Figuras y líneas personalizadas.',          30000, 45, 5),
  ('Mascarilla negra','Limpieza facial y puntos negros.',          18000, 20, 6)
on conflict (nombre) do nothing;

-- =====================  FIN  =========================================
