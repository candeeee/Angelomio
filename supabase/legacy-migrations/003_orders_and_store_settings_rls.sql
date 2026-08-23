-- ⚠️ SUPERSEDIDA por 004_orders_store_settings_rls.sql — este archivo
-- asumía compra de invitado (user_id nullable), requisito que cambió:
-- el checkout ahora exige login. No la corras; usá 004 en su lugar.
-- Se deja sin borrar solo como registro histórico de la decisión.

-- ─────────────────────────────────────────────────────────────
-- RLS para orders, order_items y store_settings.
--
-- SUPUESTO DE ESQUEMA (no confirmado en este pedido — ver
-- lib/services/orders.ts y store-settings.ts para el detalle):
--   orders: id, number, user_id, customer_name, customer_phone,
--     customer_email, customer_address, customer_notes, total, status,
--     payment_method, created_at
--   order_items: id, order_id, product_id, name, variant_label, price,
--     quantity
--   store_settings: id, store_name, logo_url, banner_url, welcome_text,
--     whatsapp_number, instagram, facebook, payment_methods,
--     shipping_cost, shipping_zones, shipping_info
--
-- Si tus columnas reales tienen otros nombres, ajustá las referencias
-- de abajo antes de correr esto — no lo ejecutes a ciegas.
-- ─────────────────────────────────────────────────────────────

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

-- Función reutilizable: evita repetir el subquery "¿es admin?" en cada
-- policy. security definer + search_path fijo, mismo patrón que
-- handle_new_user() en 001_profiles_and_roles.sql.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────

-- Invitados y usuarios logueados pueden crear pedidos desde el
-- checkout. Si se manda user_id, tiene que ser el propio (no se puede
-- crear un pedido "a nombre de" otro usuario). user_id null = compra
-- de invitado, siempre permitido.
create policy "Cualquiera puede crear pedidos"
  on public.orders for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Un usuario logueado ve únicamente sus propios pedidos.
create policy "Usuarios ven sus propios pedidos"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

-- Admin ve todos los pedidos (incluidos los de invitados, user_id null).
create policy "Admins ven todos los pedidos"
  on public.orders for select
  to authenticated
  using (public.is_admin());

-- Solo admin cambia estado / edita un pedido.
create policy "Solo admins actualizan pedidos"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Solo admin puede borrar (función deleteOrder() del service, sin UI
-- todavía, pero la policy queda lista).
create policy "Solo admins borran pedidos"
  on public.orders for delete
  to authenticated
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- order_items
--
-- No tienen user_id propio: la visibilidad/edición se resuelve
-- siempre a través del pedido padre (misma regla que orders arriba).
-- ─────────────────────────────────────────────────────────────

-- Se puede insertar un item si el pedido al que pertenece es "propio"
-- (mismo criterio que el insert de orders) — evita que alguien inserte
-- items en el pedido de otra persona.
create policy "Insertar items de un pedido propio"
  on public.order_items for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

-- Ver items: si se puede ver el pedido padre (dueño o admin), se ven
-- sus items.
create policy "Ver items de pedidos visibles"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Solo admins actualizan items"
  on public.order_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Solo admins borran items"
  on public.order_items for delete
  to authenticated
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- store_settings
--
-- Lectura pública (branding/contacto se muestra a cualquier
-- visitante, logueado o no). Escritura solo admin.
-- ─────────────────────────────────────────────────────────────

create policy "Cualquiera puede leer la configuración"
  on public.store_settings for select
  to anon, authenticated
  using (true);

create policy "Solo admins insertan configuración"
  on public.store_settings for insert
  to authenticated
  with check (public.is_admin());

create policy "Solo admins actualizan configuración"
  on public.store_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Solo admins borran configuración"
  on public.store_settings for delete
  to authenticated
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- NOTA DE SEGURIDAD IMPORTANTE sobre /pedido-confirmado/[id]:
--
-- A propósito NO existe una policy que permita a `anon` hacer SELECT
-- sobre `orders` por id. Una policy así (aunque "solo por id conocido")
-- en RLS no se puede acotar a "solo si conocés el id exacto" — RLS
-- evalúa fila por fila sin ver cómo se armó la query, así que
-- "anon select using (true)" expondría TODOS los pedidos (nombres,
-- teléfonos, direcciones) a cualquiera con la anon key, no solo el que
-- conoce un id puntual. Por eso la pantalla de confirmación de compra
-- de invitado se resuelve con sessionStorage en el cliente (ver
-- app/pedido-confirmado/[id]/page.tsx) en vez de con una policy pública
-- — es la opción segura, documentada en el README.
-- ─────────────────────────────────────────────────────────────
