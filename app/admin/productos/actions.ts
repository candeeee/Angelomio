"use server";

import { revalidatePath } from "next/cache";
import * as productsService from "@/lib/services/products";
import * as storageService from "@/lib/services/storage";
import { Product } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Server Actions de productos.
//
// Este es el ÚNICO punto por el que un Client Component puede disparar
// una mutación sobre productos. El flujo queda:
//
//   AdminProductsClient ("use client")
//         │  llama a estas funciones como si fueran async normales
//         ▼
//   actions.ts ("use server")
//         │  corre siempre en el servidor, con las cookies de la
//         │  request → puede importar services/products.ts sin problema
//         ▼
//   services/products.ts → Supabase
//
// Cada acción revalida las rutas afectadas para que tanto el panel
// admin como la tienda pública reflejen el cambio sin recargar a mano.
// ─────────────────────────────────────────────────────────────

export interface ProductFormInput {
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

function revalidateProductPaths(slug?: string) {
  // ¿Por qué `revalidatePath("/", "layout")` y no `revalidatePath("/")`?
  //
  // Con un solo argumento, Next invalida ÚNICAMENTE la página `/`. Pero
  // el layout raíz (app/layout.tsx) también consulta Supabase: de ahí
  // salen las categorías del header y del menú mobile. Ese layout lo
  // comparten TODAS las rutas, así que invalidando sólo `/` el header
  // de /productos, /contacto, /favoritos, etc. seguía cacheado con las
  // categorías viejas hasta que venciera el `revalidate` de 60s.
  //
  // Con el segundo argumento "layout", la invalidación baja en cascada
  // por todo el árbol desde la raíz: se rehacen el layout y todas las
  // páginas. Es lo que hace que una categoría o un producto nuevo se
  // vean al instante en todo el sitio.
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/productos/${slug}`);
}

export async function createProductAction(input: ProductFormInput) {
  const { error } = await productsService.createProduct(input);

  if (error) {
    return { error: error.message };
  }

  revalidateProductPaths(input.slug);
  return { error: null };
}

export async function updateProductAction(id: string, input: ProductFormInput) {
  const { error } = await productsService.updateProduct(id, input);

  if (error) {
    return { error: error.message };
  }

  revalidateProductPaths(input.slug);
  return { error: null };
}

/**
 * Elimina o archiva un producto, según tenga ventas o no (la decisión
 * la toma el service, ver `deleteProduct`).
 *
 * `archived: true` significa "tenía ventas, se archivó en vez de
 * borrarse". La UI usa ese dato para avisar qué pasó realmente.
 */
export async function deleteProductAction(id: string) {
  const { error, archived } = await productsService.deleteProduct(id);

  if (error) {
    return { error: error.message, archived: false };
  }

  revalidateProductPaths();
  return { error: null, archived };
}

/** Saca un producto del archivo. Queda oculto hasta que se lo active. */
export async function restoreProductAction(id: string) {
  const { error } = await productsService.restoreProduct(id);

  if (error) {
    return { error: error.message };
  }

  revalidateProductPaths();
  return { error: null };
}

// ─────────────────────────────────────────────────────────────
// A partir de acá: Server Actions NUEVAS para la mejora de UX del
// panel de productos (slug editable + validación, imágenes drag&drop,
// duplicar producto, confirmación de borrado). Ninguna de las
// funciones de arriba fue modificada.
// ─────────────────────────────────────────────────────────────

/**
 * ¿Está disponible este slug? (para el chequeo en vivo del campo Slug
 * del formulario). `excludeId` se manda al editar un producto
 * existente, para no comparar contra sí mismo.
 */
export async function checkSlugAction(slug: string, excludeId?: string) {
  const taken = await productsService.isSlugTaken(slug, excludeId);
  return { available: !taken };
}

/**
 * Trae un producto completo por slug — se usa después de crear un
 * producto nuevo (createProductAction, sin tocar) para recién ahí
 * poder guardarle las imágenes, que necesitan el id real generado por
 * Supabase al insertar.
 */
export async function getProductBySlugAction(slug: string) {
  const product = await productsService.getProductBySlug(slug);
  return { product };
}

/**
 * Guarda la lista final de imágenes de un producto.
 *
 * MISMA FIRMA Y MISMO RETORNO que antes (el componente de admin no
 * cambió su forma de llamarla). Lo único que cambió es a qué service
 * delega: pasó de `replaceProductImages()` a `syncProductImages()`,
 * que hace exactamente lo mismo con la base y además borra del bucket
 * los archivos propios que quedaron sin referencia (requisito 10).
 * `replaceProductImages()` sigue existiendo intacta y la sigue usando
 * `duplicateProduct()`, que no debe borrar nada.
 */
export async function saveProductImagesAction(
  productId: string,
  images: productsService.ProductImageInput[]
) {
  const { error } = await productsService.syncProductImages(productId, images);

  if (error) {
    return { error };
  }

  revalidateProductPaths();
  return { error: null };
}

// ─────────────────────────────────────────────────────────────
// A partir de acá: Server Actions NUEVAS para la migración de
// imágenes a Supabase Storage (subir archivos en vez de pegar URLs).
// Nada de lo de arriba cambió de firma.
// ─────────────────────────────────────────────────────────────

/**
 * Sube UNA imagen al bucket y devuelve su URL pública + su path.
 *
 * Recibe `FormData` porque es la única forma de mandarle un `File` a
 * una Server Action sin serializarlo a base64 a mano (que infla el
 * payload ~33% y obliga a rearmar el binario del otro lado).
 *
 * No revalida rutas: todavía no cambió nada en la base. La imagen
 * recién queda asociada al producto cuando el admin guarda el
 * formulario (`saveProductImagesAction`).
 */
export async function uploadProductImageAction(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { asset: null, error: "No se recibió ningún archivo." };
  }

  return storageService.uploadProductImage(file);
}

/**
 * Borra del bucket archivos que se subieron durante la edición pero
 * que nunca llegaron a guardarse (el admin sacó la imagen del listado,
 * cerró el modal o canceló). Sin esto, cada formulario abandonado
 * dejaría basura en Storage para siempre.
 *
 * Es best-effort: si falla, no hay nada que informarle al admin — no
 * perdió ningún dato, solo quedó un archivo huérfano.
 */
export async function discardUploadedImagesAction(paths: string[]) {
  const { error } = await storageService.removeAssetsByPath(paths);
  return { error };
}

export async function duplicateProductAction(id: string) {
  const { product, error } = await productsService.duplicateProduct(id);

  if (error || !product) {
    return { product: null, error: error ?? "No se pudo duplicar el producto" };
  }

  revalidateProductPaths();
  return { product, error: null };
}