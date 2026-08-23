import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

/**
 * Cliente de Supabase para lecturas públicas del catálogo (productos,
 * categorías) que NO dependen de la sesión del usuario.
 *
 * A diferencia de `createServerSupabaseClient()` (lib/supabase/server.ts),
 * este NO llama a `cookies()` de `next/headers` — por eso las páginas que
 * solo usan este cliente pueden volver a pre-renderizarse como estáticas.
 * Siempre corre como el rol `anon` de Supabase, esté o no logueado quien
 * visita la página.
 *
 * CUÁNDO USAR CADA UNO:
 *  - Este cliente → lecturas públicas de catálogo (getProducts,
 *    getProductBySlug, getCategories) que se muestran igual a cualquier
 *    visitante, esté logueado o no.
 *  - `createServerSupabaseClient()` → cualquier mutación (create/update/
 *    delete) o lectura que dependa de quién está logueado, para que las
 *    policies de RLS se evalúen con el usuario real (auth.uid()).
 *
 * SUPUESTO A VERIFICAR: se asume que las policies de RLS de `products` y
 * `categories` permiten `select` al rol `anon` (si el catálogo ya se veía
 * antes de loguearse, esto ya se cumple). Si en el futuro un admin
 * logueado necesitara ver productos ocultos/borrador en la tienda
 * pública con una policy distinta para `authenticated`, este cliente no
 * lo reflejaría — habría que volver a `createServerSupabaseClient()` para
 * ese caso puntual.
 */
export function createPublicSupabaseClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false },
  });
}
