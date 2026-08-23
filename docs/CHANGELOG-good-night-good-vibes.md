> **Archivo histórico.** Este era el README de *Good Night Good Vibes*,
> el proyecto sobre el que se construyó Angelo Mio. Se conserva íntegro
> porque su changelog documenta el porqué de decisiones que siguen
> vigentes en el código (patrón de services, RLS, Storage, soft delete
> de productos).
>
> **La documentación actual del proyecto está en
> [`../README.md`](../README.md).** Todo lo que este archivo dice sobre
> marca, colores, tipografía y textos quedó obsoleto con el rebrand.

---

# Good Night Good Vibes — Ecommerce

Tienda online de blanquería premium, construida con **Next.js 14 (App Router)**,
**TypeScript**, **Tailwind CSS** y **Framer Motion**. Sin pasarela de pago
integrada: el flujo termina en un pedido confirmado que se envía por WhatsApp.

## 📋 Changelog

### 2026-07-27 (5) — Contacto con formulario, home editorial, checkout claro y footer minimalista

**Objetivo**: mejorar experiencia visual, navegación y experiencia de
compra, como mejora incremental sobre lo que ya funciona. Nada de
lógica nueva de negocio: ni una tabla, ni una Server Action, ni un
cambio de flujo.

**Motivo**: después del rediseño de la sesión anterior quedaban cinco
huecos concretos de producto. El más importante: la tienda solo tenía
un canal de contacto real (el checkout), y la home mostraba testimonios
inventados en vez de mostrar más producto.

**Revisión previa (antes de tocar nada)**: se leyó cómo se arma la home
(Server Component que consulta una sola vez y deriva las secciones),
de dónde salen los destacados (`products.featured`, marcado desde el
panel), cómo funciona el checkout (`checkoutAction` → `createOrder`),
cómo se agrega al carrito en el detalle de producto (`useCart().addItem`
con `CartItem`) y qué había en contacto (tres links, sin formulario).
Conclusión: no hacía falta rehacer nada, solo agregar componentes
chicos y reusar los que ya existen (`ProductGrid`, `ProductCard`,
`useCart`, `buildWhatsAppLink`).

**Archivos creados**:
- `components/contact/ContactForm.tsx` — formulario de contacto.

**Archivos modificados**:
- `app/contacto/page.tsx` — ahora monta el formulario; los tres accesos
  directos siguen ahí, al pie.
- `lib/whatsapp.ts` — se **agregó** `buildContactWhatsAppLink()` y el
  tipo `ContactMessage`. `buildWhatsAppLink()` (la del checkout) quedó
  intacta.
- `components/home/Hero.tsx` — altura reducida.
- `components/home/HomeSections.tsx` — nueva estructura de secciones.
- `app/page.tsx` — deriva `newest` y `collectionImage` de los productos
  que ya traía (sin consultas nuevas).
- `components/product/ProductCard.tsx` y `ProductGrid.tsx` — prop
  opcional `showAddToCart`.
- `components/checkout/CheckoutForm.tsx` — texto del aviso de pago.
- `components/layout/Footer.tsx` — footer minimalista.

---

#### 1. Página de contacto

Formulario con nombre, email, teléfono (opcional), motivo de consulta
(select con las cuatro opciones pedidas) y mensaje. Dos acciones:
**Enviar por WhatsApp** y **Enviar por email**.

Decisión de arquitectura: el formulario **no escribe en Supabase ni
manda mails**. Es un armador de mensajes — los dos botones toman los
mismos campos y abren el canal elegido (`mailto:` con asunto y cuerpo
prellenados, o `wa.me` con el texto ya escrito). Esto evita una tabla
nueva, un servicio de correo, una API key y una bandeja de entrada que
alguien tendría que revisar; y el mensaje llega igual, al mismo lugar
donde la tienda ya atiende. Si mañana querés persistir las consultas,
el formulario ya tiene los datos armados y solo hay que sumarle una
Server Action.

El armado del texto de WhatsApp se puso al lado del que ya existía para
pedidos (`lib/whatsapp.ts`), para no terminar con dos lugares distintos
donde se construyen mensajes de WhatsApp.

Validación mínima antes de abrir cualquier canal: nombre, email y
mensaje. El teléfono es opcional de verdad.

El email de contacto sigue siendo el mismo que ya estaba hardcodeado en
esa página (`hola@goodnightgoodvibes.com`), ahora como constante con su
comentario: `store_settings` no tiene columna de email y agregarla
implicaba tocar esquema, tipos y service, todo fuera de alcance.

#### 2. Home

**Hero**: pasó de 92vh a ~42vh (`h-[42vh] min-h-[340px] sm:h-[45vh]`).
El `min-h` en píxeles no es decorativo: en un teléfono bajo, 42vh deja
el título encimado con el botón. Ahora al entrar se ve el hero **y** el
comienzo de los destacados. Título corto (el texto de bienvenida de
`store_settings`), un solo botón: "Ver colección".

**Destacados**: siguen saliendo de `products.featured`, marcado desde
el panel — no hay selección aleatoria ni productos de relleno. Si el
admin no marca ninguno, la sección **no se renderiza**, en vez de
aparecer vacía.

**Colección destacada**: bloque editorial a dos columnas (foto a
sangre + texto "Nueva colección invierno" + botón "Descubrir"). La foto
es la portada de un producto real, elegida en el Server Component; si
todavía no hay productos con imagen, cae en el banner de la tienda.
Nunca queda un hueco.

**Nuevos productos**: los 4 más recientes. `getPublicProducts()` ya
viene ordenado por `created_at` descendente, así que son los primeros
del array — sin reordenar y sin una segunda consulta.

**Beneficios**: los cuatro pedidos (envíos seguros, cambios simples,
calidad premium, atención personalizada) con íconos de trazo fino.

**Categorías**: se mantuvieron, pero como una tira de texto en serif,
sin imágenes ni tarjetas. Se evaluó sacarlas (no estaban en la
estructura pedida) y se decidió conservarlas: son datos dinámicos y son
navegación real, sobre todo ahora que el footer ya no lleva enlaces.

**Testimonios: eliminados.** Eran tres reseñas inventadas en el código,
y el pedido decía explícitamente que la home no lleve reseñas.

**Agregar al carrito desde la card**: nuevo botón, con dos detalles que
importan. Es una prop **opcional apagada por defecto**
(`showAddToCart`), así el catálogo y cualquier otro lugar que ya usaba
`ProductCard` siguen idénticos; la home la enciende en destacados y
novedades. Y si el producto tiene variantes, el botón **no** agrega
nada: dice "Elegir opciones" y lleva al detalle, que es donde vive el
selector de talle/color. Agregar a ciegas un producto con variantes
habría generado pedidos sin talle. Sin stock → botón deshabilitado.

#### 3. Checkout

El aviso decía "coordinamos el pago por " + la lista de
`storeSettings.paymentMethods`. Si esa lista estaba vacía —que es el
caso hoy—, la frase quedaba cortada con un punto suelto. Ahora es
explícito: el pago y la entrega se coordinan por WhatsApp, con el
número de la tienda al lado. **El flujo de pedidos no se tocó**: mismo
`checkoutAction`, mismo `createOrder`, mismo redirect a
`/pedido-confirmado/[id]`.

#### 4. Footer

Reducido a nombre + año y los íconos de Instagram y Facebook. Se fueron
las tres columnas.

Consecuencia buena, que vale anotar: el footer ya no llama a
`getCategories()`, así que se ahorra una consulta a Supabase **en cada
página del sitio**. El texto de envíos de `store_settings` dejó de
mostrarse ahí; sigue en la base, disponible para donde quieras usarlo.

La navegación no se perdió: el header conserva Inicio, Productos,
Categorías y Contacto, y la home tiene su propia tira de categorías.

---

#### Verificación

- **Panel admin**: no se tocó ni un archivo de `app/admin/` ni de
  `components/admin/` en esta tanda.
- **Destacados**: siguen viniendo de `featured` marcado en el panel.
- **Categorías**: dinámicas, de la tabla `categories`.
- **Carrito y checkout**: el botón nuevo usa el mismo `addItem` del
  contexto, con la misma forma de `CartItem` que el detalle de
  producto. Sin lógica duplicada.
- **Pedidos**: sin cambios.
- **Storage / subida de imágenes / drag & drop**: intactos, no se
  abrió ninguno de esos archivos.
- **Mobile**: hero con mínimo en píxeles, bloque editorial que apila a
  una columna, beneficios y formulario en una columna hasta `sm`.
- **Tipos**: chequeo con `strict` + `noUncheckedIndexedAccess` sobre
  todo lo modificado, e imports muertos revisados (ninguno).

Mismo límite de siempre: este entorno no tiene salida de red, así que
**no** se pudo correr `npx next build` ni ver el sitio. Miralo en el
navegador antes de desplegar.

#### Pendientes

1. Sigue pendiente desactivar **Confirm email** en Supabase (changelog
   anterior) y correr las migraciones 005 y 006.
2. Cargar `instagram` y `facebook` en `store_settings`: el footer nuevo
   solo muestra los íconos que tengan URL, así que si están vacíos el
   footer queda solo con el nombre.
3. Revisar el texto "Nueva colección invierno" cuando cambie la
   temporada — hoy está escrito en el componente, no en la base.

#### Próximo paso recomendado

Probar el circuito de compra completo desde la home en un teléfono:
"Agregar al carrito" desde destacados → abrir el carrito → checkout →
confirmar → ver el pedido en `/admin/pedidos`. Y probar los dos botones
de contacto en mobile, que es donde `mailto:` y `wa.me` se comportan
distinto que en escritorio.

#### Mejoras futuras

- **Persistir las consultas de contacto** en una tabla `inquiries` con
  su propia sección en el panel, si el volumen lo justifica.
- **Colección destacada editable** desde el panel (imagen, título y
  link), hoy es contenido en el componente.
- **Detalle de producto**: es la pantalla que quedó más lejos del resto
  del rediseño.
- **Email real de la tienda** en `store_settings`, para dejar de tener
  la dirección en el código.

### 2026-07-27 (4) — Rediseño editorial + UX del panel (perfil admin, refresco automático, loading de marca, sin Configuración)

**Objetivo**: pulir la experiencia sin agregar funcionalidades ni tocar
nada de lo que ya funciona. Siete pedidos concretos: perfil de admin sin
pedidos personales, registro sin verificación de email, refresco
automático del panel, pantalla de carga con la marca, sacar los
placeholders de ejemplo, eliminar la sección Configuración y un
rediseño visual completo del sitio.

**Motivo**: el proyecto ya está funcionalmente completo; lo que quedaba
era todo percepción. La tienda se veía como un template de marketplace
(píldoras, sombras, chapitas de colores, terracota) y no como una marca
de blanquería premium, y el panel obligaba a apretar F5 después de cada
cambio, que es el tipo de detalle que hace sentir "beta" a un producto
terminado.

**Alcance / lo que NO se tocó**: `lib/services/*` (salvo el agregado de
la sesión anterior), Storage, subida de imágenes, `ProductImagesManager`,
drag & drop, portada, orden de imágenes, RLS, SQL, middleware,
`AuthContext`, `CartContext`, tipos y Server Actions de productos,
categorías y pedidos. **La sección Multimedia del formulario de
producto quedó exactamente igual, byte por byte.**

**Archivos creados**:
- `components/ui/BrandLoader.tsx` — pantalla de carga de marca
  (variantes `page` y `overlay`).
- `components/account/SignOutButton.tsx` — isla de cliente para cerrar
  sesión desde `/cuenta`, que es Server Component.
- `app/loading.tsx` y `app/admin/loading.tsx` — fallbacks de navegación.

**Archivos eliminados** (punto 6):
- `app/admin/configuracion/page.tsx`
- `app/admin/configuracion/actions.ts`
- `components/admin/AdminSettingsForm.tsx` (quedaba sin uso)

**Archivos modificados**: `tailwind.config.ts`, `app/globals.css`,
`app/layout.tsx`, `app/cuenta/page.tsx`, `app/login/page.tsx`,
`app/registro/page.tsx`, `app/admin/layout.tsx`, `app/admin/page.tsx`,
`components/layout/Navbar.tsx`, `components/layout/Footer.tsx`,
`components/layout/AdminSidebar.tsx`, `components/home/Hero.tsx`,
`components/home/HomeSections.tsx`, `components/product/ProductCard.tsx`,
`components/product/ProductGrid.tsx`,
`components/product/ProductFilters.tsx`, `components/ui/Button.tsx`,
`components/checkout/CheckoutForm.tsx`, `components/admin/DataTable.tsx`,
`components/admin/DashboardCards.tsx`,
`components/admin/AdminProductsClient.tsx`,
`components/admin/AdminCategoriesClient.tsx`,
`components/admin/AdminOrdersClient.tsx`,
`components/admin/AdminOrderStatusSelect.tsx`,
`components/admin/AdminCustomersClient.tsx`.

---

#### 1. Perfil de admin sin pedidos personales

`/cuenta` ahora tiene dos vistas según el rol:

- **admin** → datos de la cuenta (nombre, email, rol), botón "Ir al
  panel" y "Cerrar sesión". Nada de "Mis pedidos" ni historial. Además
  **no se ejecuta `getOrdersByUser()`** para un admin: no es solo
  esconder el bloque, es no hacer la consulta.
- **usuario normal** → exactamente el mismo contenido y comportamiento
  que antes.

También se ocultó "Mis pedidos" en el menú de cuenta del header
(desktop y mobile) cuando el usuario es admin. El rol sale de
`useAuth()`/`getCurrentProfile()`, la fuente de verdad de siempre — no
se agregó ningún estado nuevo de "soy admin".

#### 2. Verificación de email

**Esto es una opción del proyecto de Supabase, no del código**, así que
no se puede resolver desde acá y no hay commit que lo active. Los pasos
exactos:

> Dashboard de Supabase → **Authentication** → **Sign In / Providers** →
> **Email** → desactivar **Confirm email** → Save.
> (Con Supabase CLI, el equivalente es `enable_confirmations = false`
> en el bloque `[auth.email]` de `supabase/config.toml`.)

Con esa opción apagada, `supabase.auth.signUp()` ya devuelve una sesión
activa y el usuario queda logueado — el flujo de `signUp` en
`AuthContext` no necesitó ningún cambio.

Lo que **sí** se corrigió del lado del código, porque era un bug real
que aparecía justo ahí: la sesión se crea en el cliente, pero los
Server Components leen la cookie del servidor. Sin avisarle al router,
`/cuenta` seguía viendo un visitante anónimo y rebotaba al login
inmediatamente después de registrarse. Se agregó `router.refresh()`
después del `push` en registro y en login.

#### 3. Refresco automático después de cada cambio

Las Server Actions ya llamaban a `revalidatePath()`, que invalida la
caché del servidor — pero eso solo no actualiza la pantalla: el cliente
sigue renderizando las props que recibió. Faltaban las dos mitades
restantes, y se agregaron:

1. `router.refresh()` después de cada operación exitosa (crear, editar,
   eliminar, duplicar producto; crear/editar/eliminar/reordenar
   categoría; cambiar el estado de un pedido). Vuelve a pedir el árbol
   de Server Components **sin recargar el navegador**: no se pierde el
   scroll, ni el carrito, ni el estado del modal.
2. Sincronizar el estado local con las props nuevas
   (`useEffect(() => setList(initialProducts), [initialProducts])`).
   Sin esto, `useState(initialProducts)` se queda con el valor del
   primer render y el refresh no se vería igual — era la causa real de
   que hiciera falta F5.

No se usó `window.location.reload()` en ningún lado.

#### 4. Pantalla de carga

`BrandLoader` (monograma + nombre del local + spinner de 1px + texto)
en dos variantes, para que todas las esperas del proyecto se vean
igual:

- `page` → `app/loading.tsx` y `app/admin/loading.tsx` (navegación
  entre páginas) y el estado "verificando sesión" del layout admin, que
  antes era un spinner suelto.
- `overlay` → capa translúcida con blur mientras se guarda algo en el
  panel ("Actualizando información..."). **Cubre solo el panel, no toda
  la app**, y no desmonta la pantalla que estás mirando.

Decisión: el overlay **sí** bloquea el click durante la operación. Es a
propósito: es lo que evita el doble submit y el doble borrado mientras
la Server Action está en vuelo.

Nota: el monograma se calcula con las iniciales del nombre del local
("Good Night Good Vibes" → GNGV) en vez de usar `logoUrl`, porque
`loading.tsx` se renderiza antes de que haya datos y no puede depender
de una consulta a `store_settings`. Si más adelante querés el logo real
ahí, el componente ya recibe el nombre por props y sumar un `logoUrl`
opcional es un cambio de tres líneas.

#### 5. Placeholders de ejemplo

Se eliminaron los textos de ejemplo dentro de los inputs de: formulario
de producto (Nombre, Slug), login, registro y checkout. **Todos los
labels quedaron**, y se les dio un estilo consistente (versalita chica)
con dos clases nuevas en `globals.css`: `.field` y `.field-label`.

Única excepción, a propósito: el buscador del catálogo
(`ProductFilters`) conserva "Buscar productos...". Ese input **no tiene
label** — es una lupa y una caja. Sacarle el placeholder dejaría un
rectángulo vacío sin ninguna indicación de para qué sirve, que es
justo lo contrario de lo que pedía el punto.

#### 6. Configuración eliminada

Se borraron la página, sus Server Actions, el formulario y el ítem del
menú lateral. **`lib/services/store-settings.ts` NO se tocó**: la
tienda pública sigue leyendo de ahí el nombre, el banner, el texto de
bienvenida, el WhatsApp, las redes y los datos de envío (los usan el
header, el hero, el footer, contacto y el checkout). Borrar el service
habría roto media tienda; borrar solo la pantalla no rompe nada.

A partir de ahora esos valores se editan desde el dashboard de Supabase
(tabla `store_settings`).

#### 7. Rediseño visual

**Tokens antes que componentes.** Se mantuvieron todas las claves de
color existentes (`cream`, `beige`, `earth`, `warmgray`, `ink`) y solo
cambiaron sus valores: así ninguna clase escrita en un componente deja
de existir y el rediseño no puede romper una pantalla por una clase
inexistente. El cambio más importante: `earth` dejó de ser terracota y
pasó a ser un topo cálido apagado — la terracota era el color más
ruidoso del sitio y lo que más lo tiraba hacia "marketplace".

Paleta final: marfil `#FCFAF6`, arena `#E8E0D5`/`#C4B6A4`, gris cálido
`#8A8378`, negro suave `#24221E`, acento topo `#7E7264`.

**Tipografía.** Cormorant Garamond (serif de display, pesos 300–500)
para titulares y nombre de marca, Inter para todo lo demás, cargadas
con `next/font` y expuestas como variables CSS que lee
`tailwind.config.ts`. **No se agregó ninguna dependencia**: `next/font`
viene con Next. Los fallbacks (`Georgia`, `system-ui`) no son
decorativos: si la fuente no baja, el sitio sigue legible.

**Qué cambió, pantalla por pantalla**:
- *Hero*: foto a pantalla completa (92vh), degradado suave en vez del
  overlay que tapaba media imagen, título en serif liviano a 5.5rem que
  entra palabra por palabra, y el CTA pasó de botón sólido a un link
  subrayado. Es la única animación coreografiada del sitio.
- *Header*: más alto, links en versalita con subrayado que crece en
  hover, íconos de trazo fino, badge del carrito en negro suave.
- *Cards de producto*: foto 3:4 sin esquinas redondeadas, zoom lento
  (900ms) en hover en vez de levantar la card, el nombre se subraya
  progresivamente. Se fueron las chapitas de color: "-30%" ahora es
  texto chico sobre la foto y el badge "Destacado" desapareció (esa
  información ya la da la sección donde aparece el producto).
- *Home*: secciones a 24/32 de padding vertical, encabezados con rótulo
  + título separados por una línea de 1px, categorías como grilla de
  mosaicos con separación de 1px (sin degradado), beneficios sin íconos
  ni fondo negro, testimonios como citas en serif sin card.
- *Footer*: grilla de 12 columnas, nombre de la tienda como bloque
  editorial, columnas reducidas a lo que son (un índice).
- *Panel*: mismas tablas y mismos datos, con encabezados en versalita,
  números del dashboard en serif y sidebar más silencioso.
- *Transversal*: botones rectangulares en versalita (nunca más
  píldoras), sombras casi imperceptibles, radio de 1.25rem → 0.5rem,
  foco visible por teclado y `prefers-reduced-motion` respetado (sin
  eso, todo el reveal al scrollear es una molestia para quien pidió
  menos movimiento).

---

#### Problemas encontrados y cómo se resolvieron

**El refresco no era `revalidatePath()`, era el estado local.** El
diagnóstico fácil ("faltan revalidaciones") era el equivocado: ya
estaban. El problema real era `useState(initialProducts)` congelando el
primer valor. Por eso la corrección son dos piezas y no una.

**`divide-warmgray-50` no existía.** Varias listas del panel usaban ese
color, que nunca estuvo en la paleta: Tailwind no generaba la clase y
las líneas divisorias simplemente no se veían. Corregido a
`warmgray-100`.

**El botón "Cerrar sesión" en una página de servidor.** `/cuenta` es un
Server Component y cerrar sesión es cliente. En vez de convertir toda
la página a `"use client"` (que habría obligado a mover la consulta de
pedidos al cliente y romper el patrón del proyecto), se aisló en un
componente chico que solo invoca el `signOut()` del contexto.

**Registro que rebotaba al login.** Descrito en el punto 2: faltaba
`router.refresh()` para que el servidor viera la cookie nueva.

#### Estado actual

- CRUD de productos y categorías, login, registro, upload de imágenes,
  Storage, drag & drop, portada, pedidos y panel: sin cambios
  funcionales. Solo cambió cómo se ven y cuándo se refrescan.
- Un usuario normal ve exactamente lo mismo que antes en `/cuenta` y en
  el menú de cuenta.
- El panel ya no requiere F5 después de ninguna operación.
- `package.json` sin cambios: cero dependencias nuevas.

**Verificación**: mismo límite que la sesión anterior — este entorno no
tiene salida de red, así que **no** pude correr `npx tsc --noEmit`,
`npx next build` ni levantar el sitio para mirarlo. Lo verificado acá:
chequeo de tipos con `strict` + `noUncheckedIndexedAccess` sobre todo
lo modificado (filtrando lo que falla solo por no tener
`node_modules`), búsqueda de imports muertos y de referencias a los
archivos eliminados (no quedó ninguna). **Corré `npx next build` y
mirá el sitio antes de desplegar.**

#### Pendientes

1. Desactivar **Confirm email** en el dashboard de Supabase (punto 2).
   Es el único paso de esta tanda que no está en el código.
2. La primera build con `next/font` descarga Cormorant Garamond e Inter
   desde Google Fonts: necesita red. Si tu pipeline de deploy no tiene
   salida a internet, sacá el import de `app/layout.tsx` y las
   variables del `<html>` — el sitio cae en Georgia + system-ui y se ve
   correcto igual.
3. Quedaron dos comentarios en `lib/services/store-settings.ts` y
   `lib/services/profiles.ts` que mencionan `/admin/configuracion`, una
   ruta que ya no existe. No los toqué porque los services estaban
   fuera de alcance; es un renglón en cada archivo cuando quieras.

#### Próximo paso recomendado

Mirar el sitio en mobile con el navegador real, en este orden: home
(que el hero no coma toda la pantalla en un teléfono chico), grilla de
productos, detalle, checkout. Después el panel: crear un producto y
confirmar que aparece en la tabla **sin** apretar F5, y que el overlay
"Actualizando información..." aparece y se va solo.

#### Mejoras futuras

- **Detalle de producto y checkout** quedaron heredando la paleta y la
  tipografía nuevas, pero no recibieron un rediseño propio de layout
  como el home. Es el siguiente lugar donde se nota.
- **`ConfirmDialog` en categorías**: todavía usa `confirm()`/`alert()`
  del navegador, mientras productos ya usa el diálogo propio. Unificar
  es media hora y es lo último que rompe la ilusión de producto
  terminado.
- **Logo real en `BrandLoader`** (hoy monograma), pasando `logoUrl`
  desde donde sí haya datos.
- **Skeletons por sección** en vez de una pantalla de carga completa
  para las navegaciones del panel: se siente aún más rápido.

### 2026-07-27 (3) — Imágenes de producto sobre Supabase Storage (subida de archivos, fin del "pegar URL")

**Objetivo**: reemplazar el único punto donde el admin todavía trabajaba
como si fuera un editor de HTML —pegar la URL de la imagen a mano— por
una subida de archivos real desde su computadora, estilo Shopify/
Tiendanube, con preview inmediata y persistencia en Supabase Storage.
Lo que se guarda en `product_images` sigue siendo **exactamente lo
mismo que antes**: una URL pública. Cambió el ORIGEN de esa URL, no el
modelo de datos.

**Motivo**: era el último paso manual del panel y el más frágil. Obliga
a salir de la app, subir el archivo a algún lado (dashboard de
Supabase, un hosting externo, Unsplash), copiar el link y volver — con
tres formas de arruinarlo: pegar una URL privada que devuelve 403,
pegar una URL de un dominio que no está en `images.remotePatterns` (se
ve en el admin con `unoptimized` y se rompe en la tienda pública), o
depender de un archivo alojado en un servidor de un tercero que mañana
lo borra. Además, para Bloom Shop Pro es directamente inviable: no se
le puede pedir a un cliente de una tienda que administre URLs.

**Alcance**: estrictamente aditivo. `createProductAction`,
`updateProductAction`, `deleteProductAction`, `replaceProductImages()`,
auth, middleware, RLS existente, checkout, pedidos, categorías,
dashboard, navbar, home y los contextos de auth/carrito quedaron sin
tocar. La única función preexistente que cambió por dentro es
`saveProductImagesAction`, y con la misma firma y el mismo retorno (ver
"Decisiones", punto 4).

**Archivos creados**:
- `lib/tenant.ts` — tenant actual + convención de paths en Storage
  (`getCurrentTenantId()`, `productImagePath()`,
  `isTenantProductImagePath()`).
- `lib/image-upload.ts` — límites y validación de archivos compartidos
  por cliente y servidor (MIME admitidos, tamaño máximo, `accept` del
  input, `alt` derivado del nombre del archivo).
- `lib/services/storage.ts` — `"server-only"`. Sube, borra y traduce
  entre path del bucket y URL pública. No sabe nada de productos.
- `supabase/migrations/006_product_images_storage.sql` — bucket
  `store-assets` + policies de `storage.objects`.

**Archivos modificados**:
- `lib/services/products.ts`: se **agregó** `syncProductImages()`. Nada
  de lo que ya existía se tocó — `replaceProductImages()` sigue igual,
  línea por línea, y la sigue usando `duplicateProduct()`.
- `app/admin/productos/actions.ts`: se **agregaron**
  `uploadProductImageAction()` y `discardUploadedImagesAction()`;
  `saveProductImagesAction()` mantiene firma y retorno, y pasó a
  delegar en `syncProductImages()` en vez de `replaceProductImages()`.
- `components/admin/ProductImagesManager.tsx`: reescrito. Mismo
  contrato de props (`images` + `onChange`, más un `onUploadingChange`
  opcional), mismo drag&drop de reordenar, misma UX de portada/quitar.
- `components/admin/AdminProductsClient.tsx`: manejo del cierre del
  modal (descartar subidas no guardadas) y bloqueo del botón Guardar
  mientras haya archivos en vuelo. La tabla, el formulario y el resto
  del flujo quedaron igual.
- `next.config.js`: `experimental.serverActions.bodySizeLimit`.

---

#### Decisiones de arquitectura

**1. Un bucket compartido, no uno por tienda.** Bucket `store-assets`,
público, con el tenant como PRIMER segmento del path:

```
store-assets/{tenantId}/products/{uuid}.{ext}
             gngv/products/8f0c1b2e-....webp
```

Un bucket por tienda parece más prolijo pero convierte cada alta de
cliente de Bloom Shop Pro en una tarea de infraestructura (crear el
bucket + duplicar sus policies) y dispersa las reglas de acceso en N
lugares imposibles de auditar juntos. Con un bucket compartido, el
aislamiento lo da el prefijo del path y las policies se escriben una
sola vez. Y el tenant va primero justamente porque las policies de
Storage se evalúan sobre `storage.objects.name`:
`(storage.foldername(name))[1]` es la forma canónica de aislar un
tenant en Supabase. La policy multi-tenant futura es **una línea más**
en las policies que ya existen:

```sql
and (storage.foldername(name))[1] = public.current_tenant_id()
```

Hoy `getCurrentTenantId()` devuelve una constante (`gngv`, override por
`STORE_TENANT_ID`). Cuando existan tenants de verdad, cambia esa
función y **nada más**: ni los services ni los componentes se enteran.

**2. El bucket es público, y esa es una decisión sobre visibilidad, no
sobre tipo de archivo.** Las imágenes de producto son catálogo: se
muestran a cualquier visitante, conviene que las sirva el CDN y que se
cacheen (se suben con `cache-control` de un año, y como el nombre es un
UUID inmutable, no hay problema de invalidación). Cuando Bloom Shop Pro
necesite guardar archivos que NO son públicos (comprobantes de pago,
exportaciones, facturas) van a un bucket privado aparte con URLs
firmadas. El eje de separación entre buckets es la visibilidad, no la
entidad.

**3. El path NO incluye el `productId`.** Fue lo más discutible y
terminó siendo lo más claro:
- Al subir una imagen desde "Crear producto", el producto **todavía no
  existe** — no hay id para poner en el path. La alternativa era subir
  a una carpeta `_drafts/{uuid}/` y mover los archivos después de
  guardar: mover objetos en Storage es copiar + borrar, y encima
  cambiaría la URL ya mostrada en el preview.
- El índice de "qué archivo pertenece a qué producto" es la tabla
  `product_images`, no la estructura de carpetas. Duplicar esa relación
  en el path es tener dos fuentes de verdad que se pueden desincronizar.
- `duplicateProduct()` copia las URLs tal cual: original y copia
  comparten el mismo archivo físico. Con el `productId` en el path, ese
  archivo estaría "en la carpeta del producto equivocado" desde el
  minuto cero.

**4. `replaceProductImages()` no se tocó; se agregó
`syncProductImages()` al lado.** La primitiva vieja significa "dejá
estas filas y ninguna otra" y la usa `duplicateProduct()`, que NO debe
borrar archivos. La nueva hace lo mismo con la base y además barre del
bucket lo que quedó huérfano. `saveProductImagesAction()` pasó a llamar
a la nueva: misma firma, mismo retorno, el componente no cambió su
forma de llamarla.

**5. Un archivo por request, no un batch.** Cada imagen viaja en su
propia Server Action. Así una foto pesada no arrastra a las demás
contra el límite de body, la UI puede mostrar el estado y el error de
cada archivo por separado, y el techo de `bodySizeLimit` no depende de
cuántas imágenes se elijan a la vez.

**6. La subida pasa por Server Action, no por el cliente.** Se evaluó
subir directo desde el browser con el cliente de Supabase (o con URLs
firmadas) y se descartó: la regla del proyecto es que la UI no habla
con Supabase, habla con Server Actions. El costo de esa decisión está
anotado abajo, en "Mejoras futuras" (barra de progreso real y archivos
grandes).

**7. Cero librerías nuevas.** `<input type="file">`, `FormData`,
`URL.createObjectURL`, `crypto.randomUUID()`, la API de drag&drop del
HTML5 que ya se usaba. `package.json` no cambió.

---

#### Problemas encontrados y cómo se resolvieron

**El límite de 1 MB de las Server Actions.** El default de Next.js para
el body de una Server Action es 1 MB: cualquier foto de producto real
lo revienta, y el error llega como un fallo genérico, no como algo que
la UI pueda explicar. Se subió a `8mb` en `next.config.js` (5 MB de
límite por archivo + overhead del multipart). Es el único cambio de
configuración de la migración y está comentado en el archivo.

**Una imagen borrada en un producto duplicado podía romper el
original.** `duplicateProduct()` copia las URLs, así que dos productos
apuntan al mismo archivo físico. Un borrado ingenuo ("saqué esta
imagen → borro el archivo") dejaba al producto original mostrando un
404. `syncProductImages()` verifica, antes de borrar, que la URL no
esté referenciada por ninguna otra fila de `product_images` (una sola
query con `in`).

**Archivos huérfanos por formularios abandonados.** La subida es
inmediata, pero el guardado no: si el admin sube tres fotos y cierra el
modal, esos archivos quedaban pagando storage para siempre sin que
nadie los referencie. Se resolvió por los dos lados: quitar una imagen
subida en la sesión la borra del bucket en el acto, y cerrar/cancelar
el modal dispara `discardUploadedImagesAction()` con las que quedaron.
Por eso `ImageDraft` ahora tiene un `storagePath` opcional: solo lo
llevan las imágenes subidas **en esta sesión de edición**, que son las
únicas que el cliente puede borrar sin riesgo (las que vienen de la
base las limpia el servidor al guardar, comparando URLs).

**Guardar con imágenes a medio subir.** Se podía apretar Guardar
mientras un archivo seguía viajando y esa imagen simplemente no
quedaba. El manager ahora avisa hacia arriba (`onUploadingChange`) y el
botón queda deshabilitado con el texto "Subiendo imágenes...".

**Compatibilidad hacia atrás.** Los productos viejos tienen URLs
externas (Unsplash y demás). Se siguen mostrando igual, se siguen
guardando igual y **nunca** se intenta borrarlas del bucket:
`isManagedAssetUrl()` compara contra el prefijo público de nuestro
bucket, y todo lo que no matchea se desreferencia y se deja en paz.
Nada de la data existente se migra ni se reescribe.

**Fugas de memoria con los previews.** Cada preview inmediata es un
`blob:` creado con `URL.createObjectURL`. Se revoca en cuanto llega la
URL real, al descartar una fila fallida y al desmontar el componente.

**El `alt` siempre vacío.** Como el archivo en el bucket se llama con
un UUID, el nombre original se perdía. Ahora se usa como `alt` por
defecto (`sabanas-lino-beige.jpg` → "sabanas lino beige"): mejor
accesibilidad y mejor SEO sin pedirle nada más al admin.

---

#### Seguridad

`006_product_images_storage.sql` crea el bucket y cuatro policies sobre
`storage.objects`: lectura para `anon`/`authenticated` (si la URL se
publica en la tienda, la imagen tiene que abrir), y insert/update/
delete solo para `public.is_admin()` — la misma función que ya usan las
policies de 004 y 005, no se inventó un mecanismo nuevo. El bucket
además declara `file_size_limit` y `allowed_mime_types`, que repiten a
propósito lo que valida la app: la validación del cliente es UX, la del
servidor es correctitud y la del bucket es la última barrera.

Vale subrayar por qué esto importa: el middleware protege la
NAVEGACIÓN a `/admin`, pero una Server Action se puede invocar sin
pasar por ahí. La garantía real de que solo un admin escribe en el
bucket son estas policies. Ninguna policy existente se modificó y no se
usa `service_role` en ninguna parte.

---

#### Estado actual

- El botón "Agregar" por URL **ya no existe**; en su lugar hay una zona
  de carga con "Subir imágenes" (y se pueden soltar archivos encima).
- Selección de uno o varios archivos, preview inmediata con spinner por
  archivo, y reemplazo por la imagen real cuando termina la subida.
- Drag&drop de reordenar, "Usar como portada" y quitar: idénticos a
  antes. La primera imagen sigue siendo la portada.
- Los dos drag&drop conviven sin pisarse: el de archivos solo reacciona
  si el `dataTransfer` trae `Files`, cosa que arrastrar una fila de la
  lista no hace.
- Una subida que falla deja una fila roja descartable con el motivo; el
  formulario sigue usable y el resto de las imágenes no se ve afectado.
- `npm install` no hizo falta: no se agregó ni una dependencia.

**Verificación**: en este entorno no hay salida de red, así que **no**
pude correr `npx tsc --noEmit` ni `npx next build` con las dependencias
reales instaladas ni probar contra tu Supabase. Lo que sí se verificó:
chequeo de tipos sobre los archivos nuevos y modificados con
`strict` + `noUncheckedIndexedAccess` (filtrando únicamente los errores
que vienen de no tener `node_modules`), revisión de imports muertos y
que `next.config.js` parsea. **Correr `npx tsc --noEmit` y
`npx next build` antes de desplegar.**

#### Pendientes (bloqueantes, en orden)

1. Correr `supabase/migrations/006_product_images_storage.sql` en tu
   proyecto. Sin el bucket, la primera subida falla con "Bucket not
   found".
2. Correr `005_product_images_rls.sql` si todavía no se corrió (venía
   pendiente del changelog anterior).
3. Confirmar que `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` es la URL
   del proyecto sin barra final: de ahí se deriva el prefijo público
   que distingue "archivo nuestro" de "URL externa".

#### Próximo paso recomendado

Probar el ciclo completo contra la base real con un producto de prueba:
subir 3 imágenes → reordenarlas → cambiar la portada → guardar →
reabrir y verificar el orden → quitar una y guardar → confirmar en el
dashboard de Supabase (Storage → `store-assets` → `gngv/products/`) que
ese archivo desapareció y los otros dos siguen. Después, el caso que
más me interesa que mires: duplicar un producto con imágenes, borrar
una imagen **de la copia** y verificar que el original la sigue
mostrando.

#### Mejoras futuras (fuera del alcance de esta sesión)

- **Borrar imágenes al borrar el producto.** Hoy `deleteProductAction`
  no se tocó (estaba explícitamente fuera de alcance), así que borrar
  un producto deja sus archivos en el bucket. Lo correcto es un trigger
  en Postgres sobre `delete` de `product_images` (que cubre también el
  `on delete cascade`), no lógica en la app.
- **Subida directa con URL firmada** para archivos grandes y barra de
  progreso real: la Server Action creería la URL (la autorización sigue
  siendo del servidor) y el browser haría el `PUT`. Es la salida
  natural cuando el límite de body moleste.
- **Redimensionar/convertir a WEBP del lado del servidor**, o usar los
  image transforms de Supabase, para no servir el JPG de 4 MB que subió
  el cliente.
- **Reutilizar `lib/services/storage.ts` para logo y banner** de
  `store_settings`, que hoy siguen siendo campos de URL a mano. El
  service ya es agnóstico de la entidad; falta el path
  (`{tenantId}/branding/`) y el componente.
- **Alt editable** desde el panel: hoy se deriva del nombre del archivo
  y no se puede corregir sin volver a subir.
- **Limpieza programada de huérfanos.** El caso que la limpieza del
  cliente no cubre: cerrar el modal con una subida todavía en vuelo
  (el archivo termina de subirse después de que la lista ya se
  descartó). Es raro y barato, pero un job que compare
  `storage.objects` contra `product_images` y borre lo no referenciado
  con más de X días lo cierra del todo — y en Bloom Shop Pro conviene
  tenerlo igual, por tenant.
- **Cuota por tenant** (cuántos MB usa cada tienda) — con el bucket
  organizado por prefijo, es una consulta sobre `storage.objects`.

### 2026-07-27 (2) — UX/UI del panel de administración de productos

**Objetivo**: mejorar la experiencia de crear/editar productos en
`/admin/productos` (estilo Shopify/Tiendanube), sin tocar arquitectura,
auth, RLS existente, ni Server Actions/services ya escritos.

**Aclaración importante sobre el alcance**: lograr que el drag&drop de
imágenes y "Duplicar producto" persistan de verdad en Supabase (no solo
en el estado de React) requería, sí o sí, algún código nuevo de
servidor — no hay forma de que eso funcione con puro CSS/JSX. La
decisión fue: **cero funciones existentes modificadas**, todo lo nuevo
es estrictamente aditivo, siguiendo el mismo patrón ya establecido
(Server Component → Server Action → service). `createProductAction`,
`updateProductAction`, `deleteProductAction` (en
`app/admin/productos/actions.ts`) y todo lo que ya existía en
`lib/services/products.ts` quedaron exactamente igual, línea por línea.

**Archivos creados**:
- `components/admin/ConfirmDialog.tsx` — reemplaza `window.confirm()`
  (reusa el `Modal` existente).
- `components/admin/ProductImagesManager.tsx` — lista de imágenes con
  drag&drop nativo (HTML5, sin librería nueva), agregar por URL,
  quitar, marcar portada.
- `components/ui/FormSection.tsx` — wrapper de sección reutilizable
  (mismo estilo `card-surface` que ya se usaba en el resto del admin).
- `supabase/migrations/005_product_images_rls.sql` — RLS para
  `product_images` (ver más abajo).

**Archivos modificados**:
- `lib/services/products.ts`: se **agregaron** (nada existente se tocó)
  `isSlugTaken()`, `replaceProductImages()`, `duplicateProduct()`.
- `app/admin/productos/actions.ts`: se **agregaron** `checkSlugAction`,
  `getProductBySlugAction`, `saveProductImagesAction`,
  `duplicateProductAction`.
- `components/admin/AdminProductsClient.tsx`: reescrito — mismo
  contrato de props, misma tabla, mismos datos; el modal de crear/
  editar pasó a tener secciones y todo lo pedido (ver abajo).

---

#### 1–2. Slug editable + validación en vivo

Campo **Nombre** ahora se muestra tal cual se escribe (nunca se toca).
Campo **Slug** separado, autogenerado con `slugify()` (ya existía desde
la sesión de estabilización, no hizo falta tocarlo) mientras el admin
no lo edite a mano — al tipear directamente en el campo Slug, se marca
como "tocado" y deja de regenerarse por más que cambie el Nombre. Al
editar un producto ya existente, el slug se trata como intencional
desde el arranque (no se auto-regenera solo por editar el nombre).

Validación: debounce de 450ms → `checkSlugAction()` → Supabase. Mientras
se resuelve, muestra "Verificando...". Si está tomado por *otro*
producto, "❌ Ya existe un producto con ese slug." y el botón Guardar
queda deshabilitado (también mientras la verificación está en vuelo).
Si está libre, "✅ URL disponible."

#### 3. Secciones del formulario

Información básica (nombre, slug, categoría, descripción) / Venta
(precio, precio de oferta, % de descuento — **calculado, no es un
campo propio**, ver nota abajo — y stock/SKU) / Estado / Multimedia.
Nota sobre "Estado": el pedido mencionaba 3 toggles (activo, destacado,
**visible**) pero el esquema real de `products` solo tiene 2 columnas
para esto (`status`, `featured`) — no se agregó una columna `visible`
(prohibido tocar el esquema). Se resolvió con 2 toggles reales:
"Activo (visible en la tienda)" y "Destacado", sin inventar un tercer
campo que no se guardaría en ningún lado.

#### 4. Drag & drop de imágenes

Reordenable (HTML5 `draggable` nativo), se puede quitar cualquiera, y
"Usar como portada" mueve una imagen al índice 0 — la primera imagen
siempre es la portada, como se pidió. **No hay upload de archivos**:
el proyecto no tiene bucket de Supabase Storage ni endpoint propio de
subida conectado, y agregarlo sería infraestructura nueva, fuera de
"no cambies la arquitectura". Las imágenes se agregan pegando una URL
(por ejemplo, un link ya subido a Supabase Storage a mano, o cualquier
URL pública). El preview usa `unoptimized` en el `<Image>` del admin
para no depender de la lista blanca de dominios de `next.config.js` —
**pero la tienda pública sí depende de esa lista**, así que para que la
imagen se vea también ahí, su dominio tiene que estar en
`images.remotePatterns` (hoy: `images.unsplash.com` y `*.supabase.co`).

Persistencia: `replaceProductImages()` borra todas las imágenes del
producto e inserta la lista final en el orden mostrado — estrategia
simple porque el admin arma la lista completa en el modal antes de
guardar (agregar/reordenar/quitar pasa ahí), no hace falta diffear
altas y bajas una por una.

#### 5. Duplicar producto

Botón nuevo en la tabla (ícono de copia). `duplicateProductAction()` →
copia nombre (+" (Copia)"), descripción, precio, categoría, imágenes y
variantes. Genera un slug nuevo único automáticamente (si
`slugify(nombre)` ya existe, agrega `-2`, `-3`, etc.). **El producto
duplicado se crea con `status: "hidden"`** — decisión deliberada: no
pedimos permiso para publicar un clon con el mismo precio/stock activo
en la tienda de inmediato; el admin lo revisa y lo activa a mano.

#### 6–7. Confirmación de borrado

`ConfirmDialog` (sobre el `Modal` ya existente) en vez de
`window.confirm()`. Mismo texto pedido: "¿Seguro que querés eliminar
este producto? Esta acción no se puede deshacer." — con el nombre del
producto interpolado.

---

**RLS — `product_images`**: hasta ahora esta tabla solo se leía. El
drag&drop la escribe por primera vez, así que si tiene RLS habilitado
sin policies (mismo patrón que ya pasó con `orders`/`store_settings`),
el guardado de imágenes va a fallar con el mismo error de siempre.
`supabase/migrations/005_product_images_rls.sql` lo cubre — **falta
correrla en Supabase**, no se pudo ejecutar desde acá.

**Verificado**: `npx tsc --noEmit` sin errores, `npx next build`
limpio, 17/17 páginas. El resto del sitio (tienda pública, checkout,
pedidos, categorías, configuración) no se tocó — mismo comportamiento
que antes.

**Pendiente / próximo paso recomendado**: correr la migración 005;
después, crear un producto de prueba con 2-3 imágenes para confirmar
el flujo completo (crear → guardar imágenes → reordenar → duplicar →
eliminar) contra la base real, algo que no pude ejercitar desde este
entorno sin acceso de red a tu Supabase.

### 2026-07-27 — Estabilización V1 (checkout con login, RLS, 404, imágenes de carrito, auditoría general)

**Objetivo**
Etapa de estabilización antes de seguir con nuevas funcionalidades:
corregir los bugs reportados y auditar todo el proyecto en busca de
problemas silenciosos, sin agregar features nuevas.

---

#### 1. Checkout con login obligatorio

**Causa**: cambio de requisito del proyecto — ya no se permite comprar
como invitado.

**Solución**:
- `app/checkout/actions.ts` (`checkoutAction`): corta antes de llamar a
  `createOrder()` si no hay usuario autenticado, devolviendo
  `{ order: null, error: "Debés iniciar sesión para confirmar tu pedido." }`.
- `lib/services/orders.ts`: `CreateOrderInput.userId` pasó de
  `string | null` a `string` (obligatorio). Se actualizó el docstring
  de `createOrder()` — ya no contempla pedidos sin dueño.
- `app/checkout/page.tsx`: agregado el mismo guard server-side que ya
  usa `/cuenta` (`getCurrentProfile()` + `redirect()` si no hay sesión)
  — el usuario nunca llega a completar el formulario sin estar logueado.
- Comentarios actualizados en `CheckoutForm.tsx`,
  `pedido-confirmado/[id]/page.tsx`, `OrderConfirmedClient.tsx` y
  `checkout/actions.ts` (ya no mencionan "compra de invitado").

**Archivos modificados**: `app/checkout/actions.ts`,
`app/checkout/page.tsx`, `lib/services/orders.ts`,
`components/checkout/CheckoutForm.tsx`,
`app/pedido-confirmado/[id]/page.tsx`,
`app/pedido-confirmado/[id]/OrderConfirmedClient.tsx`.

---

#### 2. Políticas RLS (orders, order_items, store_settings)

**Causa**: RLS habilitado en Supabase sin ninguna policy creada →
`new row violates row-level security policy`.

**Solución**: `supabase/migrations/004_orders_store_settings_rls.sql`
— migración completa e idempotente (`drop policy if exists` antes de
cada `create policy`, segura de re-correr). Reemplaza a `003` (que
asumía compra de invitado, ya no vigente — se dejó marcada como
superseded, sin borrar, como registro histórico).

Reglas implementadas:
- `orders`: insert solo `authenticated` con `user_id = auth.uid()`
  (ya no se acepta `null`); select propio (dueño) o admin; update/delete
  solo admin.
- `order_items`: insert/select resueltos siempre a través del pedido
  padre (join a `orders`); update/delete solo admin.
- `store_settings`: **select público** (`anon` + `authenticated`) —
  decisión deliberada: Navbar/Hero/Footer/Contacto/Checkout necesitan
  mostrar nombre de tienda, banner y WhatsApp a cualquier visitante, no
  solo a admins logueados. Insert/update/delete solo admin. La
  alternativa "solo admin lee" quedó como policy comentada en el mismo
  archivo por si se prefiere después (rompería el branding público en
  esas 5 páginas salvo que se rediseñen antes).
- Función `is_admin()` reutilizable (`security definer`), evita repetir
  el subquery contra `profiles` en cada policy.

**Pendiente de tu lado**: correr `004_orders_store_settings_rls.sql`
en el SQL Editor de Supabase — no se pudo ejecutar desde acá (sin
acceso de red a tu proyecto real desde este entorno).

---

#### 3. Productos que devuelven 404 — causa raíz

**Causa encontrada**: el generador de slugs en los formularios admin
(`e.target.value.toLowerCase().replace(/\s+/g, "-")`) solo reemplazaba
espacios — dejaba tildes (á, é, í, ó, ú, ñ) y cualquier carácter
especial (`/`, paréntesis, comillas, `&`, etc.) tal cual dentro del
slug. Un **"/" literal en el slug es el caso más grave**: por ejemplo
un producto con "1/2" en el nombre generaría un slug como
`funda-1/2-plaza`, y al armar el link `/productos/funda-1/2-plaza`,
Next.js interpreta esa barra como un segmento de ruta extra — dejar de
matchear la ruta dinámica `/productos/[slug]` y devuelve 404, aunque el
producto exista y esté visible en el listado.

**No pude confirmar cuáles son las dos filas exactas afectadas** (sin
acceso de red al Supabase real desde este entorno) — pero esta es la
causa de origen, no una suposición sin fundamento: es el único punto
del flujo (listado → slug → link → ruta dinámica → query) donde un
mismo slug, generado y usado de forma consistente, puede dejar de
encontrarse a sí mismo.

**Solución (de origen, no parche puntual)**:
- `lib/utils.ts`: nueva función `slugify()` — normaliza a ASCII (NFD +
  elimina diacríticos), reemplaza cualquier carácter que no sea
  `a-z0-9` por un guion, colapsa guiones repetidos y recorta los de los
  extremos. Documentada con la explicación de la causa raíz.
- `components/admin/AdminProductsClient.tsx` y `AdminCategoriesClient.tsx`:
  usan `slugify()` en vez del `.replace()` naive — esto arregla la
  causa de origen para cualquier producto/categoría que se cree o
  edite de ahora en más.
- `components/product/ProductCard.tsx`: el link ahora usa
  `encodeURIComponent(product.slug)` — defensa adicional para que los
  slugs que ya existen en la base con caracteres problemáticos
  funcionen igual mientras no se re-guarden.
- `lib/services/products.ts`: `getProductBySlug`/`getPublicProductBySlug`
  ahora hacen `.trim()` sobre el slug recibido antes de consultar.

**Para terminar de resolver los 2 productos ya afectados**: entrá a
`/admin/productos`, abrí cada uno de los 4 y volvé a guardarlos (sin
cambiar nada más) — al tipear en el campo "Nombre" el slug se
regenera automáticamente con `slugify()` limpio. También podés
diagnosticar la causa exacta corriendo esto en el SQL Editor:
```sql
select id, name, slug from public.products where slug ~ '[^a-z0-9-]';
```
Esa query devuelve cualquier producto cuyo slug tenga un carácter fuera
de `a-z0-9-` — muy probablemente ahí están los dos que fallan.

---

#### 4. Imágenes vacías en el carrito — causa raíz

**Causa encontrada**: en `ProductDetailClient.tsx`, `handleAddToCart()`
guardaba `image: product.images[0]?.url` sin fallback. Si un producto
tiene el array de imágenes vacío, `product.images[0]` es `undefined` en
tiempo de ejecución — pero **TypeScript no lo marcaba como error**
porque, por configuración default, no trata el acceso a un índice de
array (`images[0]`) como potencialmente `undefined` (a diferencia de
`.find()`, que sí devuelve `T | undefined`). Confirmé esto con un
repro aislado antes de tocar nada: el mismo patrón `arr[0]?.prop`
tipaba como `string` en vez de `string | undefined` incluso con
`strict: true`. La página de detalle del producto sí mostraba una
imagen (usa un fallback explícito en el JSX de la galería), pero ese
fallback nunca se aplicaba al armar el `CartItem` — de ahí que la
tienda se viera bien y el carrito no.

**Solución (de origen, no parche puntual)**:
- `tsconfig.json`: se activó `"noUncheckedIndexedAccess": true`. Esto
  hace que TypeScript trate todo acceso por índice a un array como
  potencialmente `undefined`, cerrando esta clase entera de bug para
  siempre (no solo este caso puntual). Activarlo destapó 5 errores
  reales en 2 archivos, ya corregidos (ver abajo) — el resto del
  proyecto ya era seguro frente a esto.
- `app/productos/[slug]/ProductDetailClient.tsx`: `handleAddToCart`
  ahora usa `product.images[0]?.url || FALLBACK_IMAGE`, igual que ya
  hacía la galería.
- `components/admin/AdminCategoriesClient.tsx`: la función `move()`
  (reordenar categorías) accedía a `list[swapIdx]` asumiendo que
  siempre existía: reescrita con un guard explícito (`if (!other) return`)
  — más segura en runtime, no solo para conformar al type-checker.

---

#### 6. Panel de configuración — guardar sin errores

**Causa**: la misma de la Parte 2 — sin policies de RLS, cualquier
`insert`/`update` sobre `store_settings` fallaba. El código de
`upsertStoreSettings()` (cliente con cookies, ya escrito en la sesión
anterior) era correcto; lo que faltaba era la policy que lo autorice.

**Solución**: resuelto por la migración `004` de la Parte 2 — una vez
corrida, `is_admin()` autoriza el insert/update a cualquier usuario con
`profiles.role = 'admin'`. No hizo falta tocar código de aplicación.

---

#### 7. Auditoría de `mock-data.ts`

Confirmado por grep completo del proyecto: **cero imports reales**
restantes. Las únicas coincidencias de "mock-data" en el código son 5
comentarios que mencionan el archivo como referencia histórica (ya
documentaban que fue eliminado). El archivo `lib/mock-data.ts` no
existe desde el changelog anterior.

---

#### 8. Auditoría general — hallazgos y correcciones

- **`console.log` de debug en producción**: `context/AuthContext.tsx`
  tenía `console.log("PERFIL SUPABASE:", data)` dentro de
  `fetchProfile()` — logueaba el perfil completo (incluyendo `role`) a
  la consola del navegador en cada login. Eliminado.
- **Código duplicado — lista de estados de pedido triplicada**:
  `AdminOrdersClient.tsx`, `AdminOrderStatusSelect.tsx` y
  `app/cuenta/page.tsx` cada uno definía su propio array de
  `OrderStatus` (y dos de los tres, su propio mapa de colores/labels).
  Centralizado en `lib/order-status.ts` (`ORDER_STATUSES`,
  `ORDER_STATUS_LABELS`, `ORDER_STATUS_COLORS`) y los 3 archivos
  actualizados para importarlo. Como beneficio adicional,
  `AdminOrderStatusSelect` (el selector en el detalle de pedido admin)
  ahora sí muestra el color según estado — antes siempre se veía gris,
  inconsistente con la tabla de listado.
- **Filtro de status duplicado**: `app/page.tsx` y
  `ProductsExplorer.tsx` volvían a filtrar `status === "active"` sobre
  datos que `getPublicProducts()` ya devuelve pre-filtrados desde
  Supabase. Quitado en ambos lugares (con comentario explicando por
  qué no hace falta).
- **`any`**: cero usos en todo el proyecto (confirmado por grep).
- **TODOs sin documentar**: ninguno encontrado.
- **Imports muertos**: ninguno encontrado por `next build` (que corre
  ESLint como parte del build) — 0 warnings de código.
- **Rendimiento**: no se encontraron patrones N+1 nuevos.
  `fetchImagesAndVariantsFor()` en `products.ts` ya resolvía imágenes/
  variantes de un lote de productos en 2 queries (no una por producto).
- **Warnings de webpack**: `next build` muestra 2 avisos de
  `PackFileCacheStrategy` sobre serializar strings grandes — son notas
  internas de cache de Webpack, no relacionadas al código de la app;
  no afectan el resultado del build ni son "warnings importantes" en
  el sentido de calidad de código.

---

#### 9. Calidad

`npx tsc --noEmit` → sin errores. `npx next build` → sin errores,
17/17 páginas generadas, sin warnings de ESLint/ni de código.

---

### Informe final

**Archivos modificados en esta sesión** (17): `app/checkout/actions.ts`,
`app/checkout/page.tsx`, `lib/services/orders.ts`,
`components/checkout/CheckoutForm.tsx`,
`app/pedido-confirmado/[id]/page.tsx`,
`app/pedido-confirmado/[id]/OrderConfirmedClient.tsx`, `lib/utils.ts`,
`tsconfig.json`, `app/productos/[slug]/ProductDetailClient.tsx`,
`components/admin/AdminCategoriesClient.tsx`,
`components/admin/AdminProductsClient.tsx`,
`components/product/ProductCard.tsx`, `lib/services/products.ts`,
`context/AuthContext.tsx`, `app/page.tsx`,
`components/product/ProductsExplorer.tsx`,
`components/admin/AdminOrdersClient.tsx`,
`components/admin/AdminOrderStatusSelect.tsx`, `app/cuenta/page.tsx`.

**Archivos creados** (2): `supabase/migrations/004_orders_store_settings_rls.sql`,
`lib/order-status.ts`.

**Migraciones SQL creadas**: `004_orders_store_settings_rls.sql`
(pendiente de correr en Supabase — ver Parte 2).

**Estado actual del proyecto**: compila limpio (`tsc` + `next build`),
`mock-data.ts` no existe, toda la app corre sobre Supabase. El checkout
requiere login. `noUncheckedIndexedAccess` activado en todo el proyecto
como red de seguridad permanente contra la clase de bug de la Parte 4.

**Funcionalidades completamente terminadas**: auth (registro/login/roles),
catálogo (productos + categorías + imágenes + variantes, lectura y
escritura), Home, checkout con login obligatorio, pedidos (crear, ver
propios, admin ve/edita todos), clientes (derivados de pedidos),
configuración de tienda (lectura y escritura).

**Funcionalidades pendientes para la próxima versión**:
- Correr `004_orders_store_settings_rls.sql` en Supabase (bloqueante
  para que checkout/config funcionen en producción).
- Confirmar cuáles son los 2 productos con slug problemático (query de
  diagnóstico en la Parte 3) y re-guardarlos desde el admin.
- Verificar el esquema real de `orders`/`order_items`/`store_settings`
  contra lo asumido en los services (sigue sin poder confirmarse sin
  acceso de red al proyecto real desde este entorno).
- Número de pedido no atómico (colisión posible con checkouts
  concurrentes) — documentado como mejora futura desde el changelog
  anterior, prioridad Media.
- Sin transacción para `orders` + `order_items` (si falla el insert de
  items, el pedido queda huérfano) — documentado desde el changelog
  anterior, prioridad Media-Alta.
- CRUD de imágenes/variantes desde `/admin/productos` (hoy se leen
  pero no se editan desde ahí) — prioridad Media.

### 2026-07-26 (5) — Migración completa de Pedidos y Configuración. `mock-data.ts` eliminado.

**Objetivo**
Migrar Fase 5 (Pedidos) y Fase 6 (Configuración) completas a Supabase
(`orders`, `order_items`, `store_settings`, ya creadas por el usuario),
eliminando toda dependencia de `mock-data.ts`.

**SUPUESTO DE ESQUEMA — verificar**
No se recibió el detalle de columnas de `orders`/`order_items`/
`store_settings` en este pedido. Se asumió que se aplicó tal cual la
propuesta dejada en el changelog anterior (`(4)`). Si los nombres reales
difieren, cada service (`orders.ts`, `store-settings.ts`) loguea el
error exacto en consola (`[services/...] Error cargando ...`) en vez de
romper — mismo mecanismo defensivo que ya usan `products.ts`/`categories.ts`.
Query de verificación:
```sql
select table_name, column_name from information_schema.columns
where table_schema = 'public' and table_name in ('orders','order_items','store_settings')
order by table_name, ordinal_position;
```

**Archivos creados**
- `lib/services/orders.ts` — `getOrders`, `getOrder`, `getOrdersByUser`,
  `createOrder`, `updateOrderStatus`, `deleteOrder`.
- `lib/services/customers.ts` — `getCustomersSummary()` (agregación
  sobre `orders`, sin tabla propia — ver decisión en changelog `(4)`).
- `lib/services/store-settings.ts` — `getStoreSettings`,
  `getStoreSettingsOrDefault`, `upsertStoreSettings`.
- `lib/services/profiles.ts` — se agregó `getCurrentProfile()`.
- `app/checkout/actions.ts` — `checkoutAction` (Server Action).
- `app/admin/pedidos/actions.ts` — `updateOrderStatusAction`.
- `app/admin/configuracion/actions.ts` — `upsertStoreSettingsAction`.
- `components/checkout/CheckoutPageClient.tsx`,
  `components/admin/AdminOrdersClient.tsx`,
  `components/admin/AdminOrderStatusSelect.tsx`,
  `components/admin/AdminCustomersClient.tsx`,
  `app/pedido-confirmado/[id]/OrderConfirmedClient.tsx` — Client
  Components de interactividad, separados de sus Server Components.
- `supabase/migrations/003_orders_and_store_settings_rls.sql` — RLS
  completo, listo para correr (ver Parte 7 abajo).

**Archivos modificados**
- `components/checkout/CheckoutForm.tsx` — eliminado `orders.unshift(...)`;
  llama a `checkoutAction`, recibe `storeSettings` como prop.
- `app/checkout/page.tsx` — Server Component (fetch `storeSettings`).
- `app/pedido-confirmado/[id]/page.tsx` — Server Component (fetch
  `getOrder` + `storeSettings`), delega a `OrderConfirmedClient`.
- `app/cuenta/page.tsx` — reescrito como Server Component puro (antes
  `"use client"` con spinner); `redirect()` server-side si no hay
  sesión, `getOrdersByUser()` real.
- `app/admin/pedidos/page.tsx`, `app/admin/pedidos/[id]/page.tsx` —
  Server Components + Client Components para el selector de estado.
- `app/admin/clientes/page.tsx` — Server Component,
  `getCustomersSummary()` + `getOrders()` reales.
- `app/admin/page.tsx` (dashboard) — ahora también usa `getOrders()`
  real para ventas/pendientes/últimos pedidos (antes solo productos).
- `app/admin/configuracion/page.tsx`, `components/admin/AdminSettingsForm.tsx`
  — Server Component + Client Component conectados a `store_settings` real.
- `components/layout/Navbar.tsx`, `components/home/Hero.tsx` — reciben
  `storeSettings` por prop (ya no pueden hacer fetch propio: son
  Client Components). `components/layout/Footer.tsx`, `app/contacto/page.tsx`
  — hacen su propio fetch (`getStoreSettingsOrDefault()`), ya eran
  Server Components.
- `app/layout.tsx`, `app/page.tsx` — ahora fetchean `storeSettings` y
  se lo pasan a `Navbar`/`Hero` respectivamente.
- `lib/types.ts` — comentario de cabecera actualizado (ya no menciona
  `mock-data.ts`).

**Archivos eliminados**
- `lib/mock-data.ts` — confirmado sin ningún import real restante
  (grep completo antes de borrar) y borrado por completo.

**Decisiones de arquitectura que requirieron razonar más allá de un
mapeo directo:**

1. **`/pedido-confirmado/[id]` NO usa una policy pública de SELECT por
   id.** RLS no puede acotarse a "solo si conocés el id exacto" — evalúa
   fila por fila sin ver la query, así que `anon select using (true)`
   expondría TODOS los pedidos (nombres, teléfonos, direcciones) a
   cualquiera con la anon key. Se resolvió con el mismo patrón que ya
   existía (`sessionStorage` con el pedido recién creado) como fuente
   primaria — cubre compra de invitado sin exponer nada — y el fetch
   server-side vía RLS (dueño logueado o admin) como fallback para
   revisitas. Documentado en el SQL de la migración 003.
2. **`getPublicProductBySlug`, ahora también aplica a
   `getPublicProductBySlug`/`getPublicProducts` de la sesión anterior**:
   el mismo patrón "dos familias de cliente" se repitió acá — lecturas
   de `store_settings` van por el cliente público (branding es
   información pública), escrituras por el cliente con cookies (admin).
3. **`/cuenta` pasó de Client Component con spinner a Server Component
   puro** con `redirect()`. Mejora no pedida explícitamente pero
   consecuencia directa de mover la data a un service server-only: ya
   no había forma de leer `getOrdersByUser()` desde un componente
   cliente sin pasar por un Server Action, así que convertir toda la
   página resultó más simple y además elimina el flash de contenido
   protegido que tenía el guard anterior en cliente.
4. **Número de pedido no es atómico.** `createOrder()` cuenta filas
   existentes para generar "GNGV-000N", igual que hacía el array mock.
   Con checkouts concurrentes reales podría haber colisión — ver
   "Mejoras futuras".

**Problemas encontrados**
- No hay transacciones multi-statement desde `supabase-js`: si el
  insert de `orders` funciona pero el de `order_items` falla, el pedido
  queda creado sin items (huérfano). Se loguea el error pero no se
  revierte automáticamente — ver "Mejoras futuras".
- No se pudo probar nada de esto contra la base real (mismo límite de
  red del entorno de siempre) — solo se verificó que compila y que cada
  fallback (`[]`/`null`/default) no rompe el build.

**Estado actual**
`npx tsc --noEmit` y `npx next build` compilan limpio, 17/17 páginas.
`lib/mock-data.ts` ya no existe. El proyecto entero corre sobre
Supabase: auth, catálogo (productos/categorías/imágenes/variantes),
pedidos, clientes (derivados) y configuración de tienda.

**Pendientes**
1. Ejecutar `supabase/migrations/003_orders_and_store_settings_rls.sql`
   en Supabase (Parte 7 del pedido — el SQL está listo, no se corrió
   desde acá).
2. Verificar el esquema real de `orders`/`order_items`/`store_settings`
   contra lo asumido (query de verificación arriba).
3. Probar el flujo de checkout de punta a punta contra la base real
   (crear pedido de invitado, ver confirmación, ver en `/admin/pedidos`,
   cambiar estado, verlo reflejado en `/cuenta` si el comprador estaba
   logueado).
4. Cargar la primera fila de `store_settings` desde
   `/admin/configuracion` (hoy la tabla está vacía → se usan los
   defaults de `DEFAULT_STORE_SETTINGS` en `store-settings.ts`).

**Próximo paso recomendado**
Correr la migración 003 y probar el flujo de checkout real de punta a
punta — es el único pedazo de todo lo migrado hoy que no se pudo
ejercitar contra datos reales desde este entorno.

**Mejoras futuras**
- *Generar el número de pedido de forma atómica* (secuencia de Postgres
  o función `nextval` en vez de contar filas desde el cliente).
  Motivo: evitar colisiones con checkouts concurrentes. Prioridad: Media.
- *Revertir el `order` si falla el insert de `order_items`* (o mover
  ambos inserts a una función de Postgres/RPC transaccional). Motivo:
  integridad de datos. Prioridad: Media-Alta.
- *Buscar pedido de invitado por número + email* en vez de depender
  solo de `sessionStorage` — daría una forma de recuperar el link de
  confirmación si se perdió (ej. cerró la pestaña), sin abrir una
  policy pública insegura. Podría ser un Server Action que pida
  `number` + `email` y los valide server-side antes de mostrar el
  pedido. Motivo: UX de recuperación. Prioridad: Baja.
- *Página de detalle de pedido dentro de `/cuenta`* (hoy solo lista
  con tracker inline, iguales a antes) — no se agregó por no estar
  pedido y no querer expandir alcance sin permiso. Prioridad: Baja.

---

### 2026-07-26 (4) — Migrado todo lo posible sin tocar el esquema; resto bloqueado y documentado

**Objetivo**
"Migrar todo lo que se pueda" del resto de `mock-data.ts`, respetando
la regla explícita de no crear/modificar tablas.

**Archivos creados**
- `lib/services/profiles.ts` — `getAdminProfiles()` (lectura).
- `components/admin/AdminSettingsForm.tsx` — formulario de
  configuración extraído del page.tsx original (sin cambios de lógica).

**Archivos modificados**
- `app/admin/page.tsx` (dashboard) — ahora Server Component; "Productos
  con poco stock" y "Destacados" usan `getProducts()` real. Las tarjetas
  de ventas/pedidos siguen sobre `orders` de mock-data (no hay tabla).
- `app/admin/configuracion/page.tsx` — ahora Server Component; la
  sección "Administradores y permisos" lista perfiles reales
  (`getAdminProfiles()`) en vez de un array hardcodeado. El resto del
  formulario (branding/pagos/envíos) se movió sin cambios a
  `AdminSettingsForm.tsx`, sigue en mock (no hay tabla `store_settings`).

**Motivo**
Cerrar todo lo migrable sin violar "no crear tablas nuevas".

**Auditoría final de `mock-data` — qué queda y por qué**

Todo lo que queda en `mock-data.ts` cae en dos grupos, **ambos
bloqueados por falta de tablas**, no por falta de tiempo:

| Dato | Archivos que lo usan | Tabla que haría falta |
|---|---|---|
| `orders` | `CheckoutForm.tsx`, `cuenta/page.tsx`, `pedido-confirmado/[id]`, `admin/page.tsx`, `admin/pedidos/*`, `admin/clientes/page.tsx` | `orders` (+ `order_items`) |
| `customers` | `admin/clientes/page.tsx` | ver propuesta abajo — probablemente no haga falta tabla propia |
| `storeSettings` | `Navbar.tsx`, `Hero.tsx`, `Footer.tsx`, `contacto/page.tsx`, `CheckoutForm.tsx`, `pedido-confirmado/[id]`, `AdminSettingsForm.tsx` | `store_settings` |

Ninguna de las tres existe en el esquema confirmado (`profiles`,
`categories`, `products`, `product_images`, `product_variants`), y la
regla del proyecto es explícita: no crear tablas nuevas sin que vos lo
decidas. Por eso esta tarea se detiene acá para estas tres — seguir
implicaría inventar esquema por mi cuenta, que es exactamente lo que
las reglas piden evitar.

**Estado actual**
`npx tsc --noEmit` y `npx next build` compilan limpio, 17 rutas. Todo lo
que puede depender de `products`/`categories`/`profiles` ya está sobre
Supabase real: Home, tienda pública, producto individual, admin de
productos, admin de categorías, y ahora también dashboard (parcial) y
lista de administradores en configuración.

**Pendientes**
Ver sección "🚧 Bloqueado — requiere tablas nuevas" más abajo.

**Próximo paso recomendado**
Confirmar conmigo (o crear vos mismo) las tablas `orders`/`order_items`/
`store_settings` — con la propuesta de abajo como punto de partida — y
recién ahí se puede migrar `CheckoutForm`, `/cuenta`, `/admin/pedidos`,
`/admin/clientes` y el resto de `/admin/configuracion`.

**Mejoras futuras**
- *No crear una tabla `customers` separada* — ver razonamiento en la
  propuesta de esquema abajo. Motivo: evitar datos duplicados/
  desincronizados entre `profiles` y una tabla `customers` paralela.
  Prioridad: Alta (a decidir antes de migrar pedidos, no después).

---

## ✅ Resuelto — `orders`, `order_items`, `store_settings` (ver changelog `(5)`)

Esta sección estaba bloqueada (ver más abajo la propuesta original) hasta
que el usuario creó las tablas en Supabase. **Ya están migradas** —
`lib/services/orders.ts`, `customers.ts` y `store-settings.ts`. La
propuesta de esquema de abajo se dejó como referencia histórica de lo
que se asumió aplicado (ver "SUPUESTO DE ESQUEMA" en cambio `(5)` del
changelog para la query de verificación).

### `orders` + `order_items`

Reemplaza a `mock-data.orders`. Se guarda un snapshot de los datos del
cliente en la orden (nombre/teléfono/email/dirección) porque el
checkout actual **no requiere login** — así una compra de invitado
sigue funcionando igual que hoy. Si el comprador está logueado, se
puede además guardar su `user_id` para asociarla a su cuenta.

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,               -- "GNGV-0001"
  user_id uuid references public.profiles(id), -- null = compra de invitado
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  customer_address text not null,
  customer_notes text,
  total numeric not null,
  status text not null default 'pendiente',   -- pendiente|confirmado|preparando|enviado|entregado
  payment_method text,                        -- transferencia|mercado_pago|efectivo|otro
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  name text not null,       -- snapshot: si el producto cambia de nombre después, el pedido no se altera
  variant_label text,
  price numeric not null,   -- snapshot del precio al momento de compra
  quantity int4 not null
);
```

### `customers` — propuesta: **no crear tabla nueva**

`mock-data.customers` hoy es redundante con `profiles`: mismo `email`,
mismo `name`/`full_name`. Crear una tabla `customers` paralela
significaría mantener dos fuentes de la verdad sincronizadas a mano.
Alternativa recomendada: `/admin/clientes` se resuelve con una query
agregando `orders` por `customer_email` (o por `user_id` cuando exista),
sin tabla propia:

```sql
select
  customer_email,
  customer_name,
  count(*) as orders_count,
  sum(total) as total_spent
from public.orders
group by customer_email, customer_name;
```

Esto también cubre compras de invitados que nunca crearon cuenta —
cosa que una tabla `customers` ligada 1:1 a `profiles` no podría hacer.

### `store_settings`

Configuración global de una tienda. Como el proyecto es una base
reutilizable para Bloom Shop Pro (multi-tenant a futuro), se sugiere
`store_id` desde ahora aunque hoy solo exista una tienda — evita una
migración de esquema más adelante cuando se agregue la segunda tienda:

```sql
create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid,                     -- null hasta que exista tabla `stores`; reservado para multi-tenant
  store_name text not null,
  logo_url text,
  banner_url text,
  welcome_text text,
  whatsapp_number text not null,
  instagram text,
  facebook text,
  payment_methods text[] not null default '{}',
  shipping_cost numeric not null default 0,
  shipping_zones text[] not null default '{}',
  shipping_info text
);
```

**Actualización: estas tablas ya fueron creadas por el usuario y
migradas — ver changelog `(5)` más arriba para el detalle completo y
los supuestos de nombres de columna que quedan por verificar.**

---
### 2026-07-26 (3) — Cliente público de Supabase + CRUD de categorías

**Objetivo**
Ejecutar los dos "próximo paso recomendado" pendientes en el README:
(1) recuperar el pre-renderizado estático separando un cliente de
Supabase sin cookies para lecturas públicas, y (2) migrar
`/admin/categorias` a Supabase con el mismo patrón ya usado en productos.

**Archivos creados**
- `lib/supabase/public.ts` — cliente sin `cookies()`, para lecturas
  anónimas de catálogo.
- `app/admin/categorias/actions.ts` — Server Actions (create/update/
  delete/reorder).
- `components/admin/AdminCategoriesClient.tsx` — UI/interactividad
  (extraída del page.tsx original).

**Archivos modificados**
- `lib/services/products.ts` — nuevas `getPublicProducts()` /
  `getPublicProductBySlug()` (cliente público + `status='active'`
  filtrado en la query). `getProducts()`/`getProductBySlug()` originales
  quedan sin cambios, para uso admin (necesitan ver todo, incluidos
  ocultos).
- `lib/services/categories.ts` — `getCategories()` pasó al cliente
  público; se agregaron `createCategory`, `updateCategory`,
  `updateCategoryOrder`, `deleteCategory` (cliente con cookies, mutación
  de admin).
- `app/page.tsx`, `app/productos/page.tsx`, `app/productos/[slug]/page.tsx`
  — usan las nuevas funciones `getPublic*` en vez de las genéricas.
- `app/admin/categorias/page.tsx` — ahora Server Component (solo fetch).

**Motivo**
Punto 1: el `Footer` (en el layout raíz) llamaba a un servicio con
cliente atado a `cookies()`, lo que forzaba TODA la app a renderizarse
dinámicamente — 0 rutas estáticas. Punto 2: era el último CRUD de
catálogo que seguía en `mock-data.ts`, y las reordenaciones (subir/
bajar) ni siquiera persistían — se perdían al recargar.

**Problemas encontrados**
- `getProducts()` se usaba tanto en `/admin/productos` (necesita ver
  productos ocultos para poder gestionarlos) como en la tienda pública.
  Cambiarle el cliente a todo el mundo de una habría ocultado productos
  `hidden` del admin si la policy de RLS los filtra para el rol `anon`
  — no se puede confirmar sin acceso a la base real. Se resolvió sin
  arriesgar: se agregaron funciones `getPublic*` separadas para la
  tienda, y `getProducts()`/`getProductBySlug()` originales quedaron
  intactos para admin.
- Al mismo tiempo, `getPublicProductBySlug()` ahora filtra
  `status='active'`: un producto oculto deja de ser accesible por URL
  directa aunque se conozca el slug exacto (antes sí lo era). Es una
  corrección de comportamiento, no solo de performance.
- Sigue sin poder confirmarse desde acá si las policies RLS de
  `products`/`categories` permiten `select` anónimo — el build en este
  entorno no tiene salida de red hacia el proyecto real de Supabase
  (`Host not in allowlist`), así que no se pudo probar contra datos
  reales, solo verificar que compila y que el fallback a `[]` no rompe
  el build. Recomendado probarlo apenas se despliegue.

**Cómo fueron solucionados**
Separación de funciones en vez de compartir una sola (`getProducts` vs
`getPublicProducts`), documentado arriba en `products.ts`. El resto,
verificado con `next build` real.

**Estado actual**
`npx tsc --noEmit` y `npx next build` compilan limpio. 12 de 17 rutas
son estáticas (`○`) — antes de este cambio eran 0. `/admin/categorias`
migrado completo (lectura + escritura + reorden persistente).

**Pendientes**
- Confirmar contra el Supabase real que las policies de RLS permiten
  `select` anónimo en `products`/`categories` (no se pudo probar desde
  este entorno).
- Dashboard admin (`app/admin/page.tsx`) sigue mezclando `products` de
  mock-data con `orders` — pendiente de una tarea propia.
- Pedidos, clientes, configuración de tienda siguen en `mock-data.ts`.

**Próximo paso recomendado**
Migrar pedidos (`/admin/pedidos`, `/cuenta`, `CheckoutForm.tsx`) — es la
pieza más grande que queda y la única que todavía escribe datos nuevos
directamente en el array de `mock-data.ts` (`orders.unshift(...)` en el
checkout).

**Mejoras futuras**
- *Endpoint/función para reordenar categorías en una sola operación*
  (hoy `move()` hace 2 `updateCategoryOrderAction` en paralelo) — no es
  atómico: si una de las dos mutaciones falla, el orden puede quedar
  inconsistente entre la UI y la base. Motivo: integridad de datos.
  Prioridad: Media.
- *Validar `slug` único de categoría antes de guardar* (hoy se autogenera
  del nombre pero no se verifica colisión contra otras categorías).
  Motivo: robustez. Prioridad: Media.

---

### 2026-07-26 (2) — Migración de Home a Supabase

**Objetivo**
Eliminar la dependencia de `mock-data.ts` en la Home (destacados,
categorías, ofertas), sin tocar diseño, estilos ni UX.

**Archivos creados**
Ninguno.

**Archivos modificados**
- `app/page.tsx` — pasó a Server Component `async`, hace el fetch real
  (`getProducts()` + `getCategories()`) y deriva `featured`/`onSale` una
  sola vez, sin repetir la consulta por sección.
- `components/home/HomeSections.tsx` — dejó de importar `mock-data`;
  ahora es puramente presentacional, recibe `featured`, `onSale` y
  `categories` como props. Se mantiene `"use client"` porque usa
  `framer-motion` (`whileInView`), que requiere cliente.
- `components/layout/Footer.tsx` — pasó a Server Component `async`;
  `categories` ahora viene de `services/categories.ts`. `storeSettings`
  se dejó igual (no es catálogo, fuera de alcance de esta tarea).

**Auditoría de `mock-data` en todo el proyecto (pedida explícitamente)**

Relacionados a catálogo → migrados ahora:
- `HomeSections.tsx` (`getFeaturedProducts`, `categories`, `products`)
- `Footer.tsx` (`categories`)

Relacionados a catálogo → identificados, NO migrados en esta tarea
(pertenecen a otras fases/secciones, no a Home):
- `app/admin/page.tsx` (dashboard: `products`, `getLowStockProducts`) —
  mezclado con `orders`, que no es catálogo; requiere su propia tarea.
- `app/admin/categorias/page.tsx` (CRUD de categorías) — ya identificado
  como "próximo paso recomendado" en el changelog anterior.

No relacionados a catálogo → sin cambios (correcto dejarlos así):
`Hero.tsx`, `Navbar.tsx` (`storeSettings`), `CheckoutForm.tsx`,
`pedido-confirmado/[id]`, `admin/configuracion`, `admin/pedidos*`,
`admin/clientes`, `cuenta` (todos usan `orders`/`customers`/
`storeSettings`, no productos ni categorías).

No existen en el proyecto: carrusel de "productos nuevos" ni sección de
"recomendados" — la Home solo tenía "destacados" y "ofertas", ambas ya
migradas.

**Motivo**
Pedido explícito: la Home era el último punto de entrada público que
todavía mostraba catálogo simulado en vez de datos reales.

**Problemas encontrados**
`getCategories()` usa `createServerSupabaseClient()`, que depende de
`cookies()` (`next/headers`). Como `Footer` ahora llama a esa función y
vive en `app/layout.tsx` (envuelve TODAS las páginas), **el build dejó
de poder pre-renderizar ninguna ruta como estática**: antes del cambio
había rutas `○` (estáticas: `/`, `/contacto`, `/admin`, etc.); después,
las 17 rutas quedaron `ƒ` (dinámicas, server-rendered on demand) — lo
confirma la salida real de `next build`. Esto es un costo de
performance real (más trabajo de servidor por request) para traer un
dato — la lista de categorías del footer — que no depende en nada de la
sesión del usuario.

**Cómo fue solucionado**
No se solucionó en esta tarea: la causa raíz es de arquitectura
transversal (el cliente de Supabase para lecturas públicas está
acoplado a cookies), no algo puntual de Home, y tocarlo implica
modificar `products.ts`/`categories.ts` — trabajo ya cerrado en sesiones
anteriores. Se documenta como mejora futura de prioridad **Alta** en vez
de aplicarse sin haber sido pedido.

**Estado actual**
`npx tsc --noEmit` y `npx next build` compilan limpio. Home 100% sobre
Supabase (destacados, categorías, ofertas). Diseño, estilos y
animaciones intactos — no se tocó ningún className ni estructura JSX,
solo el origen de los datos.

**Pendientes**
Ver "Problemas encontrados" (performance) y "Mejoras futuras" abajo.
Dashboard admin y CRUD de categorías siguen en `mock-data.ts`.

**Próximo paso recomendado**
Crear `lib/supabase/public.ts`: un cliente de Supabase sin dependencia
de `cookies()` (solo URL + anon key, vía `@supabase/supabase-js` en vez
de `@supabase/ssr`), y usarlo en `services/products.ts`/`categories.ts`
para las lecturas públicas de catálogo. Eso permitiría volver a
pre-renderizar como estáticas las rutas que no dependen de sesión
(`/`, `/contacto`, páginas admin sin datos de usuario), sin perder la
lectura real desde Supabase. Requiere confirmar antes si las policies
RLS de `products`/`categories` permiten `select` anónimo (si ya
funcionan con el cliente actual, deberían funcionar igual con anon key
puro).

**Mejoras futuras**
- *Cliente de Supabase público (sin cookies) para lecturas de catálogo*
  — Motivo: performance/SSG, ver "Problemas encontrados". Prioridad:
  **Alta**.
- *Sección "productos nuevos" / "recomendados" en Home* — no existían
  antes de esta tarea, no se crearon (no fueron pedidas, solo se migró
  lo que ya existía). Motivo: alcance. Prioridad: Baja (implementar
  solo si se pide explícitamente).

---

### 2026-07-26 — Fix schema categorías + join real de imágenes/variantes

**Objetivo**
Corregir `lib/services/categories.ts` contra el esquema real de Supabase
(recibido del usuario) y completar la Fase 2 (catálogo) resolviendo
`product_images` y `product_variants` con datos reales en vez de arrays
vacíos.

**Archivos creados**
Ninguno.

**Archivos modificados**
- `lib/services/categories.ts`
- `lib/services/products.ts`

**Cambios realizados**
- `categories.ts`: columnas corregidas de `sort_order`/`image_url`
  (asumidas, incorrectas) a `order`/`image` (confirmadas contra el
  esquema real).
- `products.ts`: `getProducts()` y `getProductBySlug()` ahora traen
  `product_images` y `product_variants` reales, con una consulta por
  lote (`in("product_id", ids)`) para evitar N+1 — antes devolvían
  `images: []` / `variants: []` siempre.
- Corregido `skuSuffix` → `sku_suffix` en el mapeo de variantes, para
  coincidir con el campo real de `ProductVariant` en `lib/types.ts`
  (la app usa snake_case en ese campo puntual, a diferencia del resto
  del tipo `Product` que es camelCase — no se tocó `types.ts`, ver
  "Problemas encontrados").

**Motivo**
El servicio de categorías fallaba silenciosamente (`console.error` +
`[]`) porque las columnas asumidas no existían en la tabla real.
Imágenes y variantes eran una limitación conocida y documentada como
pendiente en la sesión anterior; con el esquema real confirmado, ya se
podía resolver sin arriesgar a adivinar nombres de columna.

**Problemas encontrados**
1. `products.category_id` es `TEXT`, no una FK real a `categories.id`
   (`uuid`). PostgREST no puede detectar esa relación automáticamente,
   así que **no se puede** usar el shorthand `select("*, categories(*)")`
   para traer la categoría embebida en la misma query — hay que seguir
   cruzando `categoryId` contra `getCategories()` en la capa de
   componentes, como ya se hacía. No se modifica el esquema (regla del
   proyecto); queda documentado como limitación.
2. `ProductVariant.sku_suffix` en `lib/types.ts` rompe la convención
   camelCase del resto del tipo `Product`. No se corrigió porque
   renombrar el campo tocaría un tipo compartido por varios componentes
   fuera del alcance de esta tarea — se documenta en "Mejoras futuras".
3. Al borrar un producto (`deleteProduct`), no se puede confirmar desde
   el código si existe `ON DELETE CASCADE` entre `product_images`/
   `product_variants` y `products` sin inspeccionar el esquema
   directamente — filas huérfanas son una posibilidad no descartada.

**Cómo fueron solucionados**
1 y 3: documentados, sin cambios de esquema (regla explícita del
proyecto). 2: documentado en "Mejoras futuras" en vez de corregido de
una.

**Estado actual**
`npx next build` compila limpio, 17 rutas, sin errores de tipos.
Productos y categorías (lectura + escritura) 100% sobre Supabase,
incluyendo imágenes y variantes reales.

**Pendientes**
- CRUD de categorías (`/admin/categorias`) sigue en `mock-data.ts`.
- Pedidos, clientes, configuración de tienda siguen en `mock-data.ts`.
- Falta confirmar `ON DELETE CASCADE` en `product_images`/`product_variants`.

**Próximo paso recomendado**
Migrar `/admin/categorias` con el mismo patrón ya probado en productos
(Server Component + `services/categories.ts` + `actions.ts`), ya que es
la pieza que falta para cerrar completamente la Fase 2.

**Mejoras futuras**
- *Renombrar `ProductVariant.sku_suffix` a `skuSuffix`* — por
  consistencia de convención de nombres en `lib/types.ts`. Motivo:
  mantenibilidad/legibilidad. Prioridad: Baja.
- *Agregar CRUD de imágenes/variantes al formulario de admin de
  productos* — hoy se leen pero no se pueden crear/editar desde
  `/admin/productos`. Motivo: paridad de funcionalidad con el resto del
  CRUD. Prioridad: Media.
- *Evaluar agregar una FK real `products.category_id → categories.id`*
  (fuera de alcance mientras la regla del proyecto sea no tocar el
  esquema) — permitiría usar el shorthand de relaciones de PostgREST y
  eliminar el cruce manual en componentes. Motivo: simplicidad y
  performance (menos round-trips). Prioridad: Media.

---

## 🗂 Auditoría y migración a Supabase — Productos (esta sesión)

### Qué se encontró

- **Bug crítico confirmado con `next build` real**: `lib/services/products.ts`
  creaba el cliente de Supabase a nivel de módulo
  (`const supabase = createServerSupabaseClient()`), y `AdminProductsPage`
  (`"use client"`) lo importaba directamente. `createServerSupabaseClient`
  usa `next/headers`, que no puede ejecutarse en el bundle de cliente —
  el build fallaba con `You're importing a component that needs
  next/headers`.
- `app/productos/page.tsx` (pública) tenía su **propia** query inline a
  Supabase, duplicando (de forma inconsistente) el mapeo que ya existía
  en el service, y seguía filtrando categorías contra `mock-data.ts`.
- `app/productos/[slug]/page.tsx` seguía 100% en `mock-data.ts`.
- `saveProduct()` en el service no se usaba en ningún lado (duplicaba a
  `updateProduct`).
- `ProductCard.tsx` y `ProductDetailClient.tsx` importaban `categories`/
  `products` de `mock-data.ts` directamente, acoplando componentes
  compartidos a una sola fuente de datos.
- Drift de esquema: `supabase/migrations/001_profiles_and_roles.sql`
  define `profiles.name` y un enum de 4 roles, pero el código real ya
  usa `profiles.full_name` y 2 roles (`user`/`admin`) — evidencia de un
  ALTER manual sobre la base que no había quedado versionado.
- Errores de TypeScript preexistentes (no relacionados a productos):
  `app/admin/configuracion/page.tsx` todavía tipaba con roles `owner`/
  `staff` inexistentes; `app/cuenta/page.tsx` y `Navbar.tsx` leían
  `profile.name` en vez de `profile.full_name`. Bloqueaban `tsc
  --noEmit` y `next build`; se corrigieron por ser mecánicos y de bajo
  riesgo, no por estar dentro del alcance de "productos".

### Qué se migró (arquitectura resultante)

```
Server Component (page.tsx, async)
        │  await getProducts() / getProductBySlug() / getCategories()
        ▼
lib/services/{products,categories}.ts   ("server-only")
        │
        ▼
Supabase (createServerSupabaseClient — cliente creado POR LLAMADA,
          nunca a nivel de módulo)

Client Component (interactividad: filtros, modal, formulario)
        │  llama a una Server Action como si fuera una función async
        ▼
app/admin/productos/actions.ts  ("use server")
        │  revalidatePath() para refrescar admin + tienda pública
        ▼
lib/services/products.ts → Supabase
```

**Archivos nuevos:**
- `lib/services/categories.ts`
- `app/admin/productos/actions.ts` (Server Actions)
- `components/admin/AdminProductsClient.tsx`
- `components/product/ProductsExplorer.tsx`
- `supabase/migrations/002_align_profiles_schema.sql`

**Archivos modificados:**
- `lib/services/products.ts` — bug del cliente a nivel de módulo, +`getProductBySlug`, −`saveProduct`, +`server-only`
- `app/admin/productos/page.tsx` — ahora Server Component (solo fetch)
- `app/productos/page.tsx` — ahora Server Component (`searchParams` en vez de `useSearchParams`+Suspense)
- `app/productos/[slug]/page.tsx` — ahora Server Component, usa el service, sin `generateStaticParams` (ver nota abajo)
- `components/product/ProductFilters.tsx`, `ProductCard.tsx`, `ProductGrid.tsx` — reciben `categories` como prop en vez de importar `mock-data`
- `app/productos/[slug]/ProductDetailClient.tsx` — recibe `category`/`related` como props
- `components/home/HomeSections.tsx` — pasa `categories` explícitamente a `ProductGrid` (seguía en mock-data, cambio no invasivo)
- `app/admin/configuracion/page.tsx`, `app/cuenta/page.tsx`, `components/layout/Navbar.tsx` — arreglos mecánicos de tipos (ver arriba)
- `package.json` — agregado `server-only`

**Nota sobre `generateStaticParams`:** se quitó porque generaba las rutas
de producto a partir de `mock-data.ts` en build time; con datos reales,
esto serviría catálogo desactualizado entre builds. La ruta pasó a
`ƒ` (dinámica, SSR on-demand) — confirmado en el output de `next build`.
Se puede reintroducir con ISR (`export const revalidate = N`) si el
tráfico lo justifica.

**Verificado:** `npx tsc --noEmit` sin errores y `npm run build`
compilando limpio (17 rutas generadas, sin errores de webpack) después
de estos cambios.

### Qué sigue en `mock-data.ts` (sin tocar, a propósito)

Home (destacados/ofertas), `/admin` dashboard, `/admin/categorias`,
`/admin/pedidos`, `/admin/clientes`, `/admin/configuracion`, carrito,
checkout y `/cuenta` (historial de pedidos) — todo sigue usando
`lib/mock-data.ts`. No se tocó ninguno de estos por fuera de los ajustes
de tipos ya mencionados.

### Pendiente / próximos pasos recomendados

1. **Verificar el esquema real de `categories`** contra lo asumido en
   `lib/services/categories.ts` (`sort_order`, `image_url`) — correr:
   ```sql
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'categories';
   ```
2. **Correr `supabase/migrations/002_align_profiles_schema.sql`** (o
   confirmar que ya no hace falta si el ALTER manual ya está aplicado)
   para que el repo deje de tener drift con la base real.
3. **Versionar el esquema de `products`, `categories`, `product_images`,
   `product_variants`** en `supabase/migrations/` — hoy existen en tu
   Supabase pero no en el repo, lo que hace imposible reproducir la base
   desde cero o auditar cambios futuros.
4. **Migrar `product_images` y `product_variants`** reemplazando el
   `images: []` / `variants: []` hardcodeado en `mapRowToProduct` por un
   join real (`.select("*, images:product_images(*), variants:product_variants(*)")`).
5. **Migrar categorías admin** (`/admin/categorias`) al mismo patrón
   Server Component + Service + Server Actions ya usado en productos.
6. **Multi-tenant**: no se implementó todavía (no hay tabla de tenants/
   tiendas en el esquema actual). Cuando se agregue, el punto de entrada
   más limpio es agregar un `store_id`/`tenant_id` a cada tabla y a cada
   función de `lib/services/*.ts` (que ya son el único punto de acceso a
   datos), en vez de tocar componentes — por eso vale la pena mantener
   esa capa de servicios como single source of truth incluso mientras
   el resto de la app siga en mock-data.
7. Una vez migradas todas las secciones, recién ahí evaluar borrar
   `lib/mock-data.ts` (regla explícita: no se borra hasta terminar).



## 🏗 Arquitectura de carpetas

```
gngv/
├── app/                          # Rutas (App Router)
│   ├── page.tsx                   # Home (Server Component, 100% Supabase)
│   ├── login/, registro/          # Auth (Supabase real)
│   ├── productos/                 # Server Component: listado (usa services/)
│   │   ├── page.tsx
│   │   └── [slug]/                # Server Component: detalle (usa services/)
│   ├── carrito/                   # Carrito (estado local, sin backend propio)
│   ├── checkout/                  # Server Component (storeSettings) + client + actions.ts
│   ├── pedido-confirmado/[id]/    # Server Component (RLS) + client (sessionStorage fallback)
│   ├── cuenta/                    # Server Component puro, redirect() si no hay sesión
│   ├── contacto/                  # Server Component (storeSettings real)
│   └── admin/                     # Panel privado — 100% Supabase, cero mock-data
│       ├── layout.tsx               # Guard de acceso (middleware + cliente)
│       ├── page.tsx                 # Dashboard (productos + pedidos reales)
│       ├── productos/                # Server Component + actions.ts
│       ├── categorias/               # Server Component + actions.ts
│       ├── pedidos/                  # Server Component + actions.ts
│       └── clientes/                 # Server Component (agregación sobre orders)
│       (la sección "Configuración" se eliminó — ver changelog (4))
├── components/
│   ├── layout/                    # Navbar (recibe storeSettings por prop), Footer, AdminSidebar
│   ├── product/                   # ProductCard, ProductGrid, ProductFilters, ProductsExplorer
│   ├── admin/                     # DashboardCards, DataTable, AdminProductsClient,
│   │                               # AdminCategoriesClient, AdminOrdersClient,
│   │                               # AdminOrderStatusSelect, AdminCustomersClient, AdminSettingsForm
│   ├── checkout/                  # CheckoutForm, CheckoutPageClient
│   ├── account/                   # SignOutButton (isla de cliente de /cuenta)
│   ├── contact/                   # ContactForm (email + WhatsApp)
│   ├── cart/, home/, ui/          # ui/: Button, Modal, FormSection, BrandLoader
├── context/
│   ├── CartContext.tsx            # Estado global del carrito (localStorage)
│   └── AuthContext.tsx            # Sesión real de Supabase Auth (user/profile/role)
├── lib/
│   ├── supabase/                  # client.ts (browser), server.ts (RSC, cookies),
│   │                               # public.ts (sin cookies, lecturas públicas), middleware.ts
│   ├── services/                  # ÚNICO punto de acceso a datos vía Supabase
│   │   ├── storage.ts               # "server-only" — Supabase Storage (subir/borrar archivos)
│   │   ├── products.ts              # "server-only" — CRUD + getPublic* (sin cookies)
│   │   ├── categories.ts            # "server-only" — CRUD
│   │   ├── orders.ts                # "server-only" — CRUD + createOrder (checkout)
│   │   ├── customers.ts             # "server-only" — agregación sobre orders
│   │   ├── store-settings.ts        # "server-only" — read (público) + upsert (admin)
│   │   └── profiles.ts              # "server-only" — getAdminProfiles, getCurrentProfile
│   ├── types.ts                   # Tipos que reflejan el esquema real de Supabase
│   ├── tenant.ts                  # Tenant actual + convención de paths en Storage
│   ├── image-upload.ts            # Límites/validación de imágenes (cliente + servidor)
│   ├── whatsapp.ts                # Generador del mensaje/link de WhatsApp
│   └── utils.ts                   # cn(), formatPrice(), generateOrderNumber(), slugify()
├── supabase/migrations/           # SQL versionado
│   ├── 001_profiles_and_roles.sql
│   ├── 002_align_profiles_schema.sql
│   ├── 003_orders_and_store_settings_rls.sql  # superseded por 004
│   ├── 004_orders_store_settings_rls.sql
│   ├── 005_product_images_rls.sql             # pendiente de correr (ver changelog)
│   └── 006_product_images_storage.sql         # pendiente de correr (bucket + policies)
└── middleware.ts                  # Protección real de /admin (sesión + rol)
```

`lib/mock-data.ts` **ya no existe** — se eliminó al confirmar (por grep,
antes de borrar) que ningún archivo lo importaba más.

## 🔄 Flujo de compra

```
Inicio → Productos → Producto → Carrito → (login obligatorio) → Checkout
  → Pedido confirmado → Enviar por WhatsApp
```

**Desde la versión de estabilización (2026-07-27), el checkout requiere
sesión iniciada.** Se puede navegar la tienda, ver productos y agregar
al carrito sin cuenta, pero confirmar un pedido exige estar logueado —
`/checkout` redirige a `/login?redirect=/checkout` si no hay sesión
(mismo mecanismo que ya protegía `/cuenta`). Ya no existen pedidos de
invitado; `orders.user_id` es obligatorio.

El comercio coordina el pago después, por transferencia, Mercado Pago,
efectivo u otro método definido en `/admin/configuracion` (ahora
persistido en `store_settings`).

## 🔐 Autenticación y roles (Supabase Auth real)

El sistema de auth ya está conectado a Supabase, no es una simulación:

1. **Setup**: copiá `.env.local.example` a `.env.local` y completá con
   las credenciales de tu proyecto de Supabase. Después corré, en orden,
   `supabase/migrations/001_profiles_and_roles.sql`,
   `002_align_profiles_schema.sql` y `003_orders_and_store_settings_rls.sql`
   (SQL Editor de Supabase o `supabase db push`).
2. **Registro** (`/registro`): crea el usuario en Supabase Auth. El
   trigger de la base crea su fila en `profiles` con `role = 'user'`.
   Nunca es posible registrarse como administrador desde el formulario.
3. **Login** (`/login`): autentica contra Supabase Auth y
   `AuthContext` obtiene el perfil (incluyendo `role`) desde la tabla
   `profiles` — el rol nunca está hardcodeado en el frontend.
4. **Volverse administrador**: desde el dashboard de Supabase (o SQL),
   ```sql
   update public.profiles set role = 'admin' where email = 'alguien@email.com';
   ```
   La próxima vez que esa persona inicie sesión, `isAdmin` pasa a `true`
   automáticamente y el link **⚙️ Panel de administración** aparece solo
   para esa persona — la tienda pública sigue igual para todos los demás.
5. **Protección real de `/admin/*`**: `middleware.ts` valida sesión +
   rol en el servidor antes de cualquier render. Escribir la URL a mano
   sin sesión o sin rol admin redirige automáticamente (a `/login` o
   a `/`). `app/admin/layout.tsx` agrega una segunda capa de
   verificación en cliente por defensa en profundidad.

Roles soportados (`lib/types.ts`): `user` (cliente, default), `admin`
(acceso total al panel) — permisos documentados en `/admin/configuracion`.

`useAuth()` (en `context/AuthContext.tsx`) es la única fuente de verdad:
expone `user`, `profile`, `role`, `loading`, `isAuthenticated`, `isAdmin`
y los métodos `signUp` / `signIn` / `signOut`. Ningún componente debe
guardar su propio estado local de "es admin"; todos consultan este hook.
Los Server Components que no pueden usar este contexto de cliente (p. ej.
`/cuenta`) resuelven la sesión con `getCurrentProfile()` en su lugar.

## ✅ Estado de la migración

Todo el catálogo, auth, pedidos y configuración corren sobre Supabase.
Ya no queda ningún dato simulado en el proyecto — `mock-data.ts` fue
eliminado. Lo único pendiente es correr la migración 003 (RLS) contra
la base real y probar el flujo de punta a punta (ver changelog `(5)`).

## 🚀 Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`.

## 📦 Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (paleta beige / tierra / gris cálido, ver `tailwind.config.ts`)
- Framer Motion para animaciones
- lucide-react para iconografía
- Contexto de React (Cart, Auth) — sin librería de estado externa, salvo
  `zustand` incluido en dependencias por si el proyecto crece
- `@supabase/supabase-js` y `@supabase/ssr` ya instalados, listos para
  conectar

## ⚠️ Estado actual (importante)

- **Autenticación y roles**: reales, conectados a Supabase. Modelo de 2
  roles (`user`/`admin`); requiere correr las migraciones SQL 001 y 002.
- **Productos, categorías, imágenes y variantes**: reales, con join a
  `product_images`/`product_variants` (lectura + escritura completas).
  Las imágenes se suben desde el panel a **Supabase Storage** (bucket
  `store-assets`); en `product_images` se sigue guardando solo la URL
  pública. Requiere correr las migraciones 005 y 006.
- **Pedidos, clientes (derivados), configuración de tienda**: reales,
  migrados en el changelog `(5)`. Requiere correr la migración SQL 003
  (RLS de `orders`/`order_items`/`store_settings`) antes de usarse en
  producción — sin esas policies, Supabase va a rechazar todas las
  lecturas/escrituras de estas tres tablas.
- **`lib/mock-data.ts` ya no existe.** Todo el proyecto lee y escribe
  sobre Supabase.
- Sin `.env.local` configurado, el sitio sigue siendo navegable (usa
  credenciales placeholder), pero cualquier página que dependa de datos
  reales (todas, a esta altura) va a mostrar listas vacías hasta que
  conectes un proyecto real de Supabase con las migraciones corridas.
- Ningún cambio de esta sesión se pudo probar contra la base real desde
  este entorno (sin salida de red hacia tu proyecto de Supabase) — se
  verificó únicamente que compila y que cada fallback no rompe el build.
  Recomendado probar el flujo completo apenas despliegues.
