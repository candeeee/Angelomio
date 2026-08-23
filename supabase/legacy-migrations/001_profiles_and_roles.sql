-- ─────────────────────────────────────────────────────────────
-- Migración: sistema de roles (profiles)
-- Correr en el SQL Editor de Supabase, o vía `supabase db push`.
-- ─────────────────────────────────────────────────────────────

-- 1. Tipo de rol
create type public.user_role as enum ('user', 'staff', 'admin', 'owner');

-- 2. Tabla de perfiles (1:1 con auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede leer su propio perfil.
create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Un usuario puede actualizar su propio perfil, PERO nunca su columna `role`.
-- (el cambio de rol se hace a mano desde el dashboard de Supabase o con
-- una función con permisos elevados, nunca desde el cliente).
create policy "Los usuarios pueden editar su propio perfil (sin rol)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (role) on public.profiles from authenticated;

-- Admin/owner pueden leer todos los perfiles (para /admin/clientes, /admin/configuracion).
create policy "Admins pueden ver todos los perfiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'owner')
    )
  );

-- 3. Trigger: al crear un usuario en auth.users, crear su perfil con role='user'.
-- El nombre se toma de `raw_user_meta_data.name` (lo mandamos desde el
-- signUp del cliente vía `options: { data: { name } }`).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    'user' -- SIEMPRE 'user'. El rol de admin se asigna manualmente después.
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Para convertir a alguien en administrador:
--
--   update public.profiles set role = 'admin' where email = 'alguien@email.com';
--
-- La próxima vez que esa persona inicie sesión, AuthContext vuelve a
-- leer su perfil y `isAdmin` pasa a true automáticamente.
-- ─────────────────────────────────────────────────────────────
