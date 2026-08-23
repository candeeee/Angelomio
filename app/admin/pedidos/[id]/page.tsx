import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrder } from "@/lib/services/orders";
import { formatPrice } from "@/lib/utils";
import AdminOrderStatusSelect from "@/components/admin/AdminOrderStatusSelect";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);
  if (!order) return notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/pedidos" className="flex items-center gap-1.5 text-sm text-warmgray-500 hover:text-ink">
        <ArrowLeft size={15} /> Volver a pedidos
      </Link>

      <div className="card-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl font-semibold">{order.number}</h1>
            <p className="text-xs text-warmgray-500">
              {new Date(order.createdAt).toLocaleString("es-AR")}
            </p>
          </div>
          <AdminOrderStatusSelect orderId={order.id} initialStatus={order.status} />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 border-y border-warmgray-100 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-warmgray-500">Cliente</p>
            <p className="text-sm">{order.customer.name}</p>
            <p className="text-sm text-warmgray-500">{order.customer.phone}</p>
            <p className="text-sm text-warmgray-500">{order.customer.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-warmgray-500">Dirección</p>
            <p className="text-sm">{order.customer.address}</p>
            {order.customer.notes && (
              <p className="mt-1 text-sm text-warmgray-500">Obs: {order.customer.notes}</p>
            )}
          </div>
        </div>

        <ul className="space-y-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>
                {item.name}
                {item.variantLabel ? ` (${item.variantLabel})` : ""} x{item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-warmgray-100 pt-4 font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  );
}
