"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Truck, ShieldCheck, RefreshCw, MessageCircle, Instagram } from "lucide-react";
import { Product, Category } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import { BRAND_INSTAGRAM_HANDLE, BRAND_WORDMARK } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// Home Angelo Mio.
//
// TODO lo que se muestra son datos reales de Supabase:
//  - Destacados     → productos con `featured = true` en el panel.
//  - Nuevos ingresos→ los más recientes por `created_at`.
//  - Categorías     → tabla `categories` (imagen propia, o la portada de
//                     un producto de esa categoría como respaldo).
//  - Editorial      → foto de un producto real (la elige la page).
//  - Instagram      → ver la nota de la sección más abajo.
//
// Si el admin todavía no cargó nada, cada sección simplemente no se
// renderiza en vez de mostrar relleno inventado.
// ─────────────────────────────────────────────────────────────

export interface CategoryTile {
  category: Category;
  /** Foto de la categoría (propia o heredada de un producto). */
  image: string | null;
}

interface HomeSectionsProps {
  featured: Product[];
  newest: Product[];
  onSale: Product[];
  categories: Category[];
  categoryTiles: CategoryTile[];
  /** Foto para el bloque editorial. La elige el Server Component. */
  collectionImage: string | null;
  /** Fotos reales del catálogo para la tira inferior. */
  galleryImages: string[];
  /** URL de Instagram cargada en la configuración de la tienda. */
  instagramUrl?: string;
  /** Texto de envíos configurado en el panel, si existe. */
  shippingInfo?: string;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
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
    <div className="mb-10 flex items-end justify-between gap-6 border-b border-warmgray-100 pb-6">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
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
      {/* ── Categorías: bloques con fotografía ──────────────── */}
      {categoryTiles.length > 0 && (
        <section id="categorias" className="container-app py-16 sm:py-24">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
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
                  <p className="mt-4 text-[11px] uppercase tracking-editorial text-ink">
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
        <section className="container-app pb-16 sm:pb-24">
          <Reveal>
            <SectionHeading
              title={`Selección ${BRAND_WORDMARK}`}
              action={{ href: "/productos", label: "Ver todos" }}
            />
          </Reveal>
          <Reveal delay={0.05}>
            <ProductGrid products={featured} categories={categories} showAddToCart />
          </Reveal>
        </section>
      )}

      {/* ── Bloque editorial de marca ───────────────────────── */}
      <section className="border-y border-warmgray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative h-[360px] bg-beige-100 sm:h-[480px] lg:h-[620px]">
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
          <div className="flex items-center bg-beige-50 px-8 py-16 sm:px-16 lg:py-0">
            <Reveal>
              <p className="eyebrow mb-6">Editorial</p>
              <h2 className="brand-wordmark max-w-md text-2xl font-light sm:text-4xl">
                {BRAND_WORDMARK}
              </h2>
              <p className="mt-6 max-w-sm text-lg font-light leading-relaxed text-warmgray-600 sm:text-xl">
                Prendas para todos los días.
              </p>
              <Link href="/productos" className="btn-primary mt-10">
                Descubrir
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Nuevos ingresos ─────────────────────────────────── */}
      {newest.length > 0 && (
        <section className="container-app py-16 sm:py-24">
          <Reveal>
            <SectionHeading title="Nuevos ingresos" />
          </Reveal>
          <Reveal delay={0.05}>
            <ProductGrid products={newest} categories={categories} showAddToCart />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-14 flex justify-center">
              <Link href="/productos" className="btn-secondary">
                Ver todo
              </Link>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── Sale: solo si hay productos con precio anterior ─── */}
      {onSale.length > 0 && (
        <section className="container-app pb-16 sm:pb-24">
          <Reveal>
            <SectionHeading eyebrow="Precios rebajados" title="Sale" />
          </Reveal>
          <Reveal delay={0.05}>
            <ProductGrid products={onSale} categories={categories} />
          </Reveal>
        </section>
      )}

      {/* ── Beneficios ──────────────────────────────────────── */}
      <section className="border-y border-warmgray-100 bg-beige-50 py-16">
        <div className="container-app">
          <Reveal>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b) => (
                <div key={b.title}>
                  <b.icon size={18} strokeWidth={1.25} className="mb-4 text-ink" />
                  <h4 className="mb-2 text-[11px] uppercase tracking-editorial">{b.title}</h4>
                  <p className="text-sm leading-relaxed text-warmgray-500">{b.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Instagram ───────────────────────────────────────────
          NOTA IMPORTANTE: el proyecto NO tiene integración con la API
          de Instagram y no se inventó una. Esta tira usa fotografías
          REALES del catálogo cargado en el panel y el botón lleva al
          perfil configurado en `store_settings.instagram`. Si algún día
          se conecta la Graph API, lo único que cambia es de dónde sale
          `galleryImages`. La sección entera se oculta si no hay ni
          fotos ni perfil cargado. */}
      {(galleryImages.length > 0 || instagramUrl) && (
        <section className="container-app py-16 sm:py-24">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="eyebrow mb-3">Instagram</p>
              <h2 className="title-editorial">{BRAND_INSTAGRAM_HANDLE}</h2>
            </div>
          </Reveal>

          {galleryImages.length > 0 && (
            <Reveal delay={0.05}>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                {galleryImages.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden bg-beige-100">
                    <Image
                      src={url}
                      alt=""
                      aria-hidden
                      fill
                      loading="lazy"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-[900ms] ease-out hover:scale-[1.03]"
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {instagramUrl && (
            <Reveal delay={0.1}>
              <div className="mt-12 flex justify-center">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <Instagram size={14} strokeWidth={1.5} /> Seguirnos en Instagram
                </a>
              </div>
            </Reveal>
          )}
        </section>
      )}
    </>
  );
}
