/**
 * AIRPORT - Cliente Supabase
 * Configuración del cliente para Auth y base de datos PostgreSQL.
 * IMPORTANTE: Sustituir [project-ref] y [anon-key] por los valores de tu proyecto en Supabase.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Reemplaza con tu URL del proyecto (Dashboard Supabase → Settings → API)
const SUPABASE_URL = 'https://mgbeuvhxribmirdnezke.supabase.co';

// Reemplaza con tu anon/public key (Dashboard Supabase → Settings → API)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmV1dmh4cmlibWlyZG5lemtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjYwMDUsImV4cCI6MjA4NTgwMjAwNX0.xZlCZITfk0d_TSrV-eKNkx5eO20eNRkuotl0DYeUcyc';

/**
 * Cliente Supabase exportado para usar en auth, orders, payments, etc.
 * Usa la anon key; RLS en la base de datos restringe el acceso por usuario.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
