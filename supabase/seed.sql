-- ─────────────────────────────────────────────────────────────
-- SEED · Datos iniciales de Angelo Mio
--
-- Correr DESPUÉS de las migraciones (001 a 008), una sola vez, en el
-- SQL Editor de Supabase o con `supabase db reset`.
--
-- Este archivo NO crea productos. El sistema está diseñado para
-- administrarlos desde /admin/productos y cargar productos falsos sólo
-- ensuciaría la tienda con cosas que después hay que borrar a mano. Al
-- final del archivo hay un bloque de PRUEBA, comentado y claramente
-- marcado como DEMO, por si querés ver la grilla con contenido antes de
-- cargar el catálogo real.
--
-- Es idempotente: `on conflict (slug) do nothing`. Si ya cargaste
-- categorías con estos slugs, no se pisan.
-- ─────────────────────────────────────────────────────────────

-- ── Categorías ───────────────────────────────────────────────
-- El orden define cómo aparecen en el header y en los filtros.
insert into public.categories (name, slug, "order") values
  ('Novedades',    'novedades',    1),
  ('Indumentaria', 'indumentaria', 2),
  ('Jeans',        'jeans',        3),
  ('Remeras',      'remeras',      4),
  ('Camisas',      'camisas',      5),
  ('Accesorios',   'accesorios',   6),
  ('Sale',         'sale',         7)
on conflict (slug) do nothing;

-- ── Configuración de la tienda ───────────────────────────────
-- Si la migración 008 ya la creó, esto no hace nada.
insert into public.store_settings (store_name, welcome_text, whatsapp_number, payment_methods)
select 'Angelo Mio', 'Básicos para todos los días.', '', array['transferencia', 'mercado_pago']
where not exists (select 1 from public.store_settings);

-- ─────────────────────────────────────────────────────────────
-- DEMO / SEED DE PRUEBA — DESCOMENTAR SÓLO PARA PROBAR
--
-- Crea un producto de ejemplo con variantes de talle y color para ver
-- cómo se comportan la grilla, los filtros y la ficha de producto.
-- BORRALO antes de salir a producción: se identifica por el SKU
-- 'DEMO-001' y el slug 'jean-wide-leg-demo'.
--
-- Para eliminarlo después:
--   delete from public.products where sku = 'DEMO-001';
--   (las imágenes y variantes se van solas por ON DELETE CASCADE)
--
-- do $$
-- declare
--   demo_category_id text;
--   demo_product_id uuid;
-- begin
--   select id::text into demo_category_id from public.categories where slug = 'jeans';
--
--   insert into public.products
--     (slug, name, description, price, sku, category_id, stock, featured, status)
--   values (
--     'jean-wide-leg-demo',
--     'Jean Wide Leg (DEMO)',
--     'Producto de demostración. Borrar antes de publicar la tienda.',
--     89000, 'DEMO-001', coalesce(demo_category_id, ''), 12, true, 'active'
--   )
--   on conflict (slug) do nothing
--   returning id into demo_product_id;
--
--   if demo_product_id is not null then
--     insert into public.product_variants (product_id, size, color, stock) values
--       (demo_product_id, '36', 'Azul', 3),
--       (demo_product_id, '38', 'Azul', 4),
--       (demo_product_id, '40', 'Azul', 5),
--       (demo_product_id, '38', 'Negro', 2);
--   end if;
-- end $$;
-- ─────────────────────────────────────────────────────────────
