-- Pedidos, ítems y configuración de tienda: RLS completo.
-- Este script es idempotente respecto de policies e índices y se puede
-- ejecutar aunque las tablas ya existan y tengan RLS habilitado.

begin;

-- Las funciones SECURITY DEFINER evitan una consulta recursiva de RLS sobre
-- profiles/orders dentro de una policy. No reciben valores de cliente salvo
-- el UUID de la fila que la policy ya está evaluando.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id and user_id = auth.uid()
  );
$$;

-- Se usa únicamente para permitir que el checkout anónimo inserte los ítems
-- inmediatamente después de crear una orden sin user_id. Las órdenes no son
-- legibles para anon; la confirmación de invitados se resuelve en el servidor
-- con un comprobante firmado, no con una policy de SELECT pública.
create or replace function public.is_guest_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id and user_id is null
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.owns_order(uuid) from public;
revoke all on function public.is_guest_order(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_order(uuid) to authenticated;
grant execute on function public.is_guest_order(uuid) to anon;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "orders: invitados crean" on public.orders;
drop policy if exists "orders: usuarios crean propios" on public.orders;
drop policy if exists "orders: usuarios leen propios y admins todos" on public.orders;
drop policy if exists "orders: admins actualizan" on public.orders;
drop policy if exists "orders: admins eliminan" on public.orders;
drop policy if exists "order_items: invitados crean" on public.order_items;
drop policy if exists "order_items: usuarios crean propios" on public.order_items;
drop policy if exists "order_items: usuarios leen propios y admins todos" on public.order_items;
drop policy if exists "order_items: admins actualizan" on public.order_items;
drop policy if exists "order_items: admins eliminan" on public.order_items;
drop policy if exists "store_settings: lectura pública" on public.store_settings;
drop policy if exists "store_settings: admins insertan" on public.store_settings;
drop policy if exists "store_settings: admins actualizan" on public.store_settings;
drop policy if exists "store_settings: admins eliminan" on public.store_settings;

-- Una compra anónima debe tener user_id NULL. Una sesión autenticada sólo
-- puede crear pedidos asociados a sí misma; el backend nunca acepta user_id
-- desde el formulario.
create policy "orders: invitados crean"
  on public.orders for insert to anon
  with check (user_id is null and status = 'pendiente');

create policy "orders: usuarios crean propios"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "orders: usuarios leen propios y admins todos"
  on public.orders for select to authenticated
  using (public.owns_order(id) or public.is_admin());

create policy "orders: admins actualizan"
  on public.orders for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders: admins eliminan"
  on public.orders for delete to authenticated
  using (public.is_admin());

-- La orden padre valida la pertenencia. Los invitados sólo pueden insertar
-- ítems en órdenes guest (sin lectura pública); usuarios registrados sólo en
-- sus propias órdenes; las escrituras posteriores quedan reservadas al admin.
create policy "order_items: invitados crean"
  on public.order_items for insert to anon
  with check (public.is_guest_order(order_id));

create policy "order_items: usuarios crean propios"
  on public.order_items for insert to authenticated
  with check (public.owns_order(order_id) or public.is_admin());

create policy "order_items: usuarios leen propios y admins todos"
  on public.order_items for select to authenticated
  using (public.owns_order(order_id) or public.is_admin());

create policy "order_items: admins actualizan"
  on public.order_items for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items: admins eliminan"
  on public.order_items for delete to authenticated
  using (public.is_admin());

-- La tienda pública necesita estos valores para navbar, hero, footer,
-- checkout y contacto. Sólo un administrador puede crear/modificar/borrar.
create policy "store_settings: lectura pública"
  on public.store_settings for select to anon, authenticated
  using (true);

create policy "store_settings: admins insertan"
  on public.store_settings for insert to authenticated
  with check (public.is_admin());

create policy "store_settings: admins actualizan"
  on public.store_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "store_settings: admins eliminan"
  on public.store_settings for delete to authenticated
  using (public.is_admin());

-- Índices para las consultas de cuenta/admin y el join manual de ítems.
create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc)
  where user_id is not null;
create index if not exists order_items_order_id_idx on public.order_items (order_id);

commit;
