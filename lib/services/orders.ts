import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Order, OrderItem, OrderStatus, PaymentMethod } from "@/lib/types";
import { generateOrderNumber } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Servicio de pedidos. Mismo patrón que products.ts/categories.ts.
//
// SUPUESTO DE ESQUEMA A VERIFICAR: no se recibió el detalle de columnas
// de `orders`/`order_items` en este pedido, así que se asume que se
// aplicó tal cual la propuesta dejada en el README (changelog anterior):
//
//   orders: id, number, user_id, customer_name, customer_phone,
//           customer_email, customer_address, customer_notes, total,
//           status, payment_method, created_at
//   order_items: id, order_id, product_id, name, variant_label, price,
//                quantity
//
// Si tu tabla real usa otros nombres, vas a ver el error logueado en
// consola (`[services/orders] ...`) y hay que ajustar los `mapRowTo*`
// de este archivo a los nombres reales — mismo mecanismo defensivo que
// ya se usa en products.ts/categories.ts.
//
// SIEMPRE cliente con cookies (nunca el público): todo acá depende de
// quién está logueado (dueño del pedido vía RLS, o admin) — a
// diferencia del catálogo, los pedidos son datos privados.
// ─────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  customer_notes: string | null;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  variant_label: string | null;
  price: number;
  quantity: number;
}

function mapRowToOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    number: row.number,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email,
      address: row.customer_address,
      notes: row.customer_notes ?? undefined,
    },
    items: items.map(
      (item): OrderItem => ({
        productId: item.product_id ?? "",
        name: item.name,
        variantLabel: item.variant_label ?? undefined,
        price: item.price,
        quantity: item.quantity,
      })
    ),
    total: row.total,
    status: row.status,
    paymentMethod: row.payment_method ?? undefined,
    createdAt: row.created_at,
  };
}

async function attachItems(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orderRows: OrderRow[]
): Promise<Order[]> {
  if (orderRows.length === 0) return [];

  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .in(
      "order_id",
      orderRows.map((o) => o.id)
    );

  if (error) {
    console.error("[services/orders] Error cargando order_items:", error.message);
  }

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const row of (data as OrderItemRow[] | null) ?? []) {
    const list = itemsByOrder.get(row.order_id) ?? [];
    list.push(row);
    itemsByOrder.set(row.order_id, list);
  }

  return orderRows.map((row) => mapRowToOrder(row, itemsByOrder.get(row.id) ?? []));
}

/**
 * Todos los pedidos, más recientes primero. Uso admin — la RLS solo
 * devuelve filas si quien pregunta tiene rol admin (si no, devuelve
 * vacío, no error).
 */
export async function getOrders(): Promise<Order[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/orders] Error cargando pedidos:", error.message);
    return [];
  }

  return attachItems(supabase, data as OrderRow[]);
}

/**
 * Un pedido por id. Devuelve null si no existe O si la RLS no permite
 * verlo (no es dueño ni admin) — ambos casos son indistinguibles desde
 * acá a propósito, para no filtrar si un id existe o no.
 */
export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[services/orders] Error cargando pedido:", error.message);
    return null;
  }
  if (!data) return null;

  const [order] = await attachItems(supabase, [data as OrderRow]);
  return order ?? null;
}

/**
 * Pedidos de un usuario autenticado (para /cuenta). La RLS ya limita
 * esto a `auth.uid() = user_id`, así que este filtro es defensa en
 * profundidad, no la única barrera.
 */
export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[services/orders] Error cargando pedidos del usuario:", error.message);
    return [];
  }

  return attachItems(supabase, data as OrderRow[]);
}

export interface CreateOrderInput {
  userId: string;
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

/**
 * Crea un pedido + sus order_items.
 *
 * Desde esta versión el checkout requiere sesión (ver README, sección
 * "Checkout"): `userId` es obligatorio. La validación de que exista
 * usuario logueado la hace `checkoutAction()` en
 * app/checkout/actions.ts, ANTES de llamar a esta función — este
 * service ya no acepta ni contempla pedidos sin dueño.
 *
 * El número de pedido ("AM-0001") se genera contando pedidos
 * existentes, igual que hacía `generateOrderNumber` sobre el array
 * mock — con más de un checkout concurrente esto puede colisionar
 * (ver limitación documentada en README); no es atómico.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<{ order: Order | null; error: string | null }> {
  const supabase = createServerSupabaseClient();

  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true });
  const number = generateOrderNumber(count ?? 0);

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      number,
      user_id: input.userId,
      customer_name: input.customer.name,
      customer_phone: input.customer.phone,
      customer_email: input.customer.email,
      customer_address: input.customer.address,
      customer_notes: input.customer.notes ?? null,
      total: input.total,
      status: "pendiente",
    })
    .select("*")
    .single();

  if (orderError || !orderRow) {
    console.error("[services/orders] Error creando pedido:", orderError?.message);
    return { order: null, error: orderError?.message ?? "No se pudo crear el pedido" };
  }

  const row = orderRow as OrderRow;

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: row.id,
        product_id: item.productId || null,
        name: item.name,
        variant_label: item.variantLabel ?? null,
        price: item.price,
        quantity: item.quantity,
      }))
    );

    if (itemsError) {
      console.error("[services/orders] Error creando order_items:", itemsError.message);
      // El pedido ya quedó creado sin items — no se revierte automáticamente
      // (no hay transacciones multi-statement desde supabase-js). Ver
      // limitación documentada en README.
      return { order: null, error: itemsError.message };
    }
  }

  // Construimos el Order de retorno con los items ya conocidos
  // (input.items) en vez de volver a leerlos de la base — evita un
  // round-trip innecesario, ya sabemos exactamente qué se insertó.
  const order: Order = {
    id: row.id,
    number: row.number,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email,
      address: row.customer_address,
      notes: row.customer_notes ?? undefined,
    },
    items: input.items,
    total: row.total,
    status: row.status,
    paymentMethod: row.payment_method ?? undefined,
    createdAt: row.created_at,
  };

  return { order, error: null };
}

/**
 * Cambia el estado de un pedido. Solo admin puede (RLS).
 */
export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = createServerSupabaseClient();
  return supabase.from("orders").update({ status }).eq("id", id);
}

/**
 * Elimina un pedido (y en cascada sus order_items, si la FK real tiene
 * ON DELETE CASCADE — no se puede confirmar sin inspeccionar el
 * esquema). No hay botón de borrar en la UI todavía (no existía en la
 * versión anterior tampoco); se deja disponible para uso futuro.
 */
export async function deleteOrder(id: string) {
  const supabase = createServerSupabaseClient();
  return supabase.from("orders").delete().eq("id", id);
}
