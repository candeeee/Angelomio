-- ─────────────────────────────────────────────────────────────
-- 003 · Catálogo: categories, products, product_images, product_variants
--
-- ESTA MIGRACIÓN NO EXISTÍA. Las migraciones antiguas solo creaban
-- `profiles` y después hacían ALTER/policies sobre tablas de catálogo
-- que nunca se creaban en ningún archivo — o sea, el proyecto no se
-- podía levantar desde cero en un Supabase nuevo.
--
-- Las columnas de acá NO son inventadas: salen de lo que el código lee
-- y escribe realmente (lib/services/products.ts, categories.ts y
-- lib/types.ts). Todo es `if not exists`, así que sobre la base que ya
-- venía funcionando esta migración no toca nada.
-- ─────────────────────────────────────────────────────────────

-- ── categories ───────────────────────────────────────────────
-- Ojo: `order` es palabra reservada en SQL. Va siempre entre comillas
-- dobles. El código la consulta como `.order("order")` vía PostgREST.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  "order" integer not null default 0,
  image text,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_slug_key on public.categories (slug);
create index if not exists categories_order_idx on public.categories ("order");

-- ── products ─────────────────────────────────────────────────
--
-- LIMITACIÓN CONOCIDA Y DELIBERADA: `category_id` es TEXT, no una FK a
-- categories.id. Así estaba en la base de Good Night Good Vibes y así
-- lo documenta lib/services/products.ts, que por eso resuelve la
-- categoría en memoria en vez de con un join de PostgREST.
--
-- No se convierte a uuid+FK en esta migración a propósito: sería un
-- cambio destructivo si algún producto tuviera '' o un id huérfano, y
-- la consigna es no romper datos existentes. Al final del archivo queda
-- el script de conversión, comentado, para cuando quieras hacerlo con
-- la base a la vista.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  sku text not null default '',
  category_id text not null default '',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  status text not null default 'active' check (status in ('active', 'hidden')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- `archived_at` FALTABA EN LA BASE. lib/services/products.ts la escribe
-- en deleteProduct() (soft delete de productos con ventas) y la limpia
-- en restoreProduct(); un comentario del código decía que se agregaba
-- en "la migración 007", que nunca se escribió. Sin esta columna, el
-- borrado de un producto vendido falla.
alter table public.products add column if not exists archived_at timestamptz;

create unique index if not exists products_slug_key on public.products (slug);
create index if not exists products_status_created_at_idx
  on public.products (status, created_at desc);
create index if not exists products_category_id_idx on public.products (category_id);
-- Índice parcial: la home filtra por destacados y son pocos.
create index if not exists products_featured_idx
  on public.products (featured) where featured;

-- ── product_images ───────────────────────────────────────────
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- Sin este índice, cada carga del catálogo hace un seq scan de la tabla
-- de imágenes (el service las trae con `in("product_id", ids)`).
create index if not exists product_images_product_id_order_idx
  on public.product_images (product_id, "order");

-- ── product_variants ─────────────────────────────────────────
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text,
  color text,
  stock integer not null default 0 check (stock >= 0),
  sku_suffix text,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);

-- ─────────────────────────────────────────────────────────────
-- OPCIONAL — convertir category_id en una FK real.
--
-- NO ejecutar a ciegas. Antes hay que verificar que no haya productos
-- con un category_id vacío o inexistente:
--
--   select id, name, category_id from public.products p
--   where p.category_id !~ '^[0-9a-f-]{36}$'
--      or not exists (select 1 from public.categories c
--                     where c.id::text = p.category_id);
--
-- Recién con ese resultado en cero:
--
--   alter table public.products
--     alter column category_id drop default,
--     alter column category_id type uuid using category_id::uuid;
--   alter table public.products
--     add constraint products_category_id_fkey
--     foreign key (category_id) references public.categories (id)
--     on delete restrict;
--
-- Y después hay que ajustar lib/services/products.ts, porque el mapeo
-- actual asume TEXT. Por eso queda comentado y no como parte de la
-- migración.
-- ─────────────────────────────────────────────────────────────
