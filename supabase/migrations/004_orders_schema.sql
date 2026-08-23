-- ─────────────────────────────────────────────────────────────
-- 004 · Pedidos: orders y order_items
--
-- Igual que el catálogo, estas tablas nunca se creaban en ninguna
-- migración: las antiguas 003/004 solo les aplicaban RLS. Las columnas
-- salen de lib/services/orders.ts (mapRowToOrder / createOrder) y de
-- lib/services/customers.ts.
--
-- No existe tabla `customers` y no se crea: por diseño del proyecto, un
-- "cliente" es un agrupamiento de `orders` por email (ver
-- lib/services/customers.ts). Eso evita mantener dos fuentes de verdad
-- sincronizadas a mano.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  -- `on delete set null`: si se borra la cuenta, el pedido y su
  -- historial de facturación deben sobrevivir. Nullable también porque
  -- la base traía pedidos de invitado de la etapa anterior del
  -- proyecto; el checkout actual siempre exige sesión.
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  customer_address text not null default '',
  customer_notes text,
  total numeric(12, 2) not null default 0 check (total >= 0),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmado', 'preparando', 'enviado', 'entregado')),
  payment_method text
    check (payment_method is null
           or payment_method in ('transferencia', 'mercado_pago', 'efectivo', 'otro')),
  created_at timestamptz not null default now()
);

-- El número de pedido tiene que ser único: es el identificador que ve
-- el cliente y con el que reclama.
create unique index if not exists orders_number_key on public.orders (number);
create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc) where user_id is not null;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
-- El resumen de clientes agrupa por email.
create index if not exists orders_customer_email_idx on public.orders (customer_email);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- SIN cascade y SIN set null a propósito: la FK restrictiva es lo que
  -- hace que Postgres rechace borrar un producto ya vendido. El service
  -- (deleteProduct) cuenta las ventas antes y, si las hay, archiva el
  -- producto en vez de eliminarlo. Nullable para tolerar ítems
  -- históricos sin producto asociado.
  product_id uuid references public.products (id),
  name text not null,
  variant_label text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
-- deleteProduct() cuenta por product_id en cada borrado.
create index if not exists order_items_product_id_idx on public.order_items (product_id);

-- ─────────────────────────────────────────────────────────────
-- LIMITACIÓN CONOCIDA — numeración de pedidos.
--
-- `generateOrderNumber()` (lib/utils.ts) arma "AM-0001" contando los
-- pedidos existentes. Con dos checkouts simultáneos, los dos pueden
-- contar lo mismo y el segundo insert falla por el índice único de
-- arriba (mejor que emitir dos pedidos con el mismo número, que es lo
-- que pasaba sin el índice).
--
-- Si el volumen lo justifica, la solución correcta es una secuencia:
--
--   create sequence if not exists public.order_number_seq;
--   alter table public.orders
--     alter column number set default
--       'AM-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
--
-- No se activa acá porque cambiaría el comportamiento de createOrder()
-- sin haberlo pedido, y habría que arrancar la secuencia en el número
-- correcto según los pedidos ya emitidos.
-- ─────────────────────────────────────────────────────────────
