/**
 * AIRPORT - Cliente Supabase
 * Configuración del cliente para Auth y base de datos PostgreSQL.
 *
 * Origen de credenciales (por prioridad):
 * 1. window.__ENV__ (para app estática: definir en config.local.js o script antes de cargar la app)
 * 2. import.meta.env (si usas Vite: variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env)
 * 3. Valores por defecto abajo (solo desarrollo; en producción usar variables de entorno)
 *
 * Para producción: crear .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, o config.local.js
 * que defina window.__ENV__ = { SUPABASE_URL, SUPABASE_ANON_KEY }. Añadir config.local.js a .gitignore.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const getEnv = (key, fallback) => {
  if (typeof window !== 'undefined' && window.__ENV__?.[key] != null) return window.__ENV__[key];
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key] != null) return import.meta.env[key];
  } catch (_) {}
  return fallback ?? '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL', 'https://mgbeuvhxribmirdnezke.supabase.co'));
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmV1dmh4cmlibWlyZG5lemtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjYwMDUsImV4cCI6MjA4NTgwMjAwNX0.xZlCZITfk0d_TSrV-eKNkx5eO20eNRkuotl0DYeUcyc'));

/**
 * Cliente Supabase exportado para usar en auth, orders, payments, etc.
 * RLS en la base de datos restringe el acceso por usuario.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
