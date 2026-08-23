-- ─────────────────────────────────────────────────────────────
-- 005 · Configuración de la tienda
--
-- Fila única con el branding y los datos de contacto que consumen
-- Navbar, Hero, Footer, Contacto, Envíos y Checkout.
-- Columnas tomadas de lib/services/store-settings.ts (StoreSettingsRow
-- y el payload de upsertStoreSettings).
--
-- `tiktok` y `primary_color` existen en el tipo TypeScript pero el
-- service NO los lee ni los escribe, así que no se crean columnas para
-- ellos: sería agregar estructura que nadie administra.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default '',
  logo_url text,
  banner_url text,
  welcome_text text,
  whatsapp_number text not null default '',
  instagram text,
  facebook text,
  payment_methods text[] not null default '{}',
  shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  shipping_zones text[] not null default '{}',
  shipping_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El service lee con `.limit(1).maybeSingle()` y escribe con insert (si
-- no hay id) o update: da por sentado que hay UNA sola fila. Este
-- índice lo hace cumplir de verdad, en vez de confiar en que nadie
-- inserte una segunda desde el dashboard de Supabase.
--
-- Se crea sólo si la base todavía no tiene dos o más filas: si ya las
-- tuviera, crearlo fallaría y cortaría la migración entera. En ese caso
-- se avisa por consola y se deja la decisión de cuál conservar a quien
-- conoce los datos.
do $$
declare
  row_count integer;
begin
  select count(*) into row_count from public.store_settings;
  if row_count <= 1 then
    create unique index if not exists store_settings_singleton_idx
      on public.store_settings ((true));
  else
    raise notice 'store_settings tiene % filas: no se creó el índice de fila única. Dejá una sola y volvé a correr esta migración.', row_count;
  end if;
end $$;

-- `updated_at` se mantiene solo. El service no lo setea y no se lo
-- obliga a hacerlo: es información de auditoría, no de negocio.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_settings_touch_updated_at on public.store_settings;
create trigger store_settings_touch_updated_at
  before update on public.store_settings
  for each row execute procedure public.touch_updated_at();
