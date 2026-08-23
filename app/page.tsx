import Hero from "@/components/home/Hero";
import HomeSections, { type CategoryTile } from "@/components/home/HomeSections";
import { getPublicProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";

// RED DE SEGURIDAD DE CACHÉ.
// Esta página no usa cookies ni headers, así que Next.js la
// pre-renderiza y la sirve estática. Las Server Actions del panel la
// invalidan con revalidatePath("/", "layout") en cada cambio, que es lo
// que la mantiene al día al instante. Este `revalidate` cubre lo que
// esa invalidación no ve: cambios hechos directamente en Supabase.
export const revalidate = 60;

/** Máximo de bloques de categoría en la home. */
const MAX_CATEGORY_TILES = 8;
/** Cuántas fotos lleva la tira de Instagram. */
const GALLERY_SIZE = 4;

// Server Component: una sola lectura del catálogo, de la que se derivan
// todas las secciones. Usa getPublicProducts() (cliente sin cookies +
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
  // así que "lo más nuevo" son los primeros.
  const newest = products.slice(0, 8);

  // ── Categorías con productos publicados ──────────────────────
  // Se cuenta cuántos productos ACTIVOS tiene cada categoría. Las que
  // no tienen ninguno no se muestran como bloque comprable: mandar a
  // alguien a un catálogo vacío es peor que no ofrecer la categoría.
  //
  // Ojo: siguen apareciendo en el header y en los filtros. Ese es el
  // comportamiento pedido — el bloque visual de la home es el único
  // lugar que exige tener stock cargado.
  //
  // `products.categoryId` es TEXT (ver services/products.ts), así que
  // el conteo se hace contra el id de categoría como string.
  const productsByCategory = new Map<string, typeof products>();
  for (const product of products) {
    const list = productsByCategory.get(product.categoryId) ?? [];
    list.push(product);
    productsByCategory.set(product.categoryId, list);
  }

  const categoryTiles: CategoryTile[] = categories
    .map((category) => {
      const categoryProducts = productsByCategory.get(category.id) ?? [];
      // Imagen: la propia de la categoría si el admin la cargó y, si no,
      // la portada de un producto real suyo. Nunca una foto genérica.
      const fallback = categoryProducts.find((p) => p.images.length > 0)?.images[0]?.url;
      return {
        category,
        image: category.image ?? fallback ?? null,
        productCount: categoryProducts.length,
      };
    })
    .filter((tile) => tile.productCount > 0)
    .slice(0, MAX_CATEGORY_TILES);

  // Bloque editorial: la portada del producto más nuevo con foto. Si no
  // hay productos, cae al banner de la tienda.
  const collectionImage =
    products.find((p) => p.images.length > 0)?.images[0]?.url ?? storeSettings.bannerUrl ?? null;

  // Tira inferior: fotos reales del catálogo, sin repetir la editorial.
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
