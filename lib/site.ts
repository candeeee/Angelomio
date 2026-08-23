// ─────────────────────────────────────────────────────────────
// Datos públicos y fijos de la marca.
//
// Acá viven SOLO los valores que no son configurables desde el panel:
// la URL canónica del sitio (la necesita `metadataBase`, el sitemap y
// robots.txt) y los datos de contacto que hoy no tienen columna en
// `store_settings`.
//
// Todo lo que SÍ es configurable (nombre de la tienda, WhatsApp,
// Instagram, banner, textos de envío) se sigue leyendo de
// `store_settings` vía `getStoreSettingsOrDefault()` — no se duplica
// acá.
// ─────────────────────────────────────────────────────────────

/**
 * URL pública del sitio. Se toma de `NEXT_PUBLIC_SITE_URL` para que en
 * Vercel/producción apunte al dominio real; el fallback solo sirve para
 * desarrollo local.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";

export const BRAND_NAME = "Angelo Mio";

/** Cómo se escribe el logotipo en la interfaz (header, footer, panel). */
export const BRAND_WORDMARK = "ANGELO MIO";

export const BRAND_TAGLINE = "Indumentaria y accesorios";

/**
 * Dirección física del local. No existe columna para esto en
 * `store_settings`; agregarla implicaba tocar esquema, tipos, service y
 * formulario de admin. Cuando esa columna exista, se reemplaza esta
 * constante por el valor de settings y nada más.
 */
export const BRAND_ADDRESS = "Córdoba 80, Buenos Aires";

/** Mismo criterio que la dirección: sin columna en `store_settings`. */
export const BRAND_EMAIL = "contacto@angelomio.com";

/** Handle de Instagram para mostrar en la interfaz (el link sale de settings). */
export const BRAND_INSTAGRAM_HANDLE = "@angelomioindum";
