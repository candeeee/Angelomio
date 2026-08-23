# Migraciones anteriores (Good Night Good Vibes)

Estos archivos **ya no se ejecutan**. Se conservan como registro
histórico de las decisiones tomadas durante el desarrollo de Good Night
Good Vibes.

Se los movió fuera de `supabase/migrations/` por tres motivos concretos
encontrados durante la auditoría:

1. **No permitían levantar el proyecto desde cero.** Sólo creaban
   `profiles`. Las migraciones 003, 004 y 005 aplicaban `ALTER TABLE` y
   policies sobre `products`, `orders`, `order_items`, `store_settings`
   y `product_images`, tablas que ningún archivo creaba. En un proyecto
   nuevo de Supabase, la ejecución fallaba en el tercer archivo.

2. **Había dos migraciones `003_` distintas y contradictorias**
   (`003_orders_and_store_settings_rls.sql` y
   `003_orders_settings_rls.sql`). Una asumía checkout de invitado y la
   otra no. Al correr la carpeta en orden alfabético, la segunda pisaba
   a la primera.

3. **Faltaba la columna `products.archived_at`**, que el código escribe
   desde `deleteProduct()`. Un comentario mencionaba una "migración 007"
   que nunca se escribió.

El contenido válido de todos estos archivos está incorporado al set
nuevo de `supabase/migrations/`, que es idempotente y se puede correr
tanto sobre una base vacía como sobre la base que ya venía funcionando.

Si tu base **ya tenía** estas migraciones aplicadas, no hace falta que
hagas nada especial: corré el set nuevo igual. Todo usa
`create table if not exists`, `add column if not exists` y
`drop policy if exists`, así que sobre lo que ya existe no hace cambios.
