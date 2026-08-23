import { slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Tenant actual + convención de rutas dentro de Supabase Storage.
//
// POR QUÉ ESTE ARCHIVO EXISTE
// Hoy el proyecto es una sola tienda (Angelo Mio), así que
// "el tenant" es una constante. Pero todo lo que se guarde en Storage
// a partir de ahora queda escrito con un prefijo de tenant real, no
// con archivos sueltos en la raíz del bucket. Migrar archivos después
// (mover miles de objetos y reescribir las URLs ya guardadas en
// `product_images`) sería caro y riesgoso; agregar el prefijo ahora,
// cuando el bucket está vacío, no cuesta nada.
//
// Cuando Bloom Shop Pro tenga tenants de verdad, lo ÚNICO que cambia
// es `getCurrentTenantId()`: pasa de leer una constante/env a leer el
// tenant de la sesión (subdominio, tabla `tenants`, claim del JWT, lo
// que se defina). Ni los services ni los componentes se enteran.
//
// El id se normaliza con `slugify()` a propósito: el tenant termina
// siendo un segmento de path dentro del bucket, y no queremos que un
// valor mal cargado en la env (con espacios, "/", "..", tildes) pueda
// escribir fuera de su carpeta.
// ─────────────────────────────────────────────────────────────

// MIGRACIÓN GNGV → ANGELO MIO:
// El tenant pasó de "gngv" a "angelo-mio", así que los archivos NUEVOS
// se suben a `angelo-mio/products/...`.
//
// Esto NO rompe ni borra nada de lo que ya estuviera subido: las
// imágenes viejas siguen viviendo en `gngv/products/...` y sus URLs
// públicas (que son lo que guarda `product_images`) se siguen sirviendo
// igual. El único efecto es que la limpieza automática de huérfanos ya
// no las alcanza — `isTenantProductImagePath()` las descarta — o sea,
// en el peor caso quedan archivos sin usar, nunca datos perdidos.
//
// Si vas a REUTILIZAR el proyecto de Supabase de Good Night Good Vibes
// y querés que la limpieza siga funcionando sobre los archivos viejos,
// poné `STORE_TENANT_ID=gngv` en tu `.env.local` y todo sigue como antes.
export const DEFAULT_TENANT_ID = "angelo-mio";

/**
 * Id del tenant activo. Configurable por env (`STORE_TENANT_ID`) para
 * poder levantar una segunda tienda con el mismo código sin tocar
 * nada, y con fallback a la tienda actual.
 */
export function getCurrentTenantId(): string {
  const raw = process.env.STORE_TENANT_ID?.trim();
  const normalized = raw ? slugify(raw) : "";
  return normalized || DEFAULT_TENANT_ID;
}

/**
 * Carpeta raíz del tenant dentro del bucket compartido.
 * Ej: `angelo-mio/`
 *
 * El tenant va PRIMERO en el path (`{tenantId}/products/...`) porque
 * las policies de Storage se escriben sobre `storage.objects.name` y
 * `(storage.foldername(name))[1]` es la forma canónica de aislar un
 * tenant en Supabase. Con el tenant en el primer segmento, la policy
 * multi-tenant futura es un solo `where` — con el tenant en el medio
 * habría que parsear el path a mano.
 */
export function tenantRoot(tenantId: string = getCurrentTenantId()): string {
  return `${tenantId}/`;
}

/**
 * Path final de una imagen de producto dentro del bucket.
 * Ej: `angelo-mio/products/9f1c0f6e-....webp`
 *
 * NO incluye el `productId` a propósito — ver la justificación
 * completa en el README (changelog de Storage). Resumen: al subir una
 * imagen desde el formulario de "Crear producto" el producto todavía
 * no existe (no hay id que poner en el path), y el índice real de qué
 * archivo pertenece a qué producto es la tabla `product_images`, no la
 * estructura de carpetas.
 */
export function productImagePath(fileName: string, tenantId: string = getCurrentTenantId()): string {
  return `${tenantRoot(tenantId)}products/${fileName}`;
}

/**
 * ¿Este path pertenece a la carpeta de imágenes de producto del tenant
 * actual? Se usa como validación de defensa en profundidad antes de
 * borrar archivos por path (además de las policies de Storage).
 */
export function isTenantProductImagePath(
  path: string,
  tenantId: string = getCurrentTenantId()
): boolean {
  if (path.includes("..")) return false;
  return path.startsWith(`${tenantRoot(tenantId)}products/`);
}
