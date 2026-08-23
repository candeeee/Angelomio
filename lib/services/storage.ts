import "server-only";

import { randomUUID } from "crypto";

import {
  type AllowedImageMimeType,
  isAllowedImageMimeType,
  validateImageFile,
} from "@/lib/image-upload";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCurrentTenantId,
  isTenantProductImagePath,
  productImagePath,
} from "@/lib/tenant";

// ─────────────────────────────────────────────────────────────
// Servicio de Supabase Storage — SOLO servidor (`server-only`).
//
// Mismo contrato que el resto de `lib/services/*`: nunca se importa
// desde un `"use client"`. La UI llama a una Server Action
// (app/admin/productos/actions.ts) y esa acción llama acá.
//
// Este archivo NO sabe nada de productos: sube bytes, borra bytes y
// traduce entre "path dentro del bucket" y "URL pública". La relación
// imagen ↔ producto vive en `product_images` (lib/services/products.ts).
// Esa separación es la que permite reusarlo tal cual en Bloom Shop Pro
// para logos, banners o imágenes de categoría sin duplicar lógica.
//
// AUTORIZACIÓN: el cliente se crea con las cookies de la request, así
// que las policies de Storage se evalúan con el usuario real. No hay
// service_role key en el proyecto y no hace falta: quien puede escribir
// en el bucket lo define `public.is_admin()` en la policy (ver
// supabase/migrations/006_product_images_storage.sql). El middleware
// protege la NAVEGACIÓN a /admin, pero una Server Action se puede
// invocar sin pasar por el middleware — la garantía real es RLS.
// ─────────────────────────────────────────────────────────────

/**
 * Bucket único y compartido por todas las tiendas.
 *
 * Un bucket por tienda parece más prolijo pero no escala: cada alta de
 * cliente en Bloom Shop Pro pasaría a ser una operación de
 * infraestructura (crear bucket + duplicar sus policies), y las
 * policies dejan de ser auditables en un solo lugar. Con un bucket
 * compartido, el aislamiento lo da el prefijo de path (`{tenantId}/`)
 * y una sola policy escrita una vez.
 *
 * El bucket es PÚBLICO porque su contenido es catálogo: se muestra a
 * cualquier visitante, se sirve por CDN y se cachea. Los archivos que
 * en el futuro NO sean públicos (comprobantes, exportaciones,
 * facturas) van en un bucket privado aparte con URLs firmadas — el eje
 * de separación es la visibilidad, no el tipo de archivo.
 */
export const STORE_ASSETS_BUCKET = "store-assets";

/**
 * Extensión que le corresponde a cada MIME admitido. La lista de MIMEs
 * y el límite de tamaño viven en `lib/image-upload.ts` porque el
 * componente de admin también los necesita (y este archivo es
 * `server-only`).
 */
const EXTENSION_BY_MIME: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** Cache de un año: los nombres de archivo son únicos e inmutables. */
const CACHE_CONTROL_SECONDS = "31536000";

export interface UploadedAsset {
  /** URL pública definitiva — es lo único que se guarda en la base. */
  url: string;
  /** Path dentro del bucket (`angelo-mio/products/uuid.webp`). */
  path: string;
}

export interface UploadAssetResult {
  asset: UploadedAsset | null;
  error: string | null;
}

/**
 * Prefijo público del bucket, tal como lo devuelve `getPublicUrl()`:
 * `https://<proyecto>.supabase.co/storage/v1/object/public/store-assets/`
 */
function publicUrlPrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${STORE_ASSETS_BUCKET}/`;
}

/**
 * ¿Esta URL apunta a un archivo que subió la aplicación a NUESTRO
 * bucket? Es la pregunta que separa "archivo propio" (se puede borrar)
 * de "URL externa pegada a mano" (nunca se toca) — requisito de
 * compatibilidad hacia atrás con los productos viejos.
 */
export function isManagedAssetUrl(url: string): boolean {
  return url.startsWith(publicUrlPrefix());
}

/**
 * Traduce una URL pública propia a su path dentro del bucket.
 * Devuelve null si la URL es externa (Unsplash, otro storage, etc.).
 */
export function storagePathFromPublicUrl(url: string): string | null {
  if (!isManagedAssetUrl(url)) return null;

  const rawPath = url.slice(publicUrlPrefix().length).split("?")[0];
  if (!rawPath) return null;

  try {
    // `getPublicUrl()` percent-encodea el path; el SDK de Storage
    // espera el path sin encodear al borrar.
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

/**
 * Sube UNA imagen de producto al bucket del tenant actual y devuelve
 * su URL pública.
 *
 * Un archivo por llamada (no un batch) a propósito: cada subida viaja
 * en su propia request, así una imagen pesada no arrastra a las otras
 * al límite de body de las Server Actions, y la UI puede mostrar el
 * estado/el error de cada archivo por separado (requisito 11: una
 * subida que falla no rompe el formulario).
 *
 * El nombre final es un UUID, no el nombre original del archivo:
 * evita colisiones ("IMG_0001.jpg" repetido), evita filtrar nombres
 * internos del cliente y evita tener que sanitizar acentos/espacios/
 * caracteres raros en el path. El nombre original se conserva igual,
 * pero como `alt` de la imagen (lo arma la capa de arriba).
 */
export async function uploadProductImage(file: File): Promise<UploadAssetResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    return { asset: null, error: validationError };
  }

  // `validateImageFile()` ya rechazó los MIME no admitidos; este guard
  // es lo que se lo demuestra a TypeScript (estrecha `string` a
  // `AllowedImageMimeType`) sin recurrir a un cast.
  const mimeType: string = file.type;
  if (!isAllowedImageMimeType(mimeType)) {
    return { asset: null, error: "Formato no admitido. Usá JPG, PNG, WEBP, AVIF o GIF." };
  }

  const supabase = createServerSupabaseClient();
  const path = productImagePath(`${randomUUID()}.${EXTENSION_BY_MIME[mimeType]}`);

  const { error } = await supabase.storage.from(STORE_ASSETS_BUCKET).upload(path, file, {
    contentType: mimeType,
    cacheControl: CACHE_CONTROL_SECONDS,
    upsert: false,
  });

  if (error) {
    console.error("[services/storage] Error subiendo imagen:", error.message);
    return { asset: null, error: error.message };
  }

  const { data } = supabase.storage.from(STORE_ASSETS_BUCKET).getPublicUrl(path);

  return { asset: { url: data.publicUrl, path }, error: null };
}

/**
 * Borra archivos del bucket por path. Ignora silenciosamente los paths
 * que no pertenezcan a la carpeta de imágenes del tenant actual
 * (defensa en profundidad: aunque la policy ya exige admin, una acción
 * de borrado no debería poder apuntar a cualquier objeto del bucket).
 */
export async function removeAssetsByPath(paths: string[]): Promise<{ error: string | null }> {
  const tenantId = getCurrentTenantId();
  const safePaths = Array.from(new Set(paths)).filter((path) =>
    isTenantProductImagePath(path, tenantId)
  );

  if (safePaths.length === 0) return { error: null };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.storage.from(STORE_ASSETS_BUCKET).remove(safePaths);

  if (error) {
    console.error("[services/storage] Error borrando archivos:", error.message);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Borra los archivos propios correspondientes a una lista de URLs.
 * Las URLs externas se descartan sin tocarlas (requisito 10).
 */
export async function removeManagedAssetsByUrl(urls: string[]): Promise<{ error: string | null }> {
  const paths = urls
    .map((url) => storagePathFromPublicUrl(url))
    .filter((path): path is string => path !== null);

  return removeAssetsByPath(paths);
}
