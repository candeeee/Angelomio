"use server";

import { revalidatePath } from "next/cache";
import { updateOrderStatus } from "@/lib/services/orders";
import { OrderStatus } from "@/lib/types";

export async function updateOrderStatusAction(id: string, status: OrderStatus) {
  const { error } = await updateOrderStatus(id, status);
  if (error) return { error: error.message };

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin");
  revalidatePath("/cuenta");
  return { error: null };
}
