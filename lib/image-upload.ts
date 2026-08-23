// ─────────────────────────────────────────────────────────────
// Reglas de validación de imágenes, compartidas por cliente y
// servidor.
//
// Vive fuera de `lib/services/storage.ts` (que es `server-only`) para
// que el componente de admin pueda validar ANTES de subir — feedback
// instantáneo, sin gastar una request para enterarse de que el archivo
// pesa 20 MB — sin que eso implique duplicar los límites en dos
// lugares. El servidor vuelve a validar con estas mismas constantes:
// la validación del cliente es UX, la del servidor es la que manda.
// ─────────────────────────────────────────────────────────────

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** `accept` del <input type="file">, derivado de la lista de arriba. */
export const IMAGE_ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_MIME_TYPES.join(",");

export function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function formatMaxImageSize(): string {
  return `${(MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0)} MB`;
}

/**
 * Devuelve el mensaje de error si el archivo no sirve, o null si está
 * todo bien. Mismo texto en cliente y servidor.
 */
export function validateImageFile(file: { size: number; type: string }): string | null {
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_IMAGE_BYTES) {
    return `La imagen supera el máximo de ${formatMaxImageSize()}.`;
  }
  if (!isAllowedImageMimeType(file.type)) {
    return "Formato no admitido. Usá JPG, PNG, WEBP, AVIF o GIF.";
  }
  return null;
}

/**
 * Texto alternativo por defecto a partir del nombre del archivo
 * ("jean-wide-leg-azul.jpg" → "jean wide leg azul"). El path real en
 * el bucket es un UUID, así que este es el único lugar donde el nombre
 * original del archivo sigue siendo útil — y de paso el `alt` deja de
 * quedar siempre vacío, que era el comportamiento anterior.
 */
export function altFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
