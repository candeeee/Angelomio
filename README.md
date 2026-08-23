# Angelo Mio — Ecommerce

Tienda online de **Angelo Mio**, marca argentina de indumentaria y
accesorios. Catálogo público, carrito, checkout con cuenta y un panel de
administración completo para gestionar productos, categorías, stock,
imágenes, pedidos y clientes.

El proyecto nació como *Good Night Good Vibes* (blanquería) y fue
transformado a Angelo Mio conservando toda la arquitectura y la lógica
existentes. El detalle de esa transformación está al final de este
documento, en [Migración Good Night Good Vibes → Angelo
Mio](#migración-good-night-good-vibes--angelo-mio).

---

## Índice

- [Stack](#stack)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Configurar Supabase](#configurar-supabase)
- [Migraciones](#migraciones)
- [Desarrollo](#desarrollo)
- [Build](#build)
- [Producción](#producción)
- [Panel administrativo](#panel-administrativo)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura y reglas del código](#arquitectura-y-reglas-del-código)
- [Identidad visual](#identidad-visual)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Migración Good Night Good Vibes → Angelo Mio](#migración-good-night-good-vibes--angelo-mio)

---

## Stack

Las tecnologías que el proyecto usa realmente (nada más que eso):

| Tecnología | Versión | Para qué |
|---|---|---|
| **Next.js** (App Router) | 14.2.5 | Framework, Server Components, Server Actions |
| **React** | 18.3 | UI |
| **TypeScript** | 5.5 | Tipado estricto (`strict` + `noUncheckedIndexedAccess`) |
| **Tailwind CSS** | 3.4 | Estilos |
| **Supabase** | `@supabase/ssr` 0.4 · `supabase-js` 2.110 | Base de datos, Auth, Storage, RLS |
| **Framer Motion** | 11.3 | Animaciones sutiles |
| **lucide-react** | 0.408 | Iconografía |
| **clsx** + **tailwind-merge** | — | Composición de clases (`cn()`) |
| **next/font** | — | DM Sans + Inter autohospedadas |

No hay librería de estado global (Zustand figura en `package.json` pero
ningún archivo lo importa), ni ORM, ni librería de formularios: el
estado vive en React Context y las mutaciones pasan por Server Actions.

---

## Instalación

Requiere **Node.js 18.17 o superior**.

```bash
git clone <tu-repositorio>
cd angelo-mio
npm install
```

Después de instalar, configurá las variables de entorno y Supabase (las
dos secciones siguientes) antes de levantar el proyecto.

---

## Variables de entorno

Copiá el archivo de ejemplo y completalo:

```bash
cp .env.example .env.local
```

### Obligatorias

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-publishable-key
```

Las dos salen de **Supabase Dashboard → Project Settings → API**. La
publishable key (antes "anon public key") es pública por diseño: viaja
en el bundle del navegador y quien protege los datos es RLS, no el
secreto de esa clave.

### Recomendada

```env
NEXT_PUBLIC_SITE_URL=https://angelomio.com
```

URL canónica del sitio. La usan `metadataBase`, `sitemap.xml` y
`robots.txt` para generar URLs absolutas. En desarrollo dejala en
`http://localhost:3000`.

### Opcional

```env
STORE_TENANT_ID=angelo-mio
```

Prefijo de carpeta dentro del bucket de Storage. Sólo hace falta tocarlo
si estás reutilizando el proyecto de Supabase de la tienda anterior —
ver [Migración](#migración-good-night-good-vibes--angelo-mio).

### Variables que **no** hace falta configurar

`SUPABASE_SERVICE_ROLE_KEY` y `ORDER_CONFIRMATION_SECRET` aparecen en
`lib/supabase/service.ts` y `lib/order-confirmation.ts`, pero **ningún
archivo importa esos módulos**: son restos del checkout de invitado, que
se quitó cuando la compra pasó a requerir sesión. Se dejaron en el repo
por si se reactiva esa funcionalidad.

`.env.local` está en `.gitignore`. **Nunca subas claves reales al
repositorio.**

---

## Configurar Supabase

### 1. Crear el proyecto

En [supabase.com](https://supabase.com) → **New project**. Anotá la
contraseña de la base y esperá a que termine de aprovisionarse.

### 2. Ejecutar las migraciones

Ver la sección [Migraciones](#migraciones). En resumen: abrí el **SQL
Editor** y corré los ocho archivos de `supabase/migrations/` en orden
numérico.

### 3. Cargar los datos iniciales

Ejecutá `supabase/seed.sql` en el SQL Editor. Crea las categorías de
Angelo Mio (Novedades, Indumentaria, Jeans, Remeras, Camisas,
Accesorios, Sale) y la fila de configuración de la tienda.

### 4. Storage

La migración `007_storage_bucket.sql` crea el bucket `store-assets`
(público, 5 MB por archivo, sólo imágenes) con sus policies. **No hay
que crear nada a mano en el dashboard.**

Verificá en **Storage** que el bucket exista después de correr la
migración.

### 5. Autenticación

En **Authentication → Providers**, dejá habilitado *Email*.

Durante el desarrollo conviene desactivar **Confirm email** (en
*Authentication → Sign In / Providers → Email*) para poder registrarte y
entrar sin pasar por la casilla de correo. En producción, activalo.

### 6. Crear el primer administrador

No existe forma de registrarse como admin desde la interfaz: el trigger
`handle_new_user()` siempre crea el perfil con rol `user`. El primer
admin se asigna a mano, una sola vez:

1. Registrate normalmente en `/registro`.
2. En el SQL Editor de Supabase:

```sql
update public.profiles
set role = 'admin'
where email = 'vos@tuemail.com';
```

3. Cerrá sesión y volvé a entrar. Ya tenés acceso a `/admin`.

### 7. Completar la configuración de la tienda

Entrá a `/admin/configuracion` y cargá el nombre, el texto de
bienvenida, el WhatsApp, el Instagram, los medios de pago y los datos de
envío. Esos valores son los que muestran el header, el hero, el footer,
la página de envíos y el checkout.

---

## Migraciones

Están en `supabase/migrations/` y **se ejecutan en orden numérico**.

| Archivo | Qué hace |
|---|---|
| `001_extensions_and_enums.sql` | Extensión `pgcrypto` y el tipo `user_role` |
| `002_profiles_and_roles.sql` | Tabla `profiles`, función `is_admin()`, policies y trigger de alta automática de perfil |
| `003_catalog_schema.sql` | `categories`, `products`, `product_images`, `product_variants` + índices |
| `004_orders_schema.sql` | `orders`, `order_items` + índices |
| `005_store_settings_schema.sql` | `store_settings` (fila única) + trigger de `updated_at` |
| `006_rls_policies.sql` | Row Level Security de **todas** las tablas |
| `007_storage_bucket.sql` | Bucket `store-assets` y sus policies |
| `008_angelo_mio_rebrand.sql` | Rebrand no destructivo de la configuración de la tienda |

Y por separado:

| Archivo | Qué hace |
|---|---|
| `supabase/seed.sql` | Categorías iniciales y configuración base. Correr **después** de las migraciones |

### Cómo ejecutarlas

**Opción A — SQL Editor (la más simple):**

Supabase Dashboard → **SQL Editor** → **New query**. Pegá el contenido
de cada archivo, de `001` a `008`, y ejecutá uno por uno. Terminá con
`seed.sql`.

**Opción B — Supabase CLI:**

```bash
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

### Son seguras de re-ejecutar

Todas usan `create table if not exists`, `add column if not exists`,
`create or replace function`, `drop policy if exists` antes de cada
`create policy` y `on conflict do nothing`. Podés correrlas dos veces
sin errores de objeto duplicado y **sin destruir datos**.

La única que toca datos es la `008`, y sólo reemplaza el branding viejo
si todavía no lo editaste (ver su comentario de cabecera).

### Migraciones anteriores

Las migraciones originales de Good Night Good Vibes están en
`supabase/legacy-migrations/`, con un README que explica por qué se
archivaron. **No se ejecutan.**

---

## Desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000`.

Otros scripts:

```bash
npm run lint       # ESLint (eslint-config-next)
npm run typecheck  # tsc --noEmit
```

> La configuración de ESLint vive en `.eslintrc.json`. Sin ese archivo,
> `npm run lint` abre un asistente interactivo en vez de correr, lo que
> lo vuelve inútil en CI.

---

## Build

```bash
npm run build
```

El build tiene que terminar **sin errores**. Si falla por variables de
entorno, revisá que `.env.local` exista y tenga las dos variables de
Supabase.

Para probar el build localmente:

```bash
npm run build && npm start
```

---

## Producción

### Vercel (recomendado)

1. Importá el repositorio en Vercel.
2. Cargá las variables de entorno en **Settings → Environment
   Variables** (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` con el
   dominio real).
3. Deploy. El framework se detecta solo.

### Otros hostings

Cualquier plataforma con Node.js sirve:

```bash
npm ci
npm run build
npm start
```

### Antes de salir a producción

- [ ] Activar **Confirm email** en Supabase Auth.
- [ ] Verificar que RLS esté habilitado en todas las tablas
      (`006_rls_policies.sql`).
- [ ] Cargar `NEXT_PUBLIC_SITE_URL` con el dominio real (si no, el
      sitemap apunta a localhost).
- [ ] Borrar el producto DEMO del seed, si lo descomentaste.
- [ ] Cargar banner, WhatsApp e Instagram en `/admin/configuracion`.
- [ ] Agregar `favicon.ico` y `opengraph-image.png` en `app/`.

---

## Panel administrativo

### Acceso

`/admin`. Protegido en dos capas:

1. **`middleware.ts`** (servidor): sin sesión redirige a
   `/login?redirect=…`; con sesión pero sin rol admin redirige a `/`.
   Nunca se entra escribiendo la URL.
2. **`app/admin/layout.tsx`** (cliente): segunda verificación por si el
   rol cambia durante la sesión.

La garantía real de los **datos** no es ninguna de las dos: es RLS. Una
Server Action se puede invocar sin pasar por el middleware, y las
policies son las que rechazan la escritura.

### Quién puede entrar

Sólo los perfiles con `role = 'admin'` (o `'owner'`). Se asigna a mano
desde el SQL Editor, como se explica arriba.

### Secciones

| Sección | Ruta | Funciones |
|---|---|---|
| **Dashboard** | `/admin` | Ventas del día y del mes, pedidos pendientes, productos con poco stock, últimos pedidos, destacados |
| **Productos** | `/admin/productos` | Crear, editar, duplicar, ocultar, eliminar/archivar. Slug editable con validación de unicidad. Gestión de imágenes con drag & drop y subida de archivos |
| **Categorías** | `/admin/categorias` | Crear, editar, eliminar y reordenar (el orden define el header y los filtros) |
| **Pedidos** | `/admin/pedidos` | Listado, detalle y cambio de estado (pendiente → confirmado → preparando → enviado → entregado) |
| **Clientes** | `/admin/clientes` | Resumen por email: cantidad de pedidos, total gastado, datos de contacto |
| **Configuración** | `/admin/configuracion` | Nombre, texto de bienvenida, WhatsApp, Instagram, medios de pago, envíos y listado de administradores |

### Gestionar productos

**Crear:** botón *Nuevo producto*. Nombre, descripción, precio, precio
anterior (activa el badge de descuento y la sección Sale), SKU,
categoría, stock, destacado y estado.

**Imágenes:** se suben desde la computadora al bucket `store-assets`. Se
arrastran para reordenar; **la primera es la portada**. Al guardar, las
imágenes que dejaste de usar se borran del bucket automáticamente —
pero sólo si son archivos propios y no las usa ningún otro producto. Una
URL externa pegada a mano nunca se toca.

**Stock:** el campo `stock` del producto es el total. Si el producto
tiene variantes de talle/color, cada variante tiene su propio stock y es
el que manda en la ficha.

**Eliminar:** el sistema decide según el dato, no según el botón.

- Producto **sin ventas** → se borra de verdad y libera el slug y el SKU.
- Producto **con ventas** → se archiva (`status = 'hidden'` +
  `archived_at`). Desaparece de la tienda, el historial de pedidos queda
  intacto y lo seguís viendo en el panel.

**Duplicar:** copia datos, imágenes y variantes. La copia se crea
**oculta** y con un slug nuevo, para que la revises antes de publicar.

### Gestionar categorías

El campo *orden* define la posición en el header y en los filtros del
catálogo. El campo *imagen* (opcional) es la foto del bloque de
categoría en la home; si no la cargás, se usa la portada de un producto
de esa categoría.

> **Cuidado al borrar:** `products.category_id` es TEXT sin foreign key
> real, así que Postgres no impide borrar una categoría con productos.
> Reasignalos primero o quedan huérfanos.

---

## Estructura del proyecto

```
app/                        Rutas (App Router)
  page.tsx                  Home
  productos/                Catálogo y ficha de producto
  favoritos/                Lista de favoritos (localStorage)
  carrito/  checkout/       Compra
  pedido-confirmado/[id]/   Confirmación
  cuenta/ login/ registro/  Sesión y pedidos del usuario
  contacto/ nosotros/       Contenido
  envios/ cambios/
  preguntas-frecuentes/
  admin/                    Panel (protegido por middleware)
  sitemap.ts  robots.ts     SEO
  globals.css               Tokens de diseño y utilidades

components/
  layout/                   Navbar, Footer, AdminSidebar, ContentPage
  home/                     Hero, HomeSections
  product/                  Card, Grid, Filters, Explorer
  cart/  checkout/          Drawer, miniatura, formulario
  admin/                    Tablas, formularios, gestor de imágenes
  ui/                       Button, Modal, FormSection, BrandLoader

context/                    AuthContext, CartContext, FavoritesContext
lib/
  services/                 Único punto de acceso a Supabase
  supabase/                 Clientes (browser, server, público, middleware)
  site.ts                   Constantes de marca
  types.ts                  Tipos del dominio
  utils.ts                  cn(), formatPrice(), slugify(), nº de pedido
  tenant.ts                 Prefijo de tenant en Storage
  image-upload.ts           Validación compartida cliente/servidor
  order-status.ts           Estados de pedido (fuente única)

supabase/
  migrations/               Migraciones vigentes (001 a 008)
  legacy-migrations/        Migraciones históricas, NO se ejecutan
  seed.sql                  Datos iniciales

docs/                       Changelog histórico del proyecto anterior
middleware.ts               Protección de /admin
```

---

## Arquitectura y reglas del código

Estas convenciones ya existían y **se mantuvieron intactas**:

**Flujo de datos, siempre en un solo sentido:**

```
Server Component → Server Action → lib/services → Supabase
```

- Ningún componente cliente consulta Supabase directamente.
- Todos los `lib/services/*` empiezan con `import "server-only"`: si
  alguien los importa desde un `"use client"`, el build falla con un
  mensaje claro en vez de filtrar credenciales.
- Toda mutación pasa por una Server Action, que invalida la caché con
  `revalidatePath()`.

**Dos clientes de Supabase, a propósito:**

- `createPublicSupabaseClient()` — sin cookies, rol `anon`. Para
  lecturas públicas del catálogo. Al no leer cookies, las páginas que
  sólo lo usan se pueden pre-renderizar como estáticas.
- `createServerSupabaseClient()` — con cookies. Para todo lo que dependa
  de quién está logueado, para que RLS se evalúe contra `auth.uid()`.

**Caché:** las páginas públicas usan `export const revalidate = 60` como
red de seguridad, además del `revalidatePath()` que dispara el panel en
cada cambio. Eso cubre lo que se edite directamente en Supabase.

---

## Identidad visual

**Paleta** (`tailwind.config.ts`): blanco de papel, negro casi puro
(`#111110`), grises piedra y un beige apenas perceptible. Sin colores
saturados — el color lo aporta la ropa en las fotografías.

Se conservaron **todas** las claves de color existentes (`cream`,
`beige`, `earth`, `warmgray`, `ink`) y sólo cambiaron sus valores. Hay
cientos de clases escritas a mano en los componentes; renombrar la
escala habría roto el diseño en silencio.

**Tipografía:** 100 % sans serif. **DM Sans** para titulares y logotipo,
**Inter** para interfaz y textos largos. Ambas autohospedadas con
`next/font` (sin dependencias nuevas).

`font-serif` se mantiene como **alias** de la display sans: el código
heredado la usaba en decenas de titulares y quitar la clave los habría
dejado sin fuente.

**Utilidades compartidas** (`app/globals.css`): `.btn-primary`,
`.btn-secondary`, `.field`, `.field-label`, `.eyebrow`,
`.brand-wordmark`, `.title-editorial`, `.link-quiet`, `.card-surface`,
`.container-app`.

**Animaciones:** fade y desplazamientos mínimos, zoom sutil en hover de
imagen, transiciones de 300–900 ms. Todo respeta
`prefers-reduced-motion`.

---

## Limitaciones conocidas

Cosas que están documentadas en el código y conviene tener presentes:

1. **`products.category_id` es TEXT, no una FK.** Viene así desde la
   base original. La categoría se resuelve en memoria, no con un join.
   `003_catalog_schema.sql` incluye el script de conversión, comentado y
   con las verificaciones previas.

2. **La numeración de pedidos no es atómica.**
   `generateOrderNumber()` cuenta pedidos existentes. Con dos checkouts
   simultáneos, el segundo insert falla por el índice único de
   `orders.number` (mejor que emitir dos pedidos iguales).
   `004_orders_schema.sql` propone la solución con secuencia.

3. **`createOrder()` no es transaccional.** Si falla el insert de los
   ítems, el pedido queda creado sin ítems. `supabase-js` no permite
   transacciones multi-statement; la solución sería una función RPC.

4. **Los favoritos son por dispositivo.** Se guardan en `localStorage`,
   no en la base. No se sincronizan entre el teléfono y la computadora
   ni sobreviven a un borrado de datos del navegador. Para que sigan a
   la cuenta haría falta una tabla `favorites (user_id, product_id)` y
   reemplazar el cuerpo de `FavoritesContext` — los componentes que lo
   consumen no se enterarían.

5. **No hay integración con la API de Instagram.** La tira de la home
   usa fotografías reales del catálogo y el botón lleva al perfil
   cargado en la configuración. No se inventó una integración.

6. **No hay tabla `customers`.** Por diseño: un cliente es un
   agrupamiento de `orders` por email, lo que también cubre compras
   históricas sin cuenta.

7. **Sin columna para dirección, email de contacto ni composición de
   producto.** Viven en `lib/site.ts` (marca) o como copy de la ficha.
   Agregar columnas implicaba tocar esquema, tipos, service y formulario
   de admin sin que nadie lo pidiera.

8. **`archived_at` requiere la migración 003.** Si el borrado de un
   producto vendido falla, es porque falta esa columna.

9. **Las categorías sin productos publicados no aparecen en el bloque
   visual de la home**, pero sí en el header, en el menú mobile y en los
   filtros del catálogo. Es intencional: mandar a alguien desde una foto
   grande a un catálogo vacío es peor que no ofrecer esa entrada, pero
   la navegación tiene que reflejar lo que existe en el panel.

---

## Migración Good Night Good Vibes → Angelo Mio

### Qué se mantuvo

**Toda la arquitectura y toda la lógica de negocio.** Ni un service, ni
una Server Action, ni una función de acceso a datos fue reescrita:

- Autenticación, roles y middleware de `/admin`.
- Los seis services (`products`, `categories`, `orders`, `customers`,
  `profiles`, `storage`, `store-settings`) sin cambios funcionales.
- Carrito, checkout con sesión, confirmación de pedido, WhatsApp.
- Panel completo: dashboard, productos (con duplicar, archivar, slug
  validado y gestor de imágenes drag & drop), categorías, pedidos,
  clientes y configuración.
- El esquema de Supabase: mismas tablas, mismas columnas, mismos
  nombres.

### Qué se modificó

**Identidad visual (completa):**

- Paleta, tipografía y todas las utilidades de `globals.css`.
- Header rediseñado: logotipo, categorías **reales de la base** (ya no
  una lista fija), buscador, cuenta, favoritos, carrito. Menú mobile
  como panel lateral completo.
- Home reconstruida: hero a pantalla casi completa, bloques de categoría
  con foto, *Selección Angelo Mio*, bloque editorial, nuevos ingresos,
  Sale, beneficios y tira de Instagram.
- Catálogo con sidebar de filtros (categoría, talle, color, precio) y
  cuatro criterios de orden. Drawer de filtros en mobile.
- Ficha de producto rediseñada: galería en columna (carrusel con
  scroll-snap en mobile), selección de color y talle con talles sin
  stock tachados, acordeones de información.
- Carrito, drawer, checkout y panel alineados a la nueva estética.
- Textos, metadata y nombre del paquete.

**Comportamiento:**

- Prefijo de pedido: `GNGV-####` → `AM-####`. **Los pedidos ya emitidos
  conservan su número original.**
- Claves de almacenamiento local: `gngv-cart` → `angelo-mio-cart`. Los
  carritos en curso de visitantes se vacían una vez (es `localStorage`
  del navegador, no datos de la base).
- Tenant de Storage: `gngv` → `angelo-mio`. Los archivos ya subidos
  siguen en `gngv/products/…` y **se siguen sirviendo igual**; lo único
  que cambia es que la limpieza automática de huérfanos no los alcanza.
  Si reutilizás el Supabase anterior y querés el comportamiento previo,
  poné `STORE_TENANT_ID=gngv`.
- Un producto sin foto ya **no** recibe una imagen de stock de relleno:
  queda un rectángulo neutro. Una foto genérica de internet haría
  parecer que Angelo Mio es otra marca.

### Qué se agregó

- **Favoritos** — no existían. Contexto con `localStorage`, botón en la
  card y en la ficha, contador en el header y página `/favoritos`. Sin
  inventar tablas.
- **Buscador en el header** — navega a `/productos?q=`.
- **Filtros de talle, color y precio** en el catálogo, derivados de las
  variantes reales.
- **Cuatro páginas de contenido**: `/nosotros`, `/envios`, `/cambios`,
  `/preguntas-frecuentes`, enlazadas desde el footer.
- **SEO**: `metadataBase`, Open Graph, Twitter Card, `generateMetadata`
  dinámica por producto y por categoría, `sitemap.ts` y `robots.ts`
  dinámicos.
- **Script `npm run typecheck`**.
- `lib/site.ts` (constantes de marca) y `components/cart/CartItemThumb`
  (miniatura tolerante a productos sin foto).

### Qué se eliminó

- `lib/mock-data.ts` — 283 líneas con el catálogo ficticio de
  blanquería. No lo importaba ningún archivo y el propio `lib/types.ts`
  decía que ya no debía existir.
- El ítem *Configuración* **no** se eliminó: al contrario, **se
  restauró**. La página, la Server Action y el formulario existían y
  funcionaban, pero alguien había quitado el enlace del sidebar, así que
  la única forma de llegar era escribir la URL a mano.

No se eliminó ninguna otra funcionalidad.

### Cambios en Supabase

**Cinco problemas reales encontrados en la auditoría y corregidos:**

1. **El esquema no se podía crear desde cero.** Las migraciones sólo
   creaban `profiles`; el resto de las tablas se asumían existentes.
   Ahora `003`, `004` y `005` las crean, con columnas derivadas de lo
   que el código lee y escribe.

2. **Había dos migraciones `003_` contradictorias**, una superseded por
   la otra, que se pisaban al correr la carpeta en orden alfabético.
   Unificadas en `006_rls_policies.sql`.

3. **Faltaba `products.archived_at`.** El código la escribe en el soft
   delete de productos con ventas; un comentario mencionaba una
   migración 007 que nunca se escribió. Agregada en `003`.

4. **`categories`, `products` y `product_variants` no tenían RLS.** Con
   RLS desactivado, cualquiera con la publishable key —que es pública—
   podía escribir el catálogo. Cerrado en `006`.

5. **`store_settings` no garantizaba una sola fila**, aunque el service
   lo asume. Índice único agregado en `005`, con una salvaguarda que
   evita cortar la migración si tu base ya tiene más de una fila.

Además: índices faltantes en las columnas por las que el código filtra,
unicidad de `orders.number` y `products.slug`, `CHECK` de estados
alineados con `lib/order-status.ts`, y trigger de `updated_at`.

### Migraciones a ejecutar

Las ocho de `supabase/migrations/`, en orden, más `supabase/seed.sql`.
Ver [Migraciones](#migraciones).

Si tu base **ya venía funcionando** con Good Night Good Vibes, corré el
set completo igual: es idempotente y sobre lo que ya existe no cambia
nada. Lo único que hará será agregar lo que faltaba
(`archived_at`, RLS de catálogo, índices) y actualizar el branding.

### Variables de entorno necesarias

`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(obligatorias), `NEXT_PUBLIC_SITE_URL` (recomendada) y
`STORE_TENANT_ID` (opcional). Ver
[Variables de entorno](#variables-de-entorno).

### Después de migrar, revisá a mano

- Las **categorías viejas de blanquería** en `/admin/categorias`.
  Reasigná los productos antes de borrarlas: no hay FK que te frene.
- Los **productos de la tienda anterior**: ocultalos en vez de
  borrarlos si tienen historial de ventas.
- **Banner, WhatsApp e Instagram** en `/admin/configuracion`. El banner
  de stock de la marca anterior se limpia solo en la migración `008`.


---

## Notas de implementación: responsive y datos dinámicos

Tres cosas que conviene no volver a romper.

### 1. Nada con `position: fixed` puede vivir dentro del header

El header usa `backdrop-blur-md`. Según la especificación de Filter
Effects, cualquier valor de `filter` o `backdrop-filter` distinto de
`none` convierte al elemento en **containing block** de sus
descendientes `position: fixed`.

Por eso el menú mobile está en `components/layout/MobileMenu.tsx` y se
renderiza como **hermano** del `<header>`, no adentro. Si se vuelve a
meter dentro, `fixed inset-0` deja de referirse al viewport y el panel
se abre dentro de una franja de 64px: parece que "el menú no abre".

Lo mismo vale para el drawer de filtros del catálogo y para el carrito.

### 2. La visibilidad del contenido no depende de JavaScript

`components/ui/Reveal.tsx` usa una animación **CSS**, no
`whileInView` de framer-motion.

La versión anterior arrancaba en `opacity: 0` y sólo se volvía visible
cuando el IntersectionObserver disparaba, después de hidratar. Cualquier
falla en esa cadena dejaba secciones enteras invisibles de forma
permanente, con el HTML presente en el DOM. Con CSS, el contenido se
muestra aunque JavaScript no llegue nunca.

Efecto secundario: `Hero`, `HomeSections` y `ProductGrid` dejaron de
necesitar `"use client"` y volvieron a ser Server Components.

### 3. Invalidar caché con `revalidatePath("/", "layout")`

El layout raíz consulta Supabase: de ahí salen las categorías del header
y del menú mobile, y ese layout lo comparten **todas** las rutas.

`revalidatePath("/")` invalida sólo la página `/`. Para que una
categoría nueva aparezca en el header de `/productos`, `/contacto` o
cualquier otra ruta hace falta el segundo argumento `"layout"`, que baja
en cascada por todo el árbol. Es lo que usan las Server Actions de
productos, categorías y configuración.
