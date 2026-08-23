"use client";

import { useState } from "react";
import { Customer, Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import DataTable, { Column } from "@/components/admin/DataTable";
import Modal from "@/components/ui/Modal";

interface AdminCustomersClientProps {
  customers: Customer[];
  orders: Order[];
}

export default function AdminCustomersClient({ customers, orders }: AdminCustomersClientProps) {
  const [selected, setSelected] = useState<Customer | null>(null);

  const columns: Column<Customer>[] = [
    { header: "Nombre", accessor: (c) => c.name },
    { header: "Email", accessor: (c) => c.email },
    { header: "Teléfono", accessor: (c) => c.phone },
    { header: "Compras", accessor: (c) => c.ordersCount },
    { header: "Total gastado", accessor: (c) => formatPrice(c.totalSpent) },
    {
      header: "",
      accessor: (c) => (
        <button onClick={() => setSelected(c)} className="text-xs text-earth-500 hover:underline">
          Ver perfil
        </button>
      ),
    },
  ];

  const customerOrders = selected ? orders.filter((o) => o.customer.email === selected.email) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-editorial">Clientes</h1>
        <p className="text-sm text-warmgray-500">{customers.length} clientes registrados</p>
      </div>

      <DataTable columns={columns} data={customers} keyExtractor={(c) => c.id} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-warmgray-500">Email</p>
                <p>{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-warmgray-500">Teléfono</p>
                <p>{selected.phone}</p>
              </div>
              <div>
                <p className="text-xs text-warmgray-500">Compras</p>
                <p>{selected.ordersCount}</p>
              </div>
              <div>
                <p className="text-xs text-warmgray-500">Total gastado</p>
                <p>{formatPrice(selected.totalSpent)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-warmgray-500">
                Historial de pedidos
              </p>
              <ul className="space-y-2">
                {customerOrders.map((o) => (
                  <li key={o.id} className="flex justify-between rounded-lg bg-beige-50 px-3 py-2 text-sm">
                    <span className="font-mono">{o.number}</span>
                    <span>{formatPrice(o.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
