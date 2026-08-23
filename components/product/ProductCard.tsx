"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart } from "lucide-react";
import { Product, Category } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  categories?: Category[];
  /**
   * Muestra el botón de compra rápida debajo del precio.
   *
   * Es OPCIONAL y viene apagado a propósito: así el catálogo, el
   * buscador y cualquier otro lugar que ya usaba esta card siguen
   * exactamente igual, y la home lo enciende solo donde se pidió.
   */
  showAddToCart?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Card de producto — estética editorial.
//
// La fotografía ocupa casi todo el componente (3:4, sin esquinas
// redondeadas, sin sombra y sin borde). El hover no levanta la card:
// la imagen hace un zoom lento y el nombre se subraya.
//
// Novedades de esta versión, pedidas en el brief:
//  - los COLORES disponibles se listan bajo el precio (salen de
//    `product.variants`, no de una lista inventada);
//  - botón de FAVORITO sobre la foto (ver context/FavoritesContext).
//
// Si el producto no tiene foto cargada NO se usa una imagen de stock
// ajena a la marca: queda un rectángulo beige limpio. Una foto genérica
// de internet haría parecer que Angelo Mio es otra marca.
// ─────────────────────────────────────────────────────────────
export default function ProductCard({
  product,
  categories = [],
  showAddToCart = false,
}: ProductCardProps) {
  const category = categories.find((c) => c.id === product.categoryId);
  const image = product.images[0];
  const hasDiscount = !!product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(100 - (product.price / (product.compareAtPrice as number)) * 100)
    : 0;

  const colors = Array.from(
    new Set(product.variants.map((v) => v.color).filter((c): c is string => !!c))
  );

  const { addItem } = useCart();
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const [added, setAdded] = useState(false);

  const href = `/productos/${encodeURIComponent(product.slug)}`;
  const hasVariants = product.variants.length > 0;
  const outOfStock = product.stock <= 0;
  const favorite = hydrated && isFavorite(product.id);

  // Un producto con variantes (talle/color) NO se puede agregar de un
  // click sin elegirlas: en ese caso el botón lleva al detalle, que es
  // donde ya vive esa lógica. No se duplica nada del selector.
  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      image: image?.url ?? "",
      price: product.price,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="group">
      <div className="relative">
        <Link href={href} className="block">
          <div className="relative aspect-[3/4] overflow-hidden bg-beige-100">
            {image && (
              <Image
                src={image.url}
                alt={image.alt || product.name}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
            {hasDiscount && (
              <span className="absolute left-3 top-3 bg-cream/95 px-2 py-1 text-[10px] uppercase tracking-editorial text-ink">
                -{discountPct}%
              </span>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
          className="absolute right-2 top-2 rounded-full p-2 text-ink transition-colors hover:bg-cream/80"
        >
          <Heart
            size={17}
            strokeWidth={1.5}
            className={favorite ? "fill-ink text-ink" : "text-ink/70"}
          />
        </button>
      </div>

      <Link href={href} className="block">
        <div className="mt-4 space-y-1.5">
          {category && <p className="eyebrow">{category.name}</p>}
          <h3 className="text-sm font-normal text-ink">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
              {product.name}
            </span>
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-ink">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-xs text-warmgray-400 line-through">
                {formatPrice(product.compareAtPrice as number)}
              </span>
            )}
          </div>
          {colors.length > 0 && (
            <p className="pt-0.5 text-[10px] uppercase tracking-wider text-warmgray-400">
              {colors.length === 1 ? colors[0] : `${colors.length} colores`}
            </p>
          )}
        </div>
      </Link>

      {showAddToCart &&
        (hasVariants ? (
          <Link
            href={href}
            className="mt-4 block w-full border border-ink/15 py-2.5 text-center text-[10px] uppercase tracking-editorial text-ink transition-colors hover:border-ink hover:bg-ink hover:text-cream"
          >
            Elegir opciones
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="mt-4 w-full border border-ink/15 py-2.5 text-[10px] uppercase tracking-editorial text-ink transition-colors hover:border-ink hover:bg-ink hover:text-cream disabled:border-warmgray-200 disabled:text-warmgray-400 disabled:hover:bg-transparent"
          >
            {outOfStock ? "Sin stock" : added ? "Agregado" : "Agregar al carrito"}
          </button>
        ))}
    </div>
  );
}
