-- ─────────────────────────────────────────────────────────────
-- RLS para product_images.
--
-- Contexto: hasta esta versión, product_images solo se LEÍA (join de
-- solo lectura en getProducts()/getPublicProducts()). El panel de
-- admin ahora también ESCRIBE ahí (drag&drop de imágenes en
-- /admin/productos), así que por primera vez hace falta que existan
-- policies de insert/delete — si `product_images` tiene RLS habilitado
-- sin policies (mismo patrón que nos pasó con orders/store_settings),
-- vas a ver el mismo error: "new row violates row-level security
-- policy for table product_images".
--
-- Si tu tabla `product_images` NO tiene RLS habilitado (o ya tiene
-- policies que cubren esto), no hace falta correr este archivo — no es
-- destructivo pero tampoco es necesario en ese caso.
-- ─────────────────────────────────────────────────────────────

alter table public.product_images enable row level security;

-- Reusa la función is_admin() ya creada en
-- 004_orders_store_settings_rls.sql. Si por algún motivo corrés este
-- archivo antes que aquel, se recrea acá también (create or replace es
-- idempotente, no rompe nada si ya existe).
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

drop policy if exists "Cualquiera puede ver imágenes de productos" on public.product_images;
drop policy if exists "Solo admins insertan imágenes" on public.product_images;
drop policy if exists "Solo admins actualizan imágenes" on public.product_images;
drop policy if exists "Solo admins borran imágenes" on public.product_images;

-- Lectura pública: las imágenes de producto se muestran a cualquier
-- visitante en la tienda, sin necesidad de sesión.
create policy "Cualquiera puede ver imágenes de productos"
  on public.product_images for select
  to anon, authenticated
  using (true);

create policy "Solo admins insertan imágenes"
  on public.product_images for insert
  to authenticated
  with check (public.is_admin());

create policy "Solo admins actualizan imágenes"
  on public.product_images for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Solo admins borran imágenes"
  on public.product_images for delete
  to authenticated
  using (public.is_admin());
