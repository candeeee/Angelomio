-- ─────────────────────────────────────────────────────────────
-- Migración: alinear `profiles` con lo que el código real espera.
--
-- Contexto (encontrado en la auditoría):
--   - 001_profiles_and_roles.sql creó `profiles.name` y un enum de 4
--     roles ('user','staff','admin','owner').
--   - El código actual (lib/types.ts, AuthContext.tsx, middleware.ts)
--     ya usa `profiles.full_name` y un modelo de 2 roles ('user','admin').
--   - Esto sugiere que en algún momento se corrió un ALTER manual sobre
--     la base real que no quedó reflejado en un archivo de migración.
--
-- Esta migración es defensiva e idempotente: se puede correr tanto si
-- tu base todavía tiene `name` (la deja como `full_name`) como si ya
-- la corriste a mano (no hace nada y no rompe nada).
--
-- Los valores de enum 'staff' y 'owner' NO se eliminan acá a propósito:
-- reducir un enum en Postgres implica recrear el tipo (rewrite de tabla)
-- y no aporta nada mientras el código no los use — quedan como reserva
-- por si en el futuro se reintroduce ese nivel de permisos.
-- ─────────────────────────────────────────────────────────────

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

-- Actualiza el trigger de creación de perfil para usar `full_name` y
-- leer el metadata que manda el cliente como `full_name` (ver
-- context/AuthContext.tsx → signUp envía `options: { data: { full_name } }`).
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
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user' -- SIEMPRE 'user'. El rol de admin se asigna manualmente después.
  );
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE — verificar antes de correr en producción:
--
-- Este archivo asume que tu tabla real tiene una columna `name` para
-- renombrar, o ya tiene `full_name`. No pude leer tu esquema real desde
-- este entorno, así que antes de correr esto en tu proyecto:
--
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles';
--
-- y confirmá que el resultado coincide con lo que este script asume.
-- ─────────────────────────────────────────────────────────────
