import { createBrowserClient } from "@supabase/ssr";

// ─────────────────────────────────────────────────────────────
// Cliente de Supabase para el navegador.
//
// POR QUÉ ESTE ARCHIVO CAMBIÓ:
//
// Antes, si faltaban las variables de entorno, el cliente se construía
// igual apuntando a `https://placeholder.supabase.co` — un dominio que
// no existe. El resultado era que login y registro fallaban con
// "Load failed" (Safari) o "Failed to fetch" (Chrome): el mensaje que
// da el navegador cuando una petición no llega a destino.
//
// Ese mensaje no dice absolutamente nada sobre la causa real, que es un
// archivo .env.local incompleto. Un error de configuración se disfrazaba
// de error de red.
//
// Ahora, si falta configuración, el cliente rechaza cualquier petición
// con un mensaje que explica qué hacer. Ese texto viaja por el mismo
// camino que cualquier otro error de Supabase, así que aparece
// directamente en el formulario de login.
//
// No se lanza el error al importar el módulo a propósito: este archivo
// lo carga AuthContext desde el layout raíz, así que una excepción acá
// dejaría todo el sitio en blanco en vez de mostrar un formulario con
// un mensaje claro.
//
// IMPORTANTE: Next.js reemplaza `process.env.NEXT_PUBLIC_*` por su valor
// literal durante el build, y sólo cuando está escrito como acceso
// estático completo. Por eso las dos lecturas de abajo están escritas
// enteras y no se arman dinámicamente.
// ─────────────────────────────────────────────────────────────

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabasePublishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

const missing: string[] = [];
if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!supabasePublishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const CONFIG_ERROR =
  `Supabase no está configurado: falta ${missing.join(" y ")} en .env.local. ` +
  `Copiá .env.example, completá los valores desde Supabase → Project Settings → API ` +
  `y reiniciá "npm run dev" (Next lee .env.local sólo al arrancar). ` +
  `En Vercel, las variables NEXT_PUBLIC_ se incrustan durante el build: hay que redesplegar.`;

if (missing.length > 0 && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.error(`[Supabase] ${CONFIG_ERROR}`);
}

export function createClient() {
  if (missing.length > 0) {
    // El cliente se crea igual (para que la app renderice), pero su
    // `fetch` rechaza con el motivo real en lugar de intentar hablarle
    // a un dominio inventado.
    return createBrowserClient("https://unconfigured.invalid", "unconfigured", {
      global: {
        fetch: () => Promise.reject(new Error(CONFIG_ERROR)),
      },
    });
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
