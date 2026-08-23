"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Product, Category } from "@/lib/types";
import { useFavorites } from "@/context/FavoritesContext";
import ProductGrid from "@/components/product/ProductGrid";

// ─────────────────────────────────────────────────────────────
// Lista de favoritos.
//
// El Server Component padre trae el catálogo público completo y este
// componente se queda con los productos cuyos ids están guardados en el
// dispositivo. Se resuelve así (y no con una consulta por id) porque
// los favoritos viven en localStorage: el servidor no sabe cuáles son
// hasta que el navegador hidrata.
//
// Efecto colateral bueno: un producto que se ocultó o se archivó
// desaparece solo de la lista, porque `getPublicProducts()` ya no lo
// devuelve. No hacen falta favoritos "fantasma" apuntando a nada.
// ─────────────────────────────────────────────────────────────

interface FavoritesClientProps {
  products: Product[];
  categories: Category[];
}

export default function FavoritesClient({ products, categories }: FavoritesClientProps) {
  const { ids, hydrated, clearFavorites } = useFavorites();

  const favorites = useMemo(
    () => products.filter((p) => ids.includes(p.id)),
    [products, ids]
  );

  return (
    <div className="container-app py-10 sm:py-16">
      <header className="mb-10 flex items-end justify-between gap-6 border-b border-warmgray-100 pb-8">
        <div>
          <h1 className="title-editorial">Favoritos</h1>
          {hydrated && favorites.length > 0 && (
            <p className="mt-3 text-sm text-warmgray-500">
              {favorites.length} {favorites.length === 1 ? "prenda guardada" : "prendas guardadas"}
            </p>
          )}
        </div>
        {hydrated && favorites.length > 0 && (
          <button
            onClick={clearFavorites}
            className="link-quiet shrink-0 text-[10px] uppercase tracking-editorial text-warmgray-600"
          >
            Vaciar lista
          </button>
        )}
      </header>

      {/* Antes de hidratar no se sabe qué hay guardado: mostrar "está
          vacío" en ese momento sería mentira y parpadearía. */}
      {!hydrated ? (
        <div className="py-20" aria-hidden />
      ) : favorites.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-warmgray-500">Todavía no guardaste ninguna prenda.</p>
          <Link href="/productos" className="btn-primary mt-8 inline-flex">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={favorites} categories={categories} showAddToCart />
          <p className="mt-16 border-t border-warmgray-100 pt-6 text-xs text-warmgray-400">
            Tus favoritos se guardan en este dispositivo. No se sincronizan con tu cuenta.
          </p>
        </>
      )}
    </div>
  );
}
