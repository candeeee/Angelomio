import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getOrdersByUser } from "@/lib/services/orders";
import { OrderStatus } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import SignOutButton from "@/components/account/SignOutButton";

function StatusTracker({ status }: { status: OrderStatus }) {
  const activeIndex = ORDER_STATUSES.indexOf(status);
  return (
    <div className="flex items-center">
      {ORDER_STATUSES.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
                i <= activeIndex ? "bg-ink text-cream" : "bg-warmgray-100 text-warmgray-400"
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "mt-1.5 hidden text-[10px] uppercase tracking-wider sm:block",
                i <= activeIndex ? "text-ink" : "text-warmgray-400"
              )}
            >
              {ORDER_STATUS_LABELS[s]}
            </span>
          </div>
          {i < ORDER_STATUSES.length - 1 && (
            <div
              className={cn(
                "mx-2 h-px w-8 sm:w-12",
                i < activeIndex ? "bg-ink" : "bg-warmgray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Server Component puro — la sesión se resuelve server-side
// (getCurrentProfile) y, si no hay una, se redirige con redirect() de
// Next antes de renderizar nada.
//
// DOS VISTAS SEGÚN EL ROL (cambio de esta sesión):
//  - admin → datos de la cuenta, acceso al panel y cerrar sesión. Nada
//    de "Mis pedidos": un administrador no compra en su propia tienda,
//    así que ese bloque era una sección vacía permanente. Tampoco se
//    consulta `getOrdersByUser()` para él — se ahorra la query entera.
//  - usuario normal → exactamente lo mismo que antes, sin cambios de
//    comportamiento.
export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?redirect=/cuenta");
  }

  const isAdmin = profile.role !== "user";

  if (isAdmin) {
    return (
      <div className="container-app py-16 sm:py-24">
        <p className="eyebrow mb-4">Cuenta</p>
        <h1 className="text-4xl font-light sm:text-5xl">
          {profile.full_name || "Mi cuenta"}
        </h1>

        <dl className="mt-12 max-w-lg divide-y divide-warmgray-100 border-y border-warmgray-100 text-sm">
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt className="eyebrow">Nombre</dt>
            <dd className="text-right">{profile.full_name || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt className="eyebrow">Email</dt>
            <dd className="break-all text-right">{profile.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt className="eyebrow">Rol</dt>
            <dd className="text-right capitalize">{profile.role}</dd>
          </div>
        </dl>

        <div className="mt-12 flex flex-wrap items-center gap-8">
          <Link href="/admin" className="btn-primary">
            <LayoutDashboard size={15} strokeWidth={1.5} /> Ir al panel
          </Link>
          <SignOutButton />
        </div>
      </div>
    );
  }

  const myOrders = await getOrdersByUser(profile.id);

  return (
    <div className="container-app py-16 sm:py-24">
      <p className="eyebrow mb-4">Cuenta</p>
      <h1 className="text-4xl font-light sm:text-5xl">
        Hola, {profile.full_name || profile.email}
      </h1>
      <p className="mt-4 text-sm text-warmgray-500">Acá podés ver el estado de tus pedidos.</p>

      <div className="mt-8">
        <SignOutButton />
      </div>

      <div className="mt-14">
        {myOrders.length === 0 ? (
          <div className="border-y border-warmgray-100 py-16 text-center">
            <p className="text-sm text-warmgray-500">Todavía no hiciste ningún pedido.</p>
            <Link href="/productos" className="btn-primary mt-8 inline-flex">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-warmgray-100 border-y border-warmgray-100">
            {myOrders.map((order) => (
              <div key={order.id} className="py-10">
                <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm">{order.number}</p>
                    <p className="eyebrow mt-1">
                      {new Date(order.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className="font-display text-xl font-light">
                    {formatPrice(order.total)}
                  </span>
                </div>

                <div className="mb-8 overflow-x-auto pb-2">
                  <StatusTracker status={order.status} />
                </div>

                <ul className="space-y-2 text-sm text-warmgray-600">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-6">
                      <span>
                        {item.name}
                        {item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                      </span>
                      <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
