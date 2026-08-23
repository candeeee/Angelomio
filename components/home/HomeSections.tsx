import Image from "next/image";
import Link from "next/link";
import { Truck, ShieldCheck, RefreshCw, MessageCircle, Instagram } from "lucide-react";
import { Product, Category } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import Reveal from "@/components/ui/Reveal";
import { BRAND_INSTAGRAM_HANDLE, BRAND_WORDMARK } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// Home Angelo Mio.
//
// SERVER COMPONENT. Antes era "use client" únicamente por las
// animaciones de framer-motion; al pasar a animaciones CSS
// (components/ui/Reveal.tsx) dejó de necesitarlo. Los únicos límites
// cliente que quedan en la home son ProductCard (carrito y favoritos).
//
// TODO lo que se muestra son datos reales de Supabase:
//  - Categorías      → tabla `categories`, filtradas a las que TIENEN
//                      productos publicados (la page hace ese cálculo).
//  - Destacados      → productos con `featured = true`.
//  - Nuevos ingresos → los más recientes por `created_at`.
//  - Sale            → los que tienen `compare_at_price`.
//  - Editorial       → foto de un producto real.
//
// No hay ninguna lista de categorías escrita en el código. Si el admin
// crea "Buzos" y le carga un producto, aparece acá sola.
// ─────────────────────────────────────────────────────────────

export interface CategoryTile {
  category: Category;
  /** Foto de la categoría: propia, o heredada de un producto suyo. */
  image: string | null;
  /** Cuántos productos publicados tiene. Siempre ≥ 1: la page filtra. */
  productCount: number;
}

interface HomeSectionsProps {
  featured: Product[];
  newest: Product[];
  onSale: Product[];
  categories: Category[];
  categoryTiles: CategoryTile[];
  collectionImage: string | null;
  galleryImages: string[];
  instagramUrl?: string;
  shippingInfo?: string;
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-warmgray-100 pb-5 sm:mb-10 sm:pb-6">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 sm:mb-3">{eyebrow}</p>}
        <h2 className="title-editorial">{title}</h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="link-quiet hidden shrink-0 text-[10px] uppercase tracking-editorial sm:block"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export default function HomeSections({
  featured,
  newest,
  onSale,
  categories,
  categoryTiles,
  collectionImage,
  galleryImages,
  instagramUrl,
  shippingInfo,
}: HomeSectionsProps) {
  const benefits = [
    {
      icon: Truck,
      title: "Envíos a todo el país",
      desc: shippingInfo || "Recibí tu compra estés donde estés.",
    },
    { icon: ShieldCheck, title: "Compra segura", desc: "Tus datos están protegidos." },
    { icon: RefreshCw, title: "Cambios", desc: "Información clara sobre cambios y devoluciones." },
    { icon: MessageCircle, title: "Atención personalizada", desc: "Estamos para ayudarte." },
  ];

  return (
    <>
      {/* ── Categorías ──────────────────────────────────────────
          Grilla de 2 columnas en mobile y 4 desde 1024px. Se eligió
          grilla y no scroll horizontal: en un carrusel la segunda mitad
          de las categorías queda escondida sin ningún indicio, y acá
          justamente el problema a resolver era que no se vieran.
          Cada bloque entero es el área clickeable, no sólo el texto. */}
      {categoryTiles.length > 0 && (
        <section id="categorias" className="container-app py-12 sm:py-20 lg:py-24">
          <Reveal>
            <SectionHeading title="Categorías" action={{ href: "/productos", label: "Ver todo" }} />
          </Reveal>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {categoryTiles.map(({ category, image }, i) => (
              <Reveal key={category.id} delay={(i % 4) * 0.06}>
                <Link
                  href={`/productos?categoria=${category.slug}`}
                  className="group block"
                  aria-label={`Ver ${category.name}`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-beige-100">
                    {image && (
                      <Image
                        src={image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-editorial text-ink sm:mt-4">
                    {category.name}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Selección Angelo Mio (destacados) ───────────────── */}
      {featured.length > 0 && (
        <section className="container-app pb-12 sm:pb-20 lg:pb-24">
          <Reveal>
            <SectionHeading
              title={`Selección ${BRAND_WORDMARK}`}
              action={{ href: "/productos", label: "Ver todos" }}
            />
          </Reveal>
          <ProductGrid products={featured} categories={categories} showAddToCart />
        </section>
      )}

      {/* ── Bloque editorial de marca ───────────────────────── */}
      <section className="border-y border-warmgray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative aspect-[4/3] bg-beige-100 sm:aspect-[16/9] lg:aspect-auto lg:h-[620px]">
            {collectionImage && (
              <Image
                src={collectionImage}
                alt={`Colección ${BRAND_WORDMARK}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            )}
          </div>
          <div className="flex items-center bg-beige-50 px-6 py-14 sm:px-12 lg:px-16 lg:py-0">
            <Reveal>
              <p className="eyebrow mb-5 sm:mb-6">Editorial</p>
              <h2 className="brand-wordmark max-w-md text-xl font-light sm:text-3xl lg:text-4xl">
                {BRAND_WORDMARK}
              </h2>
              <p className="mt-5 max-w-sm text-base font-light leading-relaxed text-warmgray-600 sm:mt-6 sm:text-xl">
                Prendas para todos los días.
              </p>
              <Link href="/productos" className="btn-primary mt-8 sm:mt-10">
                Descubrir
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Nuevos ingresos ─────────────────────────────────── */}
      {newest.length > 0 && (
        <section className="container-app py-12 sm:py-20 lg:py-24">
          <Reveal>
            <SectionHeading title="Nuevos ingresos" />
          </Reveal>
          <ProductGrid products={newest} categories={categories} showAddToCart />
          <div className="mt-12 flex justify-center sm:mt-14">
            <Link href="/productos" className="btn-secondary">
              Ver todo
            </Link>
          </div>
        </section>
      )}

      {/* ── Sale ────────────────────────────────────────────── */}
      {onSale.length > 0 && (
        <section className="container-app pb-12 sm:pb-20 lg:pb-24">
          <Reveal>
            <SectionHeading eyebrow="Precios rebajados" title="Sale" />
          </Reveal>
          <ProductGrid products={onSale} categories={categories} />
        </section>
      )}

      {/* ── Beneficios ──────────────────────────────────────── */}
      <section className="border-y border-warmgray-100 bg-beige-50 py-12 sm:py-16">
        <div className="container-app">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title}>
                <b.icon size={18} strokeWidth={1.25} className="mb-3 text-ink sm:mb-4" />
                <h3 className="mb-2 text-[11px] uppercase tracking-editorial">{b.title}</h3>
                <p className="text-sm leading-relaxed text-warmgray-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instagram ───────────────────────────────────────────
          NO hay integración con la API de Instagram y no se inventó
          una. Esta tira usa fotografías reales del catálogo y el botón
          lleva al perfil configurado en `store_settings.instagram`. Si
          algún día se conecta la Graph API, lo único que cambia es de
          dónde sale `galleryImages`. */}
      {(galleryImages.length > 0 || instagramUrl) && (
        <section className="container-app py-12 sm:py-20 lg:py-24">
          <div className="mb-8 text-center sm:mb-10">
            <p className="eyebrow mb-2 sm:mb-3">Instagram</p>
            <h2 className="title-editorial">{BRAND_INSTAGRAM_HANDLE}</h2>
          </div>

          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {galleryImages.map((url, i) => (
                <Reveal key={`${url}-${i}`} delay={(i % 4) * 0.06}>
                  <div className="relative aspect-square overflow-hidden bg-beige-100">
                    <Image
                      src={url}
                      alt=""
                      aria-hidden
                      fill
                      loading="lazy"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {instagramUrl && (
            <div className="mt-10 flex justify-center sm:mt-12">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <Instagram size={14} strokeWidth={1.5} /> Seguirnos en Instagram
              </a>
            </div>
          )}
        </section>
      )}
    </>
  );
}
