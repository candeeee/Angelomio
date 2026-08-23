-- ─────────────────────────────────────────────────────────────
-- 001 · Extensiones y tipos
--
-- Punto de entrada del esquema. Todo lo de este archivo es idempotente:
-- se puede correr sobre una base vacía o sobre la base que ya venía de
-- Good Night Good Vibes sin romper nada.
-- ─────────────────────────────────────────────────────────────

-- gen_random_uuid() viene en pgcrypto. En Supabase suele estar activa,
-- pero se pide explícitamente para que el script sirva en cualquier
-- proyecto nuevo.
create extension if not exists pgcrypto with schema extensions;

-- ── Rol de usuario ───────────────────────────────────────────
-- El código solo usa 'user' y 'admin' (ver lib/types.ts y middleware.ts).
-- 'staff' y 'owner' se mantienen porque ya existían en la base de GNGV:
-- achicar un enum en Postgres obliga a recrear el tipo y reescribir la
-- tabla, y no aporta nada mientras el código no los use.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('user', 'staff', 'admin', 'owner');
  end if;
end $$;

-- Si el tipo ya existía con menos valores (por ejemplo, una base creada
-- a mano solo con 'user' y 'admin'), se completan los que falten.
do $$
declare
  missing text;
begin
  foreach missing in array array['user', 'staff', 'admin', 'owner'] loop
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' and e.enumlabel = missing
    ) then
      execute format('alter type public.user_role add value %L', missing);
    end if;
  end loop;
end $$;

-- NOTA SOBRE LOS DEMÁS ESTADOS (status de producto, estado de pedido,
-- medio de pago): se implementan como TEXT + CHECK, no como enums.
-- Motivo concreto: agregar un estado de pedido nuevo con un enum exige
-- ALTER TYPE (que no corre dentro de una transacción con otros DDL en
-- versiones viejas de Postgres) mientras que con un CHECK es un simple
-- ALTER TABLE. Los valores permitidos son exactamente los de
-- lib/order-status.ts y lib/types.ts.
