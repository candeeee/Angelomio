"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_COLORS } from "@/lib/order-status";
import { updateOrderStatusAction } from "@/app/admin/pedidos/actions";

export default function AdminOrderStatusSelect({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: OrderStatus) {
    const prev = status;
    setStatus(next);

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, next);
      if (result.error) {
        setStatus(prev);
        alert(`No se pudo actualizar el estado: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      className={cn(
        "rounded-full border-0 px-3 py-1.5 text-xs font-medium capitalize outline-none",
        ORDER_STATUS_COLORS[status]
      )}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
