"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Order, OrderStatus } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_COLORS } from "@/lib/order-status";
import { updateOrderStatusAction } from "@/app/admin/pedidos/actions";
import DataTable, { Column } from "@/components/admin/DataTable";

export default function AdminOrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [list, setList] = useState<Order[]>(initialOrders);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function updateStatus(id: string, status: OrderStatus) {
    // Optimista: refleja el cambio ya mismo en la tabla, y si el Server
    // Action falla, revierte y avisa.
    const prev = list;
    setList((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));

    startTransition(async () => {
      const result = await updateOrderStatusAction(id, status);
      if (result.error) {
        setList(prev);
        alert(`No se pudo actualizar el estado: ${result.error}`);
        return;
      }
      // Trae el dato ya persistido (y el resto del panel, ej. el
      // dashboard) sin recargar el navegador.
      router.refresh();
    });
  }

  const columns: Column<Order>[] = [
    { header: "Número", accessor: (o) => <span className="font-mono">{o.number}</span> },
    { header: "Cliente", accessor: (o) => o.customer.name },
    { header: "Total", accessor: (o) => formatPrice(o.total) },
    {
      header: "Método de pago",
      accessor: (o) => (
        <span className="text-xs capitalize text-warmgray-500">
          {o.paymentMethod?.replace("_", " ") ?? "A coordinar"}
        </span>
      ),
    },
    {
      header: "Fecha",
      accessor: (o) => new Date(o.createdAt).toLocaleDateString("es-AR"),
    },
    {
      header: "Estado",
      accessor: (o) => (
        <select
          value={o.status}
          onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
          className={cn(
            "rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize outline-none",
            ORDER_STATUS_COLORS[o.status]
          )}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: "",
      accessor: (o) => (
        <Link href={`/admin/pedidos/${o.id}`} className="text-xs text-earth-500 hover:underline">
          Ver detalle
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-editorial">Pedidos</h1>
        <p className="text-sm text-warmgray-500">{list.length} pedidos totales</p>
      </div>
      <DataTable columns={columns} data={list} keyExtractor={(o) => o.id} />
    </div>
  );
}
