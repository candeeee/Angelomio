import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { Category } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Servicio de categorías — mismo patrón que services/products.ts.
//
// Columnas confirmadas contra el esquema real de Supabase (no asumidas):
// id, name, slug, order (int4), image (text), created_at.
//
// Usa el cliente público (sin cookies) porque el listado de categorías
// es igual para cualquier visitante — esto permite que las páginas que
// solo leen categorías vuelvan a pre-renderizarse como estáticas.
// ─────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  order: number | null;
  image: string | null;
}

function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    order: row.order ?? 0,
    image: row.image ?? undefined,
  };
}

/**
 * Obtiene todas las categorías, ordenadas por `order`.
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("[services/categories] Error cargando categorías:", error.message);
    return [];
  }

  return (data as CategoryRow[]).map(mapRowToCategory);
}

interface CategoryInput {
  name: string;
  slug: string;
  order: number;
  image?: string;
}

/**
 * Crea una categoría nueva. Cliente con cookies (no el público): es una
 * mutación de admin, tiene que correr con la sesión real para que las
 * policies de RLS de escritura se evalúen contra el usuario logueado.
 */
export async function createCategory(input: CategoryInput) {
  const supabase = createServerSupabaseClient();

  return supabase.from("categories").insert({
    name: input.name,
    slug: input.slug,
    order: input.order,
    image: input.image ?? null,
  });
}

/**
 * Actualiza una categoría existente.
 */
export async function updateCategory(id: string, input: CategoryInput) {
  const supabase = createServerSupabaseClient();

  return supabase
    .from("categories")
    .update({
      name: input.name,
      slug: input.slug,
      order: input.order,
      image: input.image ?? null,
    })
    .eq("id", id);
}

/**
 * Actualiza únicamente el `order` de una categoría (usado para
 * subir/bajar en el listado admin, sin tocar el resto de los campos).
 */
export async function updateCategoryOrder(id: string, order: number) {
  const supabase = createServerSupabaseClient();
  return supabase.from("categories").update({ order }).eq("id", id);
}

/**
 * Elimina una categoría.
 *
 * LIMITACIÓN DOCUMENTADA (no se modifica el esquema): `products.category_id`
 * es TEXT sin FK real a `categories.id`, así que Postgres no puede impedir
 * ni resolver automáticamente el borrado de una categoría que todavía
 * tiene productos asociados — quedarían con un `category_id` que ya no
 * existe. Se recomienda no borrar categorías con productos activos hasta
 * que se decida cómo manejar ese caso (reasignar productos, o agregar un
 * `ON DELETE` real si en algún momento se habilita tocar el esquema).
 */
export async function deleteCategory(id: string) {
  const supabase = createServerSupabaseClient();
  return supabase.from("categories").delete().eq("id", id);
}
