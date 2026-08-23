import Hero from "@/components/home/Hero";
import HomeSections, { type CategoryTile } from "@/components/home/HomeSections";
import { getPublicProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";

// RED DE SEGURIDAD DE CACHÉ.
// Esta página no usa cookies ni headers, así que Next.js la
// pre-renderiza estática en el build y la sirve así para siempre. Las
// Server Actions del panel la invalidan con revalidatePath("/"), que es
// lo que la mantiene al día al instante. Este `revalidate` cubre lo que
// esa invalidación no ve: cambios hechos directamente en Supabase, o
// stock que bajó por una compra. Cada 60 segundos, la primera visita
// regenera la página en segundo plano.
export const revalidate = 60;

/** Cuántos bloques de categoría se muestran en el home. */
const CATEGORY_TILES = 4;
/** Cuántas fotos lleva la tira inferior. */
const GALLERY_SIZE = 4;

// Server Component: trae productos y categorías reales de Supabase una
// sola vez y deriva de ahí todas las secciones, evitando consultas
// redundantes. Usa getPublicProducts() (cliente sin cookies +
// status='active') porque esta página no depende de sesión.
export default async function HomePage() {
  const [products, categories, storeSettings] = await Promise.all([
    getPublicProducts(),
    getCategories(),
    getStoreSettingsOrDefault(),
  ]);

  const featured = products.filter((p) => p.featured);
  const onSale = products.filter((p) => p.compareAtPrice);
  // `getPublicProducts()` ya viene ordenado por created_at descendente,
  // así que "lo más nuevo" son los primeros — no hace falta reordenar
  // ni una segunda consulta.
  const newest = products.slice(0, 8);

  // Foto de cada bloque de categoría: la imagen propia de la categoría
  // si el admin la cargó y, si no, la portada de un producto real de
  // esa categoría. Nunca una foto de stock ajena a la marca.
  const categoryTiles: CategoryTile[] = categories.slice(0, CATEGORY_TILES).map((category) => {
    const fallback = products.find(
      (p) => p.categoryId === category.id && p.images.length > 0
    )?.images[0]?.url;
    return { category, image: category.image ?? fallback ?? null };
  });

  // Bloque editorial: la portada del producto más nuevo que tenga foto.
  // Si todavía no hay productos cargados, cae al banner de la tienda.
  const collectionImage =
    products.find((p) => p.images.length > 0)?.images[0]?.url ?? storeSettings.bannerUrl ?? null;

  // Tira inferior: fotos reales del catálogo, sin repetir la del bloque
  // editorial.
  const galleryImages = products
    .flatMap((p) => p.images.map((img) => img.url))
    .filter((url, index, all) => all.indexOf(url) === index && url !== collectionImage)
    .slice(0, GALLERY_SIZE);

  return (
    <>
      <Hero storeSettings={storeSettings} />
      <HomeSections
        featured={featured}
        newest={newest}
        onSale={onSale}
        categories={categories}
        categoryTiles={categoryTiles}
        collectionImage={collectionImage}
        galleryImages={galleryImages}
        instagramUrl={storeSettings.instagram}
        shippingInfo={storeSettings.shipping.info}
      />
    </>
  );
}
