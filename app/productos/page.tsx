import type { Metadata } from "next";
import { getPublicProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import ProductsExplorer from "@/components/product/ProductsExplorer";

interface ProductsPageProps {
  searchParams: { categoria?: string; q?: string };
}

// Ver el comentario en app/page.tsx: revalidación en background cada
// 60s como red de seguridad, además del revalidatePath("/productos")
// que ya dispara el panel en cada cambio.
export const revalidate = 60;

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  // Metadata dinámica por categoría: cada URL de catálogo tiene su
  // propio title/description en vez de compartir uno genérico.
  if (searchParams.categoria) {
    const categories = await getCategories();
    const category = categories.find((c) => c.slug === searchParams.categoria);
    if (category) {
      return {
        title: category.name,
        description: `Descubrí nuestra selección de ${category.name.toLowerCase()} en Angelo Mio. Envíos a todo el país.`,
        alternates: { canonical: `/productos?categoria=${category.slug}` },
      };
    }
  }

  return {
    title: "Catálogo",
    description: "Indumentaria y accesorios Angelo Mio. Jeans, remeras, camisas y básicos.",
    alternates: { canonical: "/productos" },
  };
}

// Server Component: Next.js ya nos da `searchParams` como prop, así que
// no hace falta `useSearchParams()` + Suspense. Usa getPublicProducts()
// (cliente sin cookies + status='active') porque esta página no depende
// de sesión.
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [products, categories] = await Promise.all([getPublicProducts(), getCategories()]);

  return (
    <ProductsExplorer
      products={products}
      categories={categories}
      initialCategory={searchParams.categoria ?? null}
      initialSearch={searchParams.q ?? ""}
    />
  );
}
