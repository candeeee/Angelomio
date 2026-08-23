import { getCategories } from "@/lib/services/categories";
import AdminCategoriesClient from "@/components/admin/AdminCategoriesClient";

// Server Component: solo trae los datos iniciales desde Supabase. Nota:
// usa getCategories() (cliente público) para la carga inicial — como es
// simple lectura, no hace falta el cliente con cookies acá; las
// mutaciones (crear/editar/borrar/reordenar) sí lo usan, vía actions.ts.
export default async function AdminCategoriesPage() {
  const categories = await getCategories();
  return <AdminCategoriesClient initialCategories={categories} />;
}
