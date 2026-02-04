/**
 * AIRPORT - Módulo de autenticación
 * Login, logout y comprobación de sesión con Supabase Auth.
 */

import { supabase } from '../supabase.js';

/** Usuario actual en memoria (se actualiza con getCurrentUser / onAuthStateChange) */
let currentUser = null;

/**
 * Resuelve "usuario o correo" al email real (para login).
 * Si el valor contiene @ se usa como email; si no, se busca en public.user_logins.
 * @param {string} identifier - Usuario (ej. "chanti") o email
 * @returns {Promise<string|null>} - Email para signInWithPassword, o null si no se encuentra
 */
export async function resolveLoginIdentifier(identifier) {
  const trimmed = (identifier || '').trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return trimmed;
  const { data, error } = await supabase.from('user_logins').select('email').eq('username', trimmed).maybeSingle();
  if (error) {
    console.error('Error al resolver usuario:', error);
    return null;
  }
  return data?.email ?? null;
}

/**
 * Inicia sesión con usuario o email y contraseña.
 * Acepta "chanti" (busca el email en user_logins) o el correo directamente.
 * @param {string} identifier - Usuario (ej. "chanti") o email
 * @param {string} password - Contraseña
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function login(identifier, password) {
  try {
    const email = await resolveLoginIdentifier(identifier);
    if (!email) {
      return { success: false, error: 'Usuario o correo no encontrado.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    currentUser = data?.user ?? null;
    return { success: true };
  } catch (err) {
    console.error('Error en login:', err);
    return { success: false, error: err.message || 'Error al iniciar sesión' };
  }
}

/**
 * Cierra la sesión del usuario y limpia el estado local.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    currentUser = null;
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Error en logout:', err);
    currentUser = null;
    return { success: false, error: err.message || 'Error al cerrar sesión' };
  }
}

/**
 * Obtiene el usuario actual (desde sesión de Supabase).
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getCurrentUser:', error);
      return null;
    }
    currentUser = user;
    return user;
  } catch (err) {
    console.error('Error en getCurrentUser:', err);
    return null;
  }
}

/**
 * Obtiene el ID del usuario actual (para consultas Supabase).
 * @returns {Promise<string|null>}
 */
export async function getUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Obtiene la sesión actual (útil para comprobar si hay sesión sin getCurrentUser).
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch (err) {
    console.error('Error en getSession:', err);
    return null;
  }
}

/**
 * Suscripción a cambios de autenticación (login/logout en otra pestaña, expiración, etc.).
 * @param { (event: string, session: import('@supabase/supabase-js').Session | null) => void } callback
 * @returns { { data: { subscription: { unsubscribe: () => void } } } }
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    callback(event, session);
  });
}

/**
 * Objeto del módulo para uso opcional (init/render si se integra con router).
 */
/** Servicio de autenticación (alias para uso en app y módulos). */
export const AuthService = {
  getCurrentUser,
  getUserId,
  logout,
  getSession,
  onAuthStateChange,
};

export const AuthModule = {
  init() {
    onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !session) {
        currentUser = null;
      }
    });
  },
  async getCurrentUser() {
    return getCurrentUser();
  },
  async getUserId() {
    return getUserId();
  },
  async login(email, password) {
    return login(email, password);
  },
  async logout() {
    return logout();
  },
};
