-- ─────────────────────────────────────────────────────────────
-- 006 · Row Level Security para todo el esquema
--
-- Unifica y reemplaza las antiguas 003 (que existía DOS veces con dos
-- criterios distintos), 004 y 005 — ver supabase/legacy-migrations/.
--
-- HALLAZGO IMPORTANTE DE LA AUDITORÍA: `categories`, `products` y
-- `product_variants` NO tenían RLS en ninguna migración. Con RLS
-- desactivado, PostgREST responde según los GRANT por defecto de
-- Supabase, así que cualquiera con la anon key (que es pública, viaja
-- en el bundle del navegador) podía escribir el catálogo. Esta
-- migración lo cierra.
--
-- Criterio general:
--   - Catálogo y configuración → lectura para todos, escritura sólo
--     admin. La tienda pública lee con el cliente anónimo
--     (lib/supabase/public.ts), así que el SELECT tiene que estar
--     abierto o el sitio queda vacío.
--   - Pedidos → cada quien ve los suyos; el admin ve todos.
--
-- Todo el archivo es idempotente: `drop policy if exists` antes de cada
-- `create policy`, así que se puede re-correr sin errores de duplicado.
-- ─────────────────────────────────────────────────────────────

-- `is_admin()` se define en 002. Se vuelve a declarar acá para que este
-- archivo sea autocontenido (create or replace no rompe nada si ya
-- existe con el mismo cuerpo).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.store_settings    enable row level security;

-- ═════════════════════════════════════════════════════════════
-- CATEGORÍAS
-- ═════════════════════════════════════════════════════════════
drop policy if exists "categories: lectura pública"  on public.categories;
drop policy if exists "categories: admins insertan"  on public.categories;
drop policy if exists "categories: admins actualizan" on public.categories;
drop policy if exists "categories: admins eliminan"  on public.categories;

create policy "categories: lectura pública"
  on public.categories for select to anon, authenticated using (true);

create policy "categories: admins insertan"
  on public.categories for insert to authenticated with check (public.is_admin());

create policy "categories: admins actualizan"
  on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "categories: admins eliminan"
  on public.categories for delete to authenticated using (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- PRODUCTOS
--
-- El SELECT anónimo devuelve TODO, incluidos los ocultos. No es un
-- descuido: el filtro `status = 'active'` lo aplica la propia consulta
-- en getPublicProducts(). Restringirlo también por policy rompería
-- /admin/productos, que necesita ver los ocultos y consulta con la
-- sesión del admin. Un producto oculto no expone nada sensible (nombre
-- y precio), pero si preferís que ni siquiera se pueda listar, al final
-- del archivo está la variante más estricta, comentada.
-- ═════════════════════════════════════════════════════════════
drop policy if exists "products: lectura pública"   on public.products;
drop policy if exists "products: admins insertan"   on public.products;
drop policy if exists "products: admins actualizan" on public.products;
drop policy if exists "products: admins eliminan"   on public.products;

create policy "products: lectura pública"
  on public.products for select to anon, authenticated using (true);

create policy "products: admins insertan"
  on public.products for insert to authenticated with check (public.is_admin());

create policy "products: admins actualizan"
  on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "products: admins eliminan"
  on public.products for delete to authenticated using (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- IMÁGENES DE PRODUCTO
-- ═════════════════════════════════════════════════════════════
drop policy if exists "Cualquiera puede ver imágenes de productos" on public.product_images;
drop policy if exists "Solo admins insertan imágenes"   on public.product_images;
drop policy if exists "Solo admins actualizan imágenes" on public.product_images;
drop policy if exists "Solo admins borran imágenes"     on public.product_images;
drop policy if exists "product_images: lectura pública"   on public.product_images;
drop policy if exists "product_images: admins insertan"   on public.product_images;
drop policy if exists "product_images: admins actualizan" on public.product_images;
drop policy if exists "product_images: admins eliminan"   on public.product_images;

create policy "product_images: lectura pública"
  on public.product_images for select to anon, authenticated using (true);

create policy "product_images: admins insertan"
  on public.product_images for insert to authenticated with check (public.is_admin());

create policy "product_images: admins actualizan"
  on public.product_images for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_images: admins eliminan"
  on public.product_images for delete to authenticated using (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- VARIANTES (talle / color / stock)
-- ═════════════════════════════════════════════════════════════
drop policy if exists "product_variants: lectura pública"   on public.product_variants;
drop policy if exists "product_variants: admins insertan"   on public.product_variants;
drop policy if exists "product_variants: admins actualizan" on public.product_variants;
drop policy if exists "product_variants: admins eliminan"   on public.product_variants;

create policy "product_variants: lectura pública"
  on public.product_variants for select to anon, authenticated using (true);

create policy "product_variants: admins insertan"
  on public.product_variants for insert to authenticated with check (public.is_admin());

create policy "product_variants: admins actualizan"
  on public.product_variants for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_variants: admins eliminan"
  on public.product_variants for delete to authenticated using (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- PEDIDOS
--
-- El checkout requiere sesión iniciada (app/checkout/actions.ts corta
-- antes si no hay usuario), así que NO hay policy de insert para `anon`.
-- ═════════════════════════════════════════════════════════════
drop policy if exists "Cualquiera puede crear pedidos"          on public.orders;
drop policy if exists "Usuarios autenticados crean sus pedidos" on public.orders;
drop policy if exists "Usuarios ven sus propios pedidos"        on public.orders;
drop policy if exists "Admins ven todos los pedidos"            on public.orders;
drop policy if exists "Solo admins actualizan pedidos"          on public.orders;
drop policy if exists "Solo admins borran pedidos"              on public.orders;
drop policy if exists "orders: invitados crean"                 on public.orders;
drop policy if exists "orders: usuarios crean propios"          on public.orders;
drop policy if exists "orders: usuarios leen propios y admins todos" on public.orders;
drop policy if exists "orders: admins actualizan"               on public.orders;
drop policy if exists "orders: admins eliminan"                 on public.orders;

-- Un usuario sólo puede crear pedidos a su propio nombre: el `user_id`
-- lo pone el servidor desde la sesión, nunca el formulario.
create policy "orders: usuarios crean propios"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid());

create policy "orders: usuarios leen propios y admins todos"
  on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "orders: admins actualizan"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "orders: admins eliminan"
  on public.orders for delete to authenticated using (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- ÍTEMS DE PEDIDO
-- No tienen dueño propio: se resuelve todo a través del pedido padre.
-- ═════════════════════════════════════════════════════════════
drop policy if exists "Insertar items de un pedido propio" on public.order_items;
drop policy if exists "Ver items de pedidos visibles"      on public.order_items;
drop policy if exists "Solo admins actualizan items"       on public.order_items;
drop policy if exists "Solo admins borran items"           on public.order_items;
drop policy if exists "order_items: invitados crean"       on public.order_items;
drop policy if exists "order_items: usuarios crean propios" on public.order_items;
drop policy if exists "order_items: usuarios leen propios y admins todos" on public.order_items;
drop policy if exists "order_items: admins actualizan"     on public.order_items;
drop policy if exists "order_items: admins eliminan"       on public.order_items;

create policy "order_items: usuarios crean propios"
  on public.order_items for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "order_items: usuarios leen propios y admins todos"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "order_items: admins actualizan"
  on public.order_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "order_items: admins eliminan"
  on public.order_items for delete to authenticated using (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DE LA TIENDA
--
-- Lectura pública porque Navbar, Hero, Footer, Contacto y Checkout
-- necesitan el nombre, el banner y el WhatsApp para CUALQUIER visitante,
-- esté logueado o no. Sólo hay información destinada a mostrarse.
-- ═════════════════════════════════════════════════════════════
drop policy if exists "Cualquiera puede leer la configuración" on public.store_settings;
drop policy if exists "Solo admins insertan configuración"     on public.store_settings;
drop policy if exists "Solo admins actualizan configuración"   on public.store_settings;
drop policy if exists "Solo admins borran configuración"       on public.store_settings;
drop policy if exists "store_settings: lectura pública"   on public.store_settings;
drop policy if exists "store_settings: admins insertan"   on public.store_settings;
drop policy if exists "store_settings: admins actualizan" on public.store_settings;
drop policy if exists "store_settings: admins eliminan"   on public.store_settings;

create policy "store_settings: lectura pública"
  on public.store_settings for select to anon, authenticated using (true);

create policy "store_settings: admins insertan"
  on public.store_settings for insert to authenticated with check (public.is_admin());

create policy "store_settings: admins actualizan"
  on public.store_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "store_settings: admins eliminan"
  on public.store_settings for delete to authenticated using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- OPCIONAL — ocultar del todo los productos no publicados.
--
-- Si querés que un producto con status='hidden' no sea ni listable con
-- la anon key, reemplazá la policy de lectura de products por esta.
-- Antes de hacerlo, comprobá que /admin/productos siga viendo los
-- ocultos: consulta con la sesión del admin, así que la segunda
-- condición es la que lo mantiene funcionando.
--
--   drop policy if exists "products: lectura pública" on public.products;
--   create policy "products: lectura pública"
--     on public.products for select to anon, authenticated
--     using (status = 'active' or public.is_admin());
--
-- Mismo criterio aplicaría a product_images y product_variants si no
-- querés exponer las fotos de un producto sin publicar.
-- ─────────────────────────────────────────────────────────────
