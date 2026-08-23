-- ─────────────────────────────────────────────────────────────
-- 002 · Perfiles, roles y alta automática de usuarios
--
-- Reemplaza y unifica las antiguas 001_profiles_and_roles.sql y
-- 002_align_profiles_schema.sql (ver supabase/legacy-migrations/).
-- Aquellas dos se contradecían: la primera creaba `profiles.name` y la
-- segunda la renombraba a `full_name` porque el código ya usaba ese
-- nombre. Acá la tabla se crea directamente con `full_name` y se deja
-- el renombre defensivo para bases viejas.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- Base que venía de GNGV con la columna vieja: se renombra en vez de
-- crear una segunda columna y perder los nombres ya cargados.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) then
    alter table public.profiles rename column name to full_name;
  end if;
end $$;

alter table public.profiles enable row level security;

-- ── Función auxiliar: ¿el usuario actual es admin? ───────────
-- SECURITY DEFINER para que consultar `profiles` desde una policy DE
-- `profiles` no dispare una recursión infinita de RLS. `search_path`
-- fijo para que no se pueda secuestrar con un schema del usuario.
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

-- ── Policies ─────────────────────────────────────────────────
drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
drop policy if exists "Los usuarios pueden editar su propio perfil (sin rol)" on public.profiles;
drop policy if exists "Admins pueden ver todos los perfiles" on public.profiles;

create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Un admin necesita ver todos los perfiles para /admin/clientes y para
-- el listado de administradores de /admin/configuracion.
create policy "Admins pueden ver todos los perfiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "Los usuarios pueden editar su propio perfil (sin rol)"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Cinturón y tiradores: la policy de arriba deja actualizar el perfil
-- propio, y este REVOKE impide que en esa actualización se toque la
-- columna `role`. Sin esto, cualquiera podría auto-ascenderse a admin.
revoke update (role) on public.profiles from authenticated;

-- ── Alta automática de perfil ────────────────────────────────
-- Se dispara al crear el usuario en auth.users. El nombre viene del
-- metadata que manda el cliente (context/AuthContext.tsx → signUp con
-- `options: { data: { full_name } }`).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    'user' -- SIEMPRE 'user'. El rol de admin se asigna a mano después.
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- PARA CONVERTIR A ALGUIEN EN ADMINISTRADOR (correr a mano una vez):
--
--   update public.profiles set role = 'admin' where email = 'vos@tuemail.com';
--
-- La próxima vez que esa persona inicie sesión, AuthContext relee su
-- perfil y `isAdmin` pasa a true. No existe forma de registrarse como
-- admin desde el formulario público.
-- ─────────────────────────────────────────────────────────────
