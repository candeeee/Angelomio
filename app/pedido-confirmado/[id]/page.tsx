import { getOrder } from "@/lib/services/orders";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import OrderConfirmedClient from "./OrderConfirmedClient";

interface OrderConfirmedPageProps {
  params: { id: string };
}

// Server Component: trae el pedido real vía RLS (dueño logueado o
// admin — ver supabase/migrations/004_...). Desde que el checkout
// requiere sesión, todo pedido tiene un `user_id` real, así que esto
// debería resolver siempre para quien acaba de comprar. El client
// component de abajo igual prioriza sessionStorage (ver comentario ahí)
// como optimización de UX, no como workaround de seguridad.
export default async function OrderConfirmedPage({ params }: OrderConfirmedPageProps) {
  const [serverOrder, storeSettings] = await Promise.all([
    getOrder(params.id),
    getStoreSettingsOrDefault(),
  ]);

  return (
    <OrderConfirmedClient
      orderId={params.id}
      serverOrder={serverOrder}
      whatsappNumber={storeSettings.whatsappNumber}
    />
  );
}
