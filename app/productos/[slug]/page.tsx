import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProductBySlug, getPublicProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import ProductDetailClient from "./ProductDetailClient";

interface ProductDetailPageProps {
  params: { slug: string };
}

// Server Component. Usa getPublicProductBySlug()/getPublicProducts()
// (cliente sin cookies + status='active') porque esta página no
// depende de sesión — además, un producto oculto devuelve null acá
// aunque se conozca el slug exacto (ver services/products.ts).
//
// Los slugs salen de Supabase, así que cada página se genera la primera
// vez que alguien la pide y después queda cacheada. Esa caché la
// invalida el panel en cada edición (revalidatePath(`/productos/${slug}`)),
// y el `revalidate` de abajo es la red de seguridad para lo que se
// cambie fuera del panel.
export const revalidate = 60;

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const product = await getPublicProductBySlug(params.slug);
  if (!product) return { title: "Producto no encontrado" };

  const image = product.images[0]?.url;

  return {
    title: product.name,
    description:
      product.description.slice(0, 155) ||
      `${product.name} — Angelo Mio. Envíos a todo el país.`,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} | Angelo Mio`,
      description: product.description.slice(0, 155),
      url: `/productos/${product.slug}`,
      images: image ? [{ url: image, alt: product.images[0]?.alt || product.name }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = await getPublicProductBySlug(params.slug);
  if (!product) notFound();

  const [allProducts, categories, storeSettings] = await Promise.all([
    getPublicProducts(),
    getCategories(),
    getStoreSettingsOrDefault(),
  ]);

  const category = categories.find((c) => c.id === product.categoryId) ?? null;
  const related = allProducts
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <ProductDetailClient
      product={product}
      category={category}
      related={related}
      shippingInfo={storeSettings.shipping.info}
    />
  );
}
