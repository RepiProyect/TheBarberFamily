-- =====================================================================
-- THE BARBER FAMILY · WhatsApp (Fase 5)
-- Marca para no enviar el recordatorio dos veces al mismo turno.
-- Pegar en: Supabase Dashboard > SQL Editor > Run (del proyecto actual).
-- =====================================================================

alter table public.turnos
  add column if not exists recordatorio_enviado boolean not null default false;
