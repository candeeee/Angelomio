-- ─────────────────────────────────────────────────────────────
-- 008 · Rebrand Good Night Good Vibes → Angelo Mio
--
-- Esta es la ÚNICA migración que toca datos, y lo hace de la forma más
-- conservadora posible.
--
-- Qué NO hace, a propósito:
--   · No borra productos, categorías, pedidos ni usuarios.
--   · No renombra ni elimina categorías existentes (las de blanquería
--     las decidís vos desde /admin/categorias; borrarlas dejaría
--     productos con un category_id huérfano, porque no hay FK real).
--   · No toca ninguna fila que ya haya sido personalizada.
--
-- Qué hace:
--   · Deja el nombre y el texto de bienvenida de la tienda en Angelo
--     Mio, pero SÓLO si todavía dicen "Good Night Good Vibes" o están
--     vacíos. Si ya los editaste desde el panel, no los pisa.
--   · Crea la fila de configuración si la tabla está vacía.
--
-- Es idempotente: correrla dos veces da el mismo resultado.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Crear la fila de configuración si no existe ───────────
insert into public.store_settings (store_name, welcome_text, whatsapp_number)
select 'Angelo Mio', 'Básicos para todos los días.', ''
where not exists (select 1 from public.store_settings);

-- ── 2. Actualizar el branding sólo si sigue siendo el viejo ──
update public.store_settings
set store_name = 'Angelo Mio'
where store_name is null
   or btrim(store_name) = ''
   or store_name ilike '%good night%';

update public.store_settings
set welcome_text = 'Básicos para todos los días.'
where welcome_text is null
   or btrim(welcome_text) = ''
   or welcome_text ilike '%textiles de hogar%'
   or welcome_text ilike '%tus noches%';

-- El banner de Good Night Good Vibes era una foto de stock de ropa de
-- cama: con la marca nueva es directamente una imagen equivocada. Se
-- limpia sólo si es esa URL de Unsplash; una foto propia no se toca.
-- Con el banner vacío el hero muestra un placeholder neutro hasta que
-- cargues la fotografía de Angelo Mio.
update public.store_settings
set banner_url = null
where banner_url ilike '%images.unsplash.com%';

-- ─────────────────────────────────────────────────────────────
-- LO QUE QUEDA EN TUS MANOS (no se automatiza porque depende de datos
-- que sólo vos conocés):
--
--   · Categorías viejas de blanquería: revisalas en /admin/categorias.
--     Si tenés productos asociados, reasignalos ANTES de borrar la
--     categoría — `products.category_id` es TEXT sin FK, así que
--     Postgres no te va a frenar y quedarían huérfanos.
--
--   · WhatsApp e Instagram: cargalos en /admin/configuracion.
--
--   · Productos de la tienda anterior: si ya no se venden, ocultalos
--     (status='hidden') en vez de borrarlos. Si tienen ventas, el panel
--     los archiva solo al intentar eliminarlos y el historial de
--     pedidos queda intacto.
--
--   · Números de pedido: los emitidos conservan su prefijo GNGV-####.
--     Los nuevos salen como AM-####. No se reescriben los históricos:
--     son el identificador con el que el cliente ya tiene su factura.
-- ─────────────────────────────────────────────────────────────
