"use server";

import { revalidatePath } from "next/cache";
import * as categoriesService from "@/lib/services/categories";

// ─────────────────────────────────────────────────────────────
// Mismo patrón que app/admin/productos/actions.ts:
//
//   AdminCategoriesClient ("use client") → actions.ts ("use server")
//   → services/categories.ts → Supabase
//
// Revalida /admin/categorias y también /productos y / (Home), porque
// ambas leen categorías reales y deben reflejar el cambio.
// ─────────────────────────────────────────────────────────────

export interface CategoryFormInput {
  name: string;
  slug: string;
  order: number;
  image?: string;
}

function revalidateCategoryPaths() {
  revalidatePath("/admin/categorias");
  revalidatePath("/productos");
  revalidatePath("/");
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
