-- ─────────────────────────────────────────────────────────────
-- 007 · Supabase Storage para imágenes de producto
--
-- Equivalente a la antigua 006_product_images_storage.sql (ver
-- supabase/legacy-migrations/), con el prefijo de tenant actualizado a
-- Angelo Mio en la documentación.
--
-- No toca ninguna tabla ni policy de las migraciones anteriores: lo
-- único que se guarda en la base sigue siendo la URL pública en
-- `product_images.url`.
--
-- ORGANIZACIÓN:
--   bucket:  store-assets   (único, público, compartido)
--   path:    {tenantId}/products/{uuid}.{ext}
--   ejemplo: angelo-mio/products/8f0c1b2e-....webp
--
-- El tenant va PRIMERO en el path porque las policies de Storage se
-- escriben sobre `storage.objects.name` y `(storage.foldername(name))[1]`
-- es la forma canónica de aislar un tenant. Si algún día hay varias
-- tiendas, alcanza con agregar una condición a las policies de abajo.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Bucket ────────────────────────────────────────────────
-- `public = true` afecta sólo a la LECTURA: el contenido es catálogo,
-- se muestra a cualquier visitante y se sirve por CDN. Quién puede
-- ESCRIBIR lo definen las policies de más abajo.
--
-- El límite de tamaño y los MIME duplican a propósito lo que ya valida
-- la app (lib/image-upload.ts): la validación del cliente es UX, esta
-- es la última barrera y vale aunque alguien invoque la Server Action
-- a mano.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-assets',
  'store-assets',
  true,
  5242880, -- 5 MB, igual que MAX_IMAGE_BYTES
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do nothing;

-- ── 2. Policies sobre storage.objects ────────────────────────
drop policy if exists "Lectura pública de store-assets"    on storage.objects;
drop policy if exists "Solo admins suben a store-assets"   on storage.objects;
drop policy if exists "Solo admins actualizan store-assets" on storage.objects;
drop policy if exists "Solo admins borran de store-assets" on storage.objects;

-- No tendría sentido publicar la URL en la tienda y que la imagen diera
-- 403.
create policy "Lectura pública de store-assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'store-assets');

create policy "Solo admins suben a store-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'store-assets' and public.is_admin());

create policy "Solo admins actualizan store-assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'store-assets' and public.is_admin())
  with check (bucket_id = 'store-assets' and public.is_admin());

create policy "Solo admins borran de store-assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'store-assets' and public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- MULTI-TENANT (a futuro): cuando exista una tabla `tenants` y los
-- perfiles tengan `tenant_id`, el cambio es agregar UNA condición a las
-- tres policies de escritura, sin migrar un solo archivo:
--
--   and (storage.foldername(name))[1] = public.current_tenant_id()
-- ─────────────────────────────────────────────────────────────
