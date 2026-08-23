import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { PaymentMethod, StoreSettings } from "@/lib/types";
import { BRAND_WORDMARK } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// SUPUESTO DE ESQUEMA A VERIFICAR (no confirmado en este pedido, se
// asume la propuesta del README anterior):
//
//   store_settings: id, store_id, store_name, logo_url, banner_url,
//     welcome_text, whatsapp_number, instagram, facebook,
//     payment_methods (text[]), shipping_cost, shipping_zones (text[]),
//     shipping_info
//
// Lectura → cliente público (branding/contacto es información pública,
// la necesitan Navbar/Hero/Footer/Contacto/Checkout para cualquier
// visitante, logueado o no).
// Escritura → cliente con cookies (solo admin, vía RLS).
// ─────────────────────────────────────────────────────────────

interface StoreSettingsRow {
  id: string;
  store_name: string;
  logo_url: string | null;
  banner_url: string | null;
  welcome_text: string | null;
  whatsapp_number: string;
  instagram: string | null;
  facebook: string | null;
  payment_methods: PaymentMethod[] | null;
  shipping_cost: number | null;
  shipping_zones: string[] | null;
  shipping_info: string | null;
}

function mapRowToSettings(row: StoreSettingsRow): StoreSettings & { id: string } {
  return {
    id: row.id,
    storeName: row.store_name,
    logoUrl: row.logo_url ?? "",
    bannerUrl: row.banner_url ?? "",
    welcomeText: row.welcome_text ?? "",
    whatsappNumber: row.whatsapp_number,
    instagram: row.instagram ?? undefined,
    facebook: row.facebook ?? undefined,
    primaryColor: "#111110", // no persistido todavía; valor de marca fijo
    paymentMethods: row.payment_methods ?? [],
    shipping: {
      cost: row.shipping_cost ?? 0,
      zones: row.shipping_zones ?? [],
      info: row.shipping_info ?? "",
    },
  };
}

/**
 * Configuración pública de la tienda (nombre, logo, banner, contacto).
 * Cliente público: no depende de sesión, la necesitan páginas públicas.
 * Devuelve null si todavía no hay ninguna fila cargada.
 */
export async function getStoreSettings(): Promise<(StoreSettings & { id: string }) | null> {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();

  if (error) {
    console.error("[services/store-settings] Error cargando configuración:", error.message);
    return null;
  }
  if (!data) return null;

  return mapRowToSettings(data as StoreSettingsRow);
}

/**
 * Fallback si todavía no se guardó ninguna configuración en
 * `store_settings` (tabla vacía) — evita que Navbar/Hero/Footer/etc.
 * rendericen vacío o rompan antes de que el admin cargue datos por
 * primera vez en /admin/configuracion.
 */
const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: BRAND_WORDMARK,
  logoUrl: "",
  // Sin banner por defecto: el hero muestra un placeholder neutro hasta
  // que se cargue una foto propia. Antes había una URL de stock fija, y
  // eso hacía que la tienda arrancara con la fotografía de otra marca.
  bannerUrl: "",
  welcomeText: "Básicos para todos los días.",
  whatsappNumber: "",
  primaryColor: "#111110",
  paymentMethods: [],
  shipping: { cost: 0, zones: [], info: "" },
};

/**
 * Igual que `getStoreSettings()` pero nunca devuelve null — usa el
 * fallback de arriba si la tabla todavía está vacía. Es lo que deben
 * usar todos los componentes de UI (Navbar, Hero, Footer, Contacto,
 * Checkout); `getStoreSettings()` "cruda" queda para el form de admin,
 * que sí necesita saber si existe `id` o no (crear vs. actualizar).
 */
export async function getStoreSettingsOrDefault(): Promise<StoreSettings> {
  const settings = await getStoreSettings();
  return settings ?? DEFAULT_STORE_SETTINGS;
}

export interface StoreSettingsInput {
  id?: string;
  storeName: string;
  welcomeText: string;
  whatsappNumber: string;
  instagram?: string;
  paymentMethods: PaymentMethod[];
  shipping: { cost: number; zones: string[]; info: string };
}

/**
 * Crea o actualiza la fila única de configuración. Cliente con cookies
 * (admin, vía RLS). Si no hay `id` (primera vez), inserta una fila
 * nueva en vez de actualizar.
 */
export async function upsertStoreSettings(input: StoreSettingsInput) {
  const supabase = createServerSupabaseClient();

  const payload = {
    store_name: input.storeName,
    welcome_text: input.welcomeText,
    whatsapp_number: input.whatsappNumber,
    instagram: input.instagram ?? null,
    payment_methods: input.paymentMethods,
    shipping_cost: input.shipping.cost,
    shipping_zones: input.shipping.zones,
    shipping_info: input.shipping.info,
  };

  if (input.id) {
    return supabase.from("store_settings").update(payload).eq("id", input.id);
  }

  return supabase.from("store_settings").insert(payload);
}
