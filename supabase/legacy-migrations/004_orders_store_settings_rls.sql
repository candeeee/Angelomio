-- ─────────────────────────────────────────────────────────────
-- RLS completo para orders, order_items y store_settings.
--
-- Supersede a 003_orders_and_store_settings_rls.sql: ese archivo
-- asumía compra de invitado (user_id nullable en el insert), pero el
-- checkout ahora requiere sesión iniciada (cambio de requisito del
-- proyecto — ver README, sección "Checkout"). Si 003 nunca se llegó a
-- correr en tu Supabase (que es lo que reportaste: RLS habilitado,
-- cero policies), este archivo solo hace falta correrlo a él — es
-- autocontenido y usa `drop policy if exists` antes de cada
-- `create policy`, así que es seguro re-correrlo si por algún motivo
-- 003 sí llegó a crear alguna policy parcialmente.
--
-- SUPUESTO DE ESQUEMA (no confirmado con acceso directo a tu base — ver
-- lib/services/orders.ts y store-settings.ts para el detalle de
-- columnas asumidas). Si tus columnas reales tienen otros nombres,
-- estas policies van a fallar al crearse con un error de columna
-- inexistente — en ese caso ajustá las referencias antes de reintentar.
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

drop policy if exists "Cualquiera puede crear pedidos" on public.orders;
drop policy if exists "Usuarios autenticados crean sus pedidos" on public.orders;
drop policy if exists "Usuarios ven sus propios pedidos" on public.orders;
drop policy if exists "Admins ven todos los pedidos" on public.orders;
drop policy if exists "Solo admins actualizan pedidos" on public.orders;
drop policy if exists "Solo admins borran pedidos" on public.orders;

-- Checkout requiere login: solo un usuario autenticado puede crear un
-- pedido, y únicamente a su propio nombre (no se puede insertar un
-- pedido con user_id de otra persona).
create policy "Usuarios autenticados crean sus pedidos"
  on public.orders for insert
  to authenticated
  with check (user_id = auth.uid());

-- Un usuario logueado ve únicamente sus propios pedidos.
create policy "Usuarios ven sus propios pedidos"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

-- Admin ve todos los pedidos.
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
-- siempre a través del pedido padre.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Insertar items de un pedido propio" on public.order_items;
drop policy if exists "Ver items de pedidos visibles" on public.order_items;
drop policy if exists "Solo admins actualizan items" on public.order_items;
drop policy if exists "Solo admins borran items" on public.order_items;

-- Se puede insertar un item si el pedido al que pertenece es propio
-- (mismo criterio que el insert de orders) — evita que alguien inserte
-- items en el pedido de otra persona.
create policy "Insertar items de un pedido propio"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
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
-- Lectura pública: Navbar/Hero/Footer/Contacto/Checkout necesitan
-- mostrar nombre de tienda, banner y WhatsApp a CUALQUIER visitante,
-- esté logueado o no — por eso el SELECT queda abierto. Si en algún
-- momento se decide que ni siquiera la lectura pública debe ser
-- anónima, hay que rediseñar esas páginas para no depender de esta
-- tabla (quedaría un comentario "OPCIONAL" abajo con la alternativa
-- restringida, comentada, para no aplicarla sin confirmar el impacto).
-- Escritura: solo admin, siempre.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Cualquiera puede leer la configuración" on public.store_settings;
drop policy if exists "Solo admins insertan configuración" on public.store_settings;
drop policy if exists "Solo admins actualizan configuración" on public.store_settings;
drop policy if exists "Solo admins borran configuración" on public.store_settings;

create policy "Cualquiera puede leer la configuración"
  on public.store_settings for select
  to anon, authenticated
  using (true);

-- OPCIONAL — restringir también la lectura a solo admins (rompe el
-- branding público en Navbar/Hero/Footer/Contacto/Checkout salvo que
-- se rediseñen esas páginas primero). Descomentar y borrar la policy
-- de arriba si de verdad se quiere esto:
--
-- drop policy if exists "Cualquiera puede leer la configuración" on public.store_settings;
-- create policy "Solo admins leen configuración"
--   on public.store_settings for select
--   to authenticated
--   using (public.is_admin());

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
-- NOTA sobre /pedido-confirmado/[id]:
--
-- Ya no hace falta una policy especial para invitados (el checkout
-- requiere login), así que la policy estándar de SELECT de orders
-- ("dueño o admin") alcanza para que la página de confirmación
-- funcione siempre para quien acaba de comprar. El sessionStorage que
-- usa esa pantalla (ver app/pedido-confirmado/[id]/OrderConfirmedClient.tsx)
-- quedó como optimización de UX (mostrar al instante sin esperar el
-- round-trip), no como workaround de seguridad.
-- ─────────────────────────────────────────────────────────────
