import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
) {
  // Solo un warning: dejamos que la app arranque para poder navegar el
  // frontend sin backend conectado, pero cualquier llamada real a
  // Supabase (login, registro, fetch de perfil) va a fallar hasta que
  // completes .env.local — ver .env.local.example.
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Configuralas en .env.local."
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
