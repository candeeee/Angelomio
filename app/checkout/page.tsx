import { redirect } from "next/navigation";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import { getCurrentProfile } from "@/lib/services/profiles";
import CheckoutPageClient from "@/components/checkout/CheckoutPageClient";

// Server Component. Desde esta versión el checkout requiere sesión
// iniciada (ya no se permiten compras como invitado) — se resuelve acá,
// server-side, con el mismo patrón que /cuenta: si no hay sesión,
// redirect() antes de renderizar el formulario, en vez de dejar que el
// usuario lo complete y falle recién al confirmar por la policy de RLS.
export default async function CheckoutPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?redirect=/checkout");
  }

  const storeSettings = await getStoreSettingsOrDefault();
  return <CheckoutPageClient storeSettings={storeSettings} />;
}
