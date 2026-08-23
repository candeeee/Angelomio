import { OrderStatus } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Antes esta lista estaba duplicada en AdminOrdersClient.tsx,
// AdminOrderStatusSelect.tsx y app/cuenta/page.tsx, cada una con su
// propio array de estados (y dos de las tres con su propio mapa de
// labels/colores). Se centraliza acá para que agregar o renombrar un
// estado sea un cambio en un solo lugar.
// ─────────────────────────────────────────────────────────────

export const ORDER_STATUSES: OrderStatus[] = [
  "pendiente",
  "confirmado",
  "preparando",
  "enviado",
  "entregado",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-blue-100 text-blue-700",
  preparando: "bg-purple-100 text-purple-700",
  enviado: "bg-cyan-100 text-cyan-700",
  entregado: "bg-emerald-100 text-emerald-700",
};
