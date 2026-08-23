import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp } from "lucide-react";
import { getOrders } from "@/lib/services/orders";
import { getProducts } from "@/lib/services/products";
import { formatPrice } from "@/lib/utils";
import DashboardCards, { StatCard } from "@/components/admin/DashboardCards";
import DataTable, { Column } from "@/components/admin/DataTable";
import { Order } from "@/lib/types";

const LOW_STOCK_THRESHOLD = 5;

// Server Component. 100% Supabase: productos (stock bajo, destacados)
// y ahora también pedidos (ventas, pendientes, últimos) — ya no queda
// nada de mock-data.ts en esta página.
export default async function AdminDashboardPage() {
  const [products, orders] = await Promise.all([getProducts(), getOrders()]);

  const lowStock = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD);
  const bestSellers = products.filter((p) => p.featured);

  const today = new Date().toISOString().slice(0, 10);
  const salesToday = orders
    .filter((o) => o.createdAt.startsWith(today))
    .reduce((sum, o) => sum + o.total, 0);
  const salesMonth = orders
    .filter((o) => o.createdAt.startsWith(today.slice(0, 7)))
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pendiente").length;

  const cards: StatCard[] = [
    { label: "Ventas del día", value: formatPrice(salesToday), icon: DollarSign },
    { label: "Ventas del mes", value: formatPrice(salesMonth), icon: TrendingUp, accent: "success" },
    { label: "Pedidos pendientes", value: String(pendingOrders), icon: ShoppingBag, accent: "warning" },
    { label: "Productos con poco stock", value: String(lowStock.length), icon: AlertTriangle, accent: "warning" },
  ];

  const orderColumns: Column<Order>[] = [
    { header: "Pedido", accessor: (o) => <span className="font-mono">{o.number}</span> },
    { header: "Cliente", accessor: (o) => o.customer.name },
    { header: "Total", accessor: (o) => formatPrice(o.total) },
    {
      header: "Estado",
      accessor: (o) => (
        <span className="rounded-full bg-warmgray-100 px-2.5 py-1 text-xs capitalize">
          {o.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="title-editorial">Dashboard</h1>
        <p className="text-sm text-warmgray-500">Resumen general de la tienda.</p>
      </div>

      <DashboardCards cards={cards} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmgray-700">
            Últimos pedidos
          </h2>
          <DataTable columns={orderColumns} data={orders.slice(0, 5)} keyExtractor={(o) => o.id} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmgray-700">
            Productos con poco stock
          </h2>
          {lowStock.length === 0 ? (
            <div className="card-surface p-6 text-sm text-warmgray-500">
              Todo el stock está en buen nivel.
            </div>
          ) : (
            <ul className="card-surface divide-y divide-warmgray-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <span>{p.name}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {p.stock} unidades
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmgray-700">
          Productos más vendidos (destacados)
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {bestSellers.map((p) => (
            <div key={p.id} className="card-surface p-4">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-warmgray-500">{formatPrice(p.price)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
