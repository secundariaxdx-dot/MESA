/**
 * Capa de persistencia.
 *
 * La v1 guarda todo en localStorage del dispositivo (sin cuentas, sin enviar
 * datos a ningún servidor). Para migrar a Supabase:
 *  1. Crear las tablas de supabase/schema.sql.
 *  2. Implementar SupabaseStorage (abajo) con el cliente @supabase/supabase-js
 *     y autenticación; el estado se guarda por usuario en `mesa_state`.
 *  3. Cambiar `storageAdapter` por la implementación remota.
 * El store (zustand persist) no necesita cambios: solo usa esta interfaz.
 */
export interface KeyValueStorage {
  getItem(name: string): string | null | Promise<string | null>;
  setItem(name: string, value: string): void | Promise<void>;
  removeItem(name: string): void | Promise<void>;
}

const memory = new Map<string, string>();

export const localStorageAdapter: KeyValueStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

/**
 * Esqueleto para la futura integración con Supabase. No se usa en la v1.
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y sesión de usuario.
 */
export function createSupabaseStorage(): KeyValueStorage {
  throw new Error("Supabase aún no está configurado. Consulta supabase/schema.sql y README.");
}

export const storageAdapter: KeyValueStorage = localStorageAdapter;
