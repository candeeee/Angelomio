-- ─────────────────────────────────────────────────────────────
-- Supabase Storage para imágenes de producto.
--
-- Contexto: hasta esta versión las imágenes se cargaban pegando una
-- URL a mano (cualquier URL pública: Unsplash, un storage externo, un
-- archivo subido al dashboard de Supabase). Ahora el panel sube los
-- archivos desde la computadora del admin, así que por primera vez la
-- app ESCRIBE en Storage y hacen falta bucket + policies.
--
-- Esta migración NO toca ninguna tabla existente, ninguna policy
-- existente ni el esquema de `product_images`: lo único que se guarda
-- en la base sigue siendo la URL pública, exactamente igual que antes.
-- Es 100% aditiva y se puede re-correr sin romper nada (todo es
-- `on conflict do nothing` / `drop policy if exists`).
--
-- DECISIÓN DE ORGANIZACIÓN (justificada en detalle en el README):
--   bucket:  store-assets   (único, público, compartido)
--   path:    {tenantId}/products/{uuid}.{ext}
--   ejemplo: gngv/products/8f0c1b2e-....webp
-- ─────────────────────────────────────────────────────────────

-- ── 1. Bucket ────────────────────────────────────────────────
-- `public = true`: el contenido es catálogo, se muestra a cualquier
-- visitante y se sirve por CDN. La restricción de ESCRITURA no la da
-- el flag `public` (que solo afecta a la lectura), la dan las policies
-- de abajo.
--
-- `file_size_limit` y `allowed_mime_types` duplican a propósito lo que
-- ya valida la app (lib/image-upload.ts): la validación del cliente es
-- UX, la del servidor es correctitud, y esta es la última barrera —
-- vale aunque alguien invoque la Server Action a mano.
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
-- Reusa `public.is_admin()` (creada en 004 y recreada en 005). Se
-- vuelve a declarar acá para que este archivo sea autocontenido:
-- `create or replace` es idempotente y no rompe nada si ya existe.
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

drop policy if exists "Lectura pública de store-assets" on storage.objects;
drop policy if exists "Solo admins suben a store-assets" on storage.objects;
drop policy if exists "Solo admins actualizan store-assets" on storage.objects;
drop policy if exists "Solo admins borran de store-assets" on storage.objects;

-- Lectura: cualquiera. Es lo mismo que ya permite la policy de select
-- de `product_images` — no tendría sentido publicar la URL en la
-- tienda y que la imagen diera 403.
create policy "Lectura pública de store-assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'store-assets');

-- Escritura: solo admins.
--
-- NOTA MULTI-TENANT (Bloom Shop Pro): hoy `is_admin()` es global
-- porque hay una sola tienda. Cuando exista la tabla `tenants` y los
-- perfiles tengan `tenant_id`, el cambio es agregar UNA condición a
-- estas tres policies, sin migrar un solo archivo:
--
--   and (storage.foldername(name))[1] = public.current_tenant_id()
--
-- Por eso el tenant es el PRIMER segmento del path: queda accesible
-- con `(storage.foldername(name))[1]` sin parsear strings a mano.
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
