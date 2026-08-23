"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createOrder, type CreateOrderInput } from "@/lib/services/orders";
import { Order, OrderItem } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Desde esta versión el checkout requiere sesión iniciada (cambio de
// requisito del proyecto — ya no se permiten compras como invitado).
// Reemplaza el `orders.unshift(...)` que originalmente vivía en
// CheckoutForm.tsx.
//
// Devuelve el pedido completo (no solo el id) para que el cliente lo
// guarde en sessionStorage y la pantalla de confirmación pueda
// mostrarlo de inmediato sin depender de una policy de RLS pública
// (ver nota de seguridad en supabase/migrations/004_...).
// ─────────────────────────────────────────────────────────────

export interface CheckoutInput {
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
  };
  items: OrderItem[];
  total: number;
}

export async function checkoutAction(
  input: CheckoutInput
): Promise<{ order: Order | null; error: string | null }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No se llama a createOrder(): sin sesión, no hay dueño para el
    // pedido y la policy de RLS de `orders` lo rechazaría igual (ver
    // migración 004). Se corta acá con un mensaje claro para la UI.
    return { order: null, error: "Debés iniciar sesión para confirmar tu pedido." };
  }

  const orderInput: CreateOrderInput = {
    userId: user.id,
    customer: input.customer,
    items: input.items,
    total: input.total,
  };

  return createOrder(orderInput);
}
