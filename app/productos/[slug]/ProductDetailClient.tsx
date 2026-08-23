"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Heart, Minus, Plus, ChevronDown } from "lucide-react";
import { Product, Category } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import ProductGrid from "@/components/product/ProductGrid";

interface ProductDetailClientProps {
  product: Product;
  category: Category | null;
  related: Product[];
  /** Texto de envíos configurado en el panel (store_settings). */
  shippingInfo?: string;
}

// ─────────────────────────────────────────────────────────────
// Detalle de producto.
//
// Escritorio: galería grande a la izquierda (columna de fotos, no
// miniaturas diminutas) e información pegajosa a la derecha.
// Mobile: carrusel horizontal con scroll-snap y la información abajo —
// pensado para el pulgar, no como una reducción del escritorio.
//
// SOBRE LOS ACORDEONES: el brief pide Descripción, Composición, Guía de
// talles, Envíos y Cambios. Sólo se muestra lo que existe de verdad:
//  - Descripción → `products.description`.
//  - Detalle     → SKU, categoría y colores reales del producto.
//  - Guía de talles → medidas genéricas de la marca, no del producto:
//    no hay columna en la base para eso y no se inventó una.
//  - Envíos      → `store_settings.shipping_info` si está cargado.
//  - Cambios     → política de la tienda, con link a la página completa.
// No se agregó una columna "composición" al esquema: sería inventar
// estructura de base de datos que nadie pidió administrar.
// ─────────────────────────────────────────────────────────────

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-warmgray-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[11px] uppercase tracking-editorial">{title}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn("shrink-0 transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="pb-5 text-sm leading-relaxed text-warmgray-600">{children}</div>
      )}
    </div>
  );
}

export default function ProductDetailClient({
  product,
  category,
  related,
  shippingInfo,
}: ProductDetailClientProps) {
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[],
    [product]
  );
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[],
    [product]
  );

  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizes[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors[0]);

  const selectedVariant = product.variants.find(
    (v) =>
      (sizes.length === 0 || v.size === selectedSize) &&
      (colors.length === 0 || v.color === selectedColor)
  );

  const hasDiscount = !!product.compareAtPrice && product.compareAtPrice > product.price;
  const outOfStock = selectedVariant ? selectedVariant.stock === 0 : product.stock === 0;
  const availableStock = selectedVariant?.stock ?? product.stock;
  const favorite = hydrated && isFavorite(product.id);

  function handleAddToCart() {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      image: product.images[0]?.url ?? "",
      price: product.price,
      quantity,
      variantLabel: [selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="pb-20">
      <div className="lg:grid lg:grid-cols-2">
        {/* ── Galería ──────────────────────────────────────── */}
        <div>
          {/* Mobile: carrusel con scroll-snap */}
          <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:hidden">
            {product.images.length > 0 ? (
              product.images.map((img, i) => (
                <div
                  key={img.id}
                  className="relative aspect-[3/4] w-full shrink-0 snap-center bg-beige-100"
                >
                  <Image
                    src={img.url}
                    alt={img.alt || product.name}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="aspect-[3/4] w-full shrink-0 bg-beige-100" />
            )}
          </div>

          {/* Escritorio: columna de fotos grandes */}
          <div className="hidden lg:block">
            {product.images.length > 0 ? (
              product.images.map((img, i) => (
                <div key={img.id} className="relative aspect-[3/4] w-full bg-beige-100">
                  <Image
                    src={img.url}
                    alt={img.alt || product.name}
                    fill
                    priority={i === 0}
                    sizes="50vw"
                    className="object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="aspect-[3/4] w-full bg-beige-100" />
            )}
          </div>
        </div>

        {/* ── Información ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-5 py-10 sm:px-8 lg:px-14 lg:py-16"
        >
          <div className="lg:sticky lg:top-28">
            {category && (
              <Link
                href={`/productos?categoria=${category.slug}`}
                className="eyebrow link-quiet"
              >
                {category.name}
              </Link>
            )}
            <h1 className="mt-4 text-2xl font-light sm:text-3xl">{product.name}</h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-lg">{formatPrice(product.price)}</span>
              {hasDiscount && (
                <span className="text-sm text-warmgray-400 line-through">
                  {formatPrice(product.compareAtPrice as number)}
                </span>
              )}
            </div>

            {/* Color */}
            {colors.length > 0 && (
              <div className="mt-10">
                <p className="eyebrow mb-3">
                  Color: <span className="text-ink">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      aria-pressed={selectedColor === c}
                      className={cn(
                        "border px-4 py-2.5 text-[11px] uppercase tracking-wider transition-colors",
                        selectedColor === c
                          ? "border-ink bg-ink text-cream"
                          : "border-warmgray-200 text-warmgray-600 hover:border-ink hover:text-ink"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Talles */}
            {sizes.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow mb-3">Talle</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const variantForSize = product.variants.find(
                      (v) =>
                        v.size === s && (colors.length === 0 || v.color === selectedColor)
                    );
                    const sizeOutOfStock = !!variantForSize && variantForSize.stock === 0;
                    return (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        aria-pressed={selectedSize === s}
                        disabled={sizeOutOfStock}
                        className={cn(
                          "min-w-[52px] border px-4 py-2.5 text-[11px] uppercase tracking-wider transition-colors",
                          selectedSize === s
                            ? "border-ink bg-ink text-cream"
                            : "border-warmgray-200 text-warmgray-600 hover:border-ink hover:text-ink",
                          sizeOutOfStock &&
                            "cursor-not-allowed border-warmgray-100 text-warmgray-300 line-through hover:border-warmgray-100 hover:text-warmgray-300"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cantidad + stock */}
            <div className="mt-8 flex items-center gap-5">
              <div className="flex items-center border border-warmgray-200">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Quitar una unidad"
                  className="px-3.5 py-3 text-warmgray-600 transition-colors hover:text-ink"
                >
                  <Minus size={14} strokeWidth={1.5} />
                </button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Agregar una unidad"
                  className="px-3.5 py-3 text-warmgray-600 transition-colors hover:text-ink"
                >
                  <Plus size={14} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-xs text-warmgray-500">
                {outOfStock ? "Sin stock" : `${availableStock} disponibles`}
              </p>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex items-stretch gap-2">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="btn-primary flex-1 disabled:bg-warmgray-200 disabled:text-warmgray-400"
              >
                {added ? (
                  <>
                    <Check size={15} strokeWidth={1.5} /> Agregado
                  </>
                ) : outOfStock ? (
                  "Sin stock"
                ) : (
                  "Agregar al carrito"
                )}
              </button>
              <button
                onClick={() => toggleFavorite(product.id)}
                aria-pressed={favorite}
                aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                className="border border-ink/20 px-4 transition-colors hover:border-ink"
              >
                <Heart
                  size={17}
                  strokeWidth={1.5}
                  className={favorite ? "fill-ink text-ink" : "text-ink"}
                />
              </button>
            </div>

            {/* Información ampliada */}
            <div className="mt-12">
              {product.description && (
                <Accordion title="Descripción" defaultOpen>
                  <p className="whitespace-pre-line">{product.description}</p>
                </Accordion>
              )}

              <Accordion title="Detalle">
                <dl className="space-y-1.5">
                  {product.sku && (
                    <div className="flex gap-2">
                      <dt className="text-warmgray-400">SKU:</dt>
                      <dd>{product.sku}</dd>
                    </div>
                  )}
                  {category && (
                    <div className="flex gap-2">
                      <dt className="text-warmgray-400">Categoría:</dt>
                      <dd>{category.name}</dd>
                    </div>
                  )}
                  {colors.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-warmgray-400">Colores:</dt>
                      <dd>{colors.join(", ")}</dd>
                    </div>
                  )}
                  {sizes.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-warmgray-400">Talles:</dt>
                      <dd>{sizes.join(" · ")}</dd>
                    </div>
                  )}
                </dl>
              </Accordion>

              <Accordion title="Guía de talles">
                <p>
                  Nuestros talles siguen la numeración argentina. Si estás entre dos talles,
                  te recomendamos llevar el mayor para un calce más holgado.
                </p>
                <p className="mt-3">
                  ¿Dudas con tu talle? Escribinos y te ayudamos a elegir.
                </p>
              </Accordion>

              <Accordion title="Envíos">
                <p>{shippingInfo || "Realizamos envíos a todo el país."}</p>
                <Link href="/envios" className="link-quiet mt-3 inline-block text-ink">
                  Ver información de envíos
                </Link>
              </Accordion>

              <Accordion title="Cambios">
                <p>
                  Podés cambiar tu prenda dentro de los 30 días de recibida, sin uso y con su
                  etiqueta original.
                </p>
                <Link href="/cambios" className="link-quiet mt-3 inline-block text-ink">
                  Ver política de cambios
                </Link>
              </Accordion>
            </div>
          </div>
        </motion.div>
      </div>

      {related.length > 0 && (
        <div className="container-app mt-20">
          <div className="mb-10 border-b border-warmgray-100 pb-6">
            <h2 className="title-editorial">También te puede interesar</h2>
          </div>
          <ProductGrid products={related} categories={category ? [category] : []} />
        </div>
      )}
    </div>
  );
}
