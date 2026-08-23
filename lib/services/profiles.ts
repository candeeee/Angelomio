import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Servicio de perfiles (tabla `profiles`, ya migrada en Fase 1 —
// auth). Por ahora solo lectura: se usa para mostrar la lista real de
// administradores en /admin/configuracion.
//
// Usa el cliente CON cookies (no el público): es una vista sensible
// (emails de administradores) que solo debe resolver datos con la
// sesión real del usuario logueado, para que la policy de RLS
// "Admins pueden ver todos los perfiles" (ver
// supabase/migrations/001_profiles_and_roles.sql) se evalúe contra
// auth.uid() como corresponde. Con el cliente público (anon) esta
// query devolvería vacío o error, tal como debe ser.
// ─────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Profile["role"];
}

function mapRowToProfile(row: ProfileRow): Profile {
  return { id: row.id, email: row.email, full_name: row.full_name, role: row.role };
}

/**
 * Obtiene los perfiles con rol `admin` (los que tienen acceso al panel).
 * Requiere que quien ejecuta la query esté logueado como admin — si no,
 * la policy de RLS devuelve 0 filas (no es un error, es el
 * comportamiento esperado).
 */
export async function getAdminProfiles(): Promise<Profile[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "admin");

  if (error) {
    console.error("[services/profiles] Error cargando administradores:", error.message);
    return [];
  }

  return (data as ProfileRow[]).map(mapRowToProfile);
}

/**
 * Usuario logueado actual + su perfil, en una sola llamada. Devuelve
 * null si no hay sesión. Usado por Server Components que necesitan
 * saber "quién está mirando esta página" sin pasar por el AuthContext
 * de cliente (p. ej. /cuenta).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[services/profiles] Error cargando perfil actual:", error.message);
    return null;
  }
  if (!data) return null;

  return mapRowToProfile(data as ProfileRow);
}
