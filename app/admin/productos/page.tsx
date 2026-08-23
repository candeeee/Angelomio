import { getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import AdminProductsClient from "@/components/admin/AdminProductsClient";

// Server Component: solo se encarga de traer los datos iniciales desde
// Supabase (vía los services). Toda la interactividad (modal, tabla,
// mutaciones) vive en AdminProductsClient.
export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return <AdminProductsClient initialProducts={products} categories={categories} />;
}
