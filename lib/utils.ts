import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Prefijo del número de pedido. Los pedidos YA EMITIDOS conservan su
 * número original guardado en la base (`orders.number`): esto solo
 * afecta a los nuevos.
 */
export const ORDER_NUMBER_PREFIX = "AM";

export function generateOrderNumber(existingCount: number) {
  const next = existingCount + 1;
  return `${ORDER_NUMBER_PREFIX}-${String(next).padStart(4, "0")}`;
}

/**
 * Genera un slug URL-safe a partir de un texto libre.
 *
 * Causa raíz del bug de 404 en productos: el generador de slugs
 * anterior (`name.toLowerCase().replace(/\s+/g, "-")`) solo reemplazaba
 * espacios — dejaba tildes (á, é, í, ó, ú, ñ) y cualquier carácter
 * especial (paréntesis, comillas, "/", "&", etc.) tal cual dentro del
 * slug. Un "/" literal en el slug, por ejemplo, rompe el ruteo:
 * `/productos/funda-1/2-plaza` deja de matchear la ruta dinámica
 * `/productos/[slug]` porque Next.js lo interpreta como un segmento de
 * ruta extra, no como parte del slug — eso produce el 404.
 *
 * Esta versión normaliza a ASCII (NFD + elimina diacríticos) y
 * reemplaza cualquier carácter que no sea `a-z0-9` por un guion,
 * colapsando guiones repetidos y recortando los de los extremos.
 * Se usa tanto en el alta/edición de productos como de categorías.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita diacríticos (tildes, diéresis, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
