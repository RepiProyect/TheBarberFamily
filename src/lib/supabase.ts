import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** `true` solo cuando hay URL y clave configuradas en el archivo .env. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Cliente de Supabase. Si aún no hay credenciales en .env, se crea con
 * valores de marcador para que la app no se caiga: en ese caso la app
 * funciona en "modo demo" y nunca llega a usar este cliente
 * (todo se protege con `isSupabaseConfigured`).
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)
