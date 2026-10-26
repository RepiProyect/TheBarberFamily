import { createClient } from '@supabase/supabase-js'

/**
 * Valores por defecto del proyecto (públicos: la clave "publishable" está
 * pensada para usarse en el navegador; la seguridad real la da RLS en la BD).
 * En desarrollo se pueden sobreescribir con el archivo .env.
 */
const DEFAULT_URL = 'https://poujgtdtshuhlhgazsbd.supabase.co'
const DEFAULT_ANON_KEY = 'sb_publishable_T9hHCxYzMsC98ZR4aZRRpQ_zXYCUmMQ'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

/** `true` cuando hay URL y clave (siempre, gracias a los valores por defecto). */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Cliente de Supabase. */
export const supabase = createClient(url, anonKey)
