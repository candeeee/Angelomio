import type { MetadataRoute } from "next";
import { getPublicProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { SITE_URL } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// Sitemap dinámico: páginas fijas + una entrada por producto activo y
// una por categoría. Sale de Supabase, así que se mantiene solo.
//
// Se revalida con la misma cadencia que el catálogo (60s) para no
// consultar la base en cada request de un crawler.
// ─────────────────────────────────────────────────────────────

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getPublicProducts(), getCategories()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/productos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/nosotros`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/contacto`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/envios`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/cambios`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/productos?categoria=${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/productos/${product.slug}`,
    lastModified: new Date(product.createdAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
