import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Customer } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// No existe (ni se creó) una tabla `customers`. Por diseño (ver README,
// changelog anterior): un "cliente" es simplemente un agrupamiento de
// `orders` por email — esto cubre también compras de invitado sin
// cuenta, que una tabla `customers` ligada 1:1 a `profiles` no podría
// representar. Evita mantener dos fuentes de verdad sincronizadas a mano.
// ─────────────────────────────────────────────────────────────

interface OrderSummaryRow {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  created_at: string;
}

/**
 * Agrega `orders` por email de cliente. Uso admin (mismo cliente/RLS
 * que orders.ts: solo un admin ve todos los pedidos, así que solo un
 * admin puede ver este resumen).
 */
export async function getCustomersSummary(): Promise<Customer[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("customer_name, customer_email, customer_phone, customer_address, total, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[services/customers] Error agregando clientes:", error.message);
    return [];
  }

  const rows = data as OrderSummaryRow[];
  const byEmail = new Map<string, Customer>();

  for (const row of rows) {
    const existing = byEmail.get(row.customer_email);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalSpent += row.total;
      // Nos quedamos con los datos de contacto del pedido más reciente
      // (por si el cliente cambió de teléfono/dirección entre compras).
      existing.name = row.customer_name;
      existing.phone = row.customer_phone;
      existing.address = row.customer_address;
    } else {
      byEmail.set(row.customer_email, {
        id: row.customer_email,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address,
        ordersCount: 1,
        totalSpent: row.total,
        createdAt: row.created_at, // primera compra (rows vienen ascendente)
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}
