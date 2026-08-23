"use server";

import { revalidatePath } from "next/cache";
import * as categoriesService from "@/lib/services/categories";

// ─────────────────────────────────────────────────────────────
// Mismo patrón que app/admin/productos/actions.ts:
//
//   AdminCategoriesClient ("use client") → actions.ts ("use server")
//   → services/categories.ts → Supabase
//
// Toda mutación de categorías invalida el árbol completo desde la raíz
// (ver revalidateCategoryPaths más abajo): el header las lee en el
// layout raíz, así que no alcanza con invalidar páginas sueltas.
// ─────────────────────────────────────────────────────────────

export interface CategoryFormInput {
  name: string;
  slug: string;
  order: number;
  image?: string;
}

function revalidateCategoryPaths() {
  // "layout" es imprescindible acá: las categorías se leen en
  // app/layout.tsx (header y menú mobile), que es el layout raíz
  // compartido por todo el sitio. Invalidando sólo `/` y `/productos`,
  // el header de cualquier otra ruta seguía mostrando la lista vieja
  // hasta que venciera el `revalidate` de 60 segundos.
  //
  // Con "layout", crear, renombrar, reordenar o eliminar una categoría
  // se refleja inmediatamente en el header, el menú mobile, los filtros
  // del catálogo y la home.
  revalidatePath("/", "layout");
}

export async function createCategoryAction(input: CategoryFormInput) {
  const { error } = await categoriesService.createCategory(input);
  if (error) return { error: error.message };

  revalidateCategoryPaths();
  return { error: null };
}

export async function updateCategoryAction(id: string, input: CategoryFormInput) {
  const { error } = await categoriesService.updateCategory(id, input);
  if (error) return { error: error.message };

  revalidateCategoryPaths();
  return { error: null };
}

export async function updateCategoryOrderAction(id: string, order: number) {
  const { error } = await categoriesService.updateCategoryOrder(id, order);
  if (error) return { error: error.message };

  revalidateCategoryPaths();
  return { error: null };
}

export async function deleteCategoryAction(id: string) {
  const { error } = await categoriesService.deleteCategory(id);
  if (error) return { error: error.message };

  revalidateCategoryPaths();
  return { error: null };
}
