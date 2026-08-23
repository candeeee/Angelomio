import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { isManagedAssetUrl, removeManagedAssetsByUrl } from "@/lib/services/storage";
import { Product, ProductImage, ProductVariant } from "@/lib/types";
import { slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Servicio de productos — SOLO se ejecuta en el servidor.
//
// El paquete `server-only` hace que Next.js falle el build (con un
// mensaje claro) si algún día un componente cliente vuelve a importar
// este archivo por error.
//
// Regla: este archivo nunca se importa desde un "use client".
//  - Server Components (páginas de solo lectura) → llaman estas
//    funciones directamente.
//  - Client Components que necesitan mutar datos → llaman a un
//    Server Action (app/admin/productos/actions.ts), que es quien
//    importa este servicio.
//
// DOS FAMILIAS DE LECTURA, a propósito:
//  - `getProducts()` / `getProductBySlug()` → cliente con cookies, sin
//    filtrar por status. Las usa `/admin/productos` porque necesita ver
//    también los productos ocultos para poder gestionarlos.
//  - `getPublicProducts()` / `getPublicProductBySlug()` → cliente
//    público (sin cookies) + `status = 'active'` filtrado en la query.
//    Las usa la tienda pública (Home, `/productos`, `/productos/[slug]`):
//    no dependen de sesión (permiten pre-renderizado estático) y nunca
//    devuelven un producto oculto, ni siquiera pidiendo su slug a mano.
// No se duplica lógica de mapeo/joins: ambas familias reusan las mismas
// funciones internas (`mapRowToProduct`, `fetchImagesAndVariantsFor`).
//
// El cliente de Supabase se crea DENTRO de cada función, nunca a nivel
// de módulo (createServerSupabaseClient() lee cookies de la request
// actual vía next/headers).
//
// LIMITACIÓN DE ESQUEMA DOCUMENTADA (no se modifica, por regla del
// proyecto): `products.category_id` es TEXT, no una FK real a
// `categories.id` (uuid). Por eso NO se usa el shorthand de PostgREST
// para relaciones (`select("*, categories(*)")`) — no hay una FK que
// Postgres/PostgREST pueda detectar automáticamente. La resolución de
// categoría se sigue haciendo en la capa de componentes, cruzando
// `product.categoryId` contra la lista de `getCategories()` en memoria.
// `product_images` y `product_variants` sí tienen `product_id` (uuid)
// apuntando al `id` (uuid) de `products`, así que para esas dos se
// resuelve con una segunda consulta por lote (`in("product_id", ids)`),
// sin asumir que exista una FK declarada — funciona la exista o no.
// ─────────────────────────────────────────────────────────────

type SupabaseQueryClient =
  | ReturnType<typeof createServerSupabaseClient>
  | ReturnType<typeof createPublicSupabaseClient>;

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  category_id: string;
  stock: number;
  featured: boolean;
  status: Product["status"];
  created_at: string;
  // Opcional en el tipo a propósito: la columna se agrega en la
  // migración 007 y, hasta que se corra, Supabase simplemente no la
  // devuelve. Así el catálogo sigue funcionando igual antes y después.
  archived_at?: string | null;
}

interface ProductImageRow {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  order: number | null;
}

interface ProductVariantRow {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  sku_suffix: string | null;
}

function mapImageRow(row: ProductImageRow): ProductImage {
  return { id: row.id, url: row.url, alt: row.alt ?? "", order: row.order ?? 0 };
}

function mapVariantRow(row: ProductVariantRow): ProductVariant {
  return {
    id: row.id,
    size: row.size ?? undefined,
    color: row.color ?? undefined,
    stock: row.stock,
    sku_suffix: row.sku_suffix ?? undefined,
  };
}

function mapRowToProduct(
  row: ProductRow,
  images: ProductImage[] = [],
  variants: ProductVariant[] = []
): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    sku: row.sku,
    categoryId: row.category_id,
    stock: row.stock,
    featured: row.featured,
    status: row.status,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    images: images.sort((a, b) => a.order - b.order),
    variants,
  };
}

/**
 * Trae imágenes y variantes de un lote de productos en 2 queries
 * (no N+1) y las agrupa por product_id.
 */
async function fetchImagesAndVariantsFor(supabase: SupabaseQueryClient, productIds: string[]) {
  if (productIds.length === 0) {
    return { imagesByProduct: new Map<string, ProductImage[]>(), variantsByProduct: new Map<string, ProductVariant[]>() };
  }

  const [imagesResult, variantsResult] = await Promise.all([
    supabase.from("product_images").select("*").in("product_id", productIds),
    supabase.from("product_variants").select("*").in("product_id", productIds),
  ]);

  if (imagesResult.error) {
    console.error("[services/products] Error cargando imágenes:", imagesResult.error.message);
  }
  if (variantsResult.error) {
    console.error("[services/products] Error cargando variantes:", variantsResult.error.message);
  }

  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const row of (imagesResult.data as ProductImageRow[] | null) ?? []) {
    const list = imagesByProduct.get(row.product_id) ?? [];
    list.push(mapImageRow(row));
    imagesByProduct.set(row.product_id, list);
  }

  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const row of (variantsResult.data as ProductVariantRow[] | null) ?? []) {
    const list = variantsByProduct.get(row.product_id) ?? [];
    list.push(mapVariantRow(row));
    variantsByProduct.set(row.product_id, list);
  }

  return { imagesByProduct, variantsByProduct };
}

/**
 * Obtiene TODOS los productos (cualquier status), más recientes
 * primero, con sus imágenes y variantes reales. Para uso interno/admin
 * (`/admin/productos`) — para la tienda pública usar `getPublicProducts()`.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/products] Error cargando productos:", error.message);
    return [];
  }

  const rows = data as ProductRow[];
  const { imagesByProduct, variantsByProduct } = await fetchImagesAndVariantsFor(
    supabase,
    rows.map((r) => r.id)
  );

  return rows.map((row) =>
    mapRowToProduct(row, imagesByProduct.get(row.id), variantsByProduct.get(row.id))
  );
}

/**
 * Obtiene un producto por su slug, con imágenes y variantes reales.
 * Devuelve null si no existe.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug.trim())
    .maybeSingle();

  if (error) {
    console.error("[services/products] Error cargando producto:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as ProductRow;
  const { imagesByProduct, variantsByProduct } = await fetchImagesAndVariantsFor(supabase, [row.id]);

  return mapRowToProduct(row, imagesByProduct.get(row.id), variantsByProduct.get(row.id));
}

/**
 * Obtiene los productos activos para la tienda pública (Home,
 * `/productos`), con cliente público (sin cookies → habilita
 * pre-renderizado estático) y con `status = 'active'` filtrado en la
 * propia query, no solo en el componente.
 */
export async function getPublicProducts(): Promise<Product[]> {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/products] Error cargando productos públicos:", error.message);
    return [];
  }

  const rows = data as ProductRow[];
  const { imagesByProduct, variantsByProduct } = await fetchImagesAndVariantsFor(
    supabase,
    rows.map((r) => r.id)
  );

  return rows.map((row) =>
    mapRowToProduct(row, imagesByProduct.get(row.id), variantsByProduct.get(row.id))
  );
}

/**
 * Obtiene un producto activo por slug para la tienda pública. Un
 * producto oculto (`status = 'hidden'`) devuelve null acá aunque se
 * conozca su slug exacto — no debe quedar accesible por URL directa.
 */
export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug.trim())
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[services/products] Error cargando producto público:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as ProductRow;
  const { imagesByProduct, variantsByProduct } = await fetchImagesAndVariantsFor(supabase, [row.id]);

  return mapRowToProduct(row, imagesByProduct.get(row.id), variantsByProduct.get(row.id));
}

interface ProductInput {
  id?: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  categoryId: string;
  stock: number;
  featured: boolean;
  status: Product["status"];
}

/**
 * Crea un producto nuevo.
 */
export async function createProduct(input: ProductInput) {
  const supabase = createServerSupabaseClient();

  return supabase.from("products").insert({
    slug: input.slug,
    name: input.name,
    description: input.description,
    price: input.price,
    compare_at_price: input.compareAtPrice ?? null,
    sku: input.sku,
    category_id: input.categoryId,
    stock: input.stock,
    featured: input.featured,
    status: input.status,
  });
}

/**
 * Actualiza un producto existente.
 */
export async function updateProduct(id: string, input: ProductInput) {
  const supabase = createServerSupabaseClient();

  return supabase
    .from("products")
    .update({
      slug: input.slug,
      name: input.name,
      description: input.description,
      price: input.price,
      compare_at_price: input.compareAtPrice ?? null,
      sku: input.sku,
      category_id: input.categoryId,
      stock: input.stock,
      featured: input.featured,
      status: input.status,
    })
    .eq("id", id);
}

/**
 * Elimina un producto — con soft delete automático si tiene ventas.
 *
 * POR QUÉ: `order_items.product_id` es una FK a `products.id`. Si el
 * producto ya fue vendido, un DELETE físico lo rechaza Postgres con
 * `order_items_product_id_fkey`, y está bien que lo rechace: borrarlo
 * dejaría pedidos históricos apuntando a la nada.
 *
 * Entonces se decide según el dato, no según lo que apriete el admin:
 *  - Producto SIN ventas → se borra de verdad. Libera el slug y el SKU
 *    para volver a usarlos, que es lo que uno espera al eliminar algo
 *    cargado por error.
 *  - Producto CON ventas → se archiva: `status = 'hidden'` +
 *    `archived_at = now()`. Desaparece de la tienda pública (que ya
 *    filtraba por `status = 'active'` desde siempre), el historial de
 *    ventas queda intacto y el admin lo sigue viendo y gestionando.
 *
 * Devuelve `archived` para que la UI pueda decir cuál de las dos cosas
 * pasó en vez de mentir con "eliminado".
 */
export async function deleteProduct(
  id: string
): Promise<{ error: { message: string } | null; archived: boolean }> {
  const supabase = createServerSupabaseClient();

  // ¿Tiene ventas? `head: true` no trae filas, solo el conteo.
  const { count, error: countError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (countError) {
    console.error("[services/products] Error contando ventas:", countError.message);
    return { error: countError, archived: false };
  }

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("products")
      .update({ status: "hidden", archived_at: new Date().toISOString() })
      .eq("id", id);

    return { error, archived: true };
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  return { error, archived: false };
}

/**
 * Desarchiva un producto: le saca la marca de archivado y lo deja
 * oculto (`status = 'hidden'`), que es donde estaba antes de archivarse.
 *
 * NO lo publica solo: para que vuelva a la tienda, el admin tiene que
 * activarlo desde el formulario. Restaurar y publicar son dos
 * decisiones distintas y conviene que sigan siéndolo.
 */
export async function restoreProduct(id: string) {
  const supabase = createServerSupabaseClient();
  return supabase.from("products").update({ archived_at: null }).eq("id", id);
}

// ─────────────────────────────────────────────────────────────
// A partir de acá: funciones NUEVAS para la mejora de UX del panel de
// productos (slug editable + validación, imágenes drag&drop,
// duplicar producto). No se modificó ninguna función de arriba.
// ─────────────────────────────────────────────────────────────

/**
 * ¿Ya existe otro producto con este slug? `excludeId` se usa al editar,
 * para no comparar el producto contra sí mismo.
 */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("products").select("id").eq("slug", slug.trim());
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[services/products] Error validando slug:", error.message);
    // Ante un error de red/consulta, no bloqueamos el guardado por una
    // validación que no se pudo completar — el insert/update real
    // igual fallaría si el slug tiene un constraint único en la base.
    return false;
  }

  return !!data;
}

export interface ProductImageInput {
  url: string;
  alt?: string;
}

/**
 * Reemplaza TODAS las imágenes de un producto por la lista dada (en
 * ese orden — el índice 0 es la portada). Estrategia simple de
 * "borrar todo e insertar de nuevo" en vez de diffear altas/bajas/
 * reordenamientos uno por uno: el formulario de admin ya arma la lista
 * final completa (agregar/quitar/reordenar pasa en el modal, antes de
 * guardar), así que no hace falta un diff más fino.
 *
 * SUPUESTO DE RLS A VERIFICAR: igual que con orders/store_settings, si
 * `product_images` tiene RLS habilitado sin policies de insert/delete
 * para admin, esto va a fallar con el mismo error de siempre — ver
 * supabase/migrations/005_product_images_rls.sql.
 */
export async function replaceProductImages(
  productId: string,
  images: ProductImageInput[]
): Promise<{ error: string | null }> {
  const supabase = createServerSupabaseClient();

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    console.error("[services/products] Error limpiando imágenes:", deleteError.message);
    return { error: deleteError.message };
  }

  if (images.length === 0) return { error: null };

  const { error: insertError } = await supabase.from("product_images").insert(
    images.map((img, i) => ({
      product_id: productId,
      url: img.url,
      alt: img.alt ?? "",
      order: i,
    }))
  );

  if (insertError) {
    console.error("[services/products] Error guardando imágenes:", insertError.message);
    return { error: insertError.message };
  }

  return { error: null };
}

/**
 * Igual que `replaceProductImages()`, pero además LIMPIA del bucket los
 * archivos que dejaron de estar referenciados.
 *
 * Por qué existe además de `replaceProductImages()`: esa función sigue
 * siendo la primitiva "dejá estas filas y ninguna otra" y la usa
 * `duplicateProduct()`, que NO debe borrar nada de Storage. El
 * guardado del formulario, en cambio, sí tiene que barrer los
 * archivos huérfanos, si no el bucket crece para siempre con imágenes
 * que ya nadie muestra.
 *
 * Tres garantías, en orden:
 *  1. Solo se borran archivos PROPIOS (los que subió la app a nuestro
 *     bucket). Una URL externa pegada a mano en un producto viejo se
 *     desreferencia y nada más — no es nuestra, no se toca.
 *  2. Solo se borran archivos que ya no referencia NINGÚN producto.
 *     `duplicateProduct()` copia las URLs tal cual, así que original y
 *     copia comparten el mismo archivo físico: borrar la imagen de la
 *     copia no puede romper la del original.
 *  3. Un fallo limpiando NO invalida el guardado. Las filas ya se
 *     escribieron bien; un archivo huérfano es un costo de storage,
 *     no un dato corrupto. Se loguea y se devuelve `error: null`.
 */
export async function syncProductImages(
  productId: string,
  images: ProductImageInput[]
): Promise<{ error: string | null }> {
  const supabase = createServerSupabaseClient();

  const { data: previousRows, error: previousError } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", productId);

  if (previousError) {
    // No frenamos el guardado por no haber podido leer el estado
    // anterior: en el peor caso quedan archivos huérfanos.
    console.error(
      "[services/products] Error leyendo imágenes previas:",
      previousError.message
    );
  }

  const { error: replaceError } = await replaceProductImages(productId, images);
  if (replaceError) return { error: replaceError };

  const previousUrls = ((previousRows as { url: string }[] | null) ?? []).map((row) => row.url);
  const keptUrls = new Set(images.map((img) => img.url));
  const candidateUrls = previousUrls.filter(
    (url) => !keptUrls.has(url) && isManagedAssetUrl(url)
  );

  if (candidateUrls.length === 0) return { error: null };

  // Garantía 2: ¿alguna otra fila (de este u otro producto) sigue
  // usando estos archivos?
  const { data: stillUsedRows, error: stillUsedError } = await supabase
    .from("product_images")
    .select("url")
    .in("url", candidateUrls);

  if (stillUsedError) {
    console.error(
      "[services/products] Error verificando imágenes compartidas:",
      stillUsedError.message
    );
    return { error: null };
  }

  const stillUsed = new Set(
    ((stillUsedRows as { url: string }[] | null) ?? []).map((row) => row.url)
  );
  const orphanUrls = candidateUrls.filter((url) => !stillUsed.has(url));

  if (orphanUrls.length > 0) {
    await removeManagedAssetsByUrl(orphanUrls);
  }

  return { error: null };
}

/**
 * Duplica un producto completo: datos base + imágenes + variantes.
 * El nuevo producto queda con `(Copia)` en el nombre, un slug nuevo
 * (único, generado a partir de ese nombre) y `status: "hidden"` — se
 * crea oculto a propósito, para que el admin lo revise/complete antes
 * de publicarlo, en vez de aparecer activo en la tienda de inmediato
 * con el mismo precio/stock que el original.
 */
export async function duplicateProduct(
  id: string
): Promise<{ product: Product | null; error: string | null }> {
  const supabase = createServerSupabaseClient();

  const { data: sourceRow, error: sourceError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (sourceError || !sourceRow) {
    return { product: null, error: sourceError?.message ?? "Producto no encontrado" };
  }

  const source = sourceRow as ProductRow;
  const { imagesByProduct, variantsByProduct } = await fetchImagesAndVariantsFor(supabase, [
    source.id,
  ]);
  const sourceImages = imagesByProduct.get(source.id) ?? [];
  const sourceVariants = variantsByProduct.get(source.id) ?? [];

  const newName = `${source.name} (Copia)`;
  let newSlug = slugify(newName);
  // Garantiza unicidad sin depender de que el usuario la valide a mano
  // (esto lo dispara un click de botón, no un formulario).
  let attempt = 0;
  while (await isSlugTaken(newSlug)) {
    attempt += 1;
    newSlug = `${slugify(newName)}-${attempt + 1}`;
  }

  const { data: newRow, error: insertError } = await supabase
    .from("products")
    .insert({
      slug: newSlug,
      name: newName,
      description: source.description,
      price: source.price,
      compare_at_price: source.compare_at_price,
      sku: `${source.sku}-COPY`,
      category_id: source.category_id,
      stock: source.stock,
      featured: false,
      status: "hidden",
    })
    .select("*")
    .single();

  if (insertError || !newRow) {
    return { product: null, error: insertError?.message ?? "No se pudo duplicar el producto" };
  }

  const newProductId = (newRow as ProductRow).id;

  if (sourceImages.length > 0) {
    await replaceProductImages(
      newProductId,
      sourceImages.map((img) => ({ url: img.url, alt: img.alt }))
    );
  }

  if (sourceVariants.length > 0) {
    const { error: variantsError } = await supabase.from("product_variants").insert(
      sourceVariants.map((v) => ({
        product_id: newProductId,
        size: v.size ?? null,
        color: v.color ?? null,
        stock: v.stock,
        sku_suffix: v.sku_suffix ?? null,
      }))
    );
    if (variantsError) {
      console.error("[services/products] Error copiando variantes:", variantsError.message);
    }
  }

  const { imagesByProduct: newImages, variantsByProduct: newVariants } =
    await fetchImagesAndVariantsFor(supabase, [newProductId]);

  return {
    product: mapRowToProduct(
      newRow as ProductRow,
      newImages.get(newProductId),
      newVariants.get(newProductId)
    ),
    error: null,
  };
}