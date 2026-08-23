"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Product, Category } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import ProductFilters, {
  SORT_LABELS,
  type FiltersState,
  type SortOption,
} from "@/components/product/ProductFilters";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface ProductsExplorerProps {
  products: Product[];
  categories: Category[];
  initialCategory: string | null;
  /** Término de búsqueda que llega por querystring desde el header. */
  initialSearch?: string;
}

const EMPTY_FILTERS: FiltersState = {
  category: null,
  sizes: [],
  colors: [],
  maxPrice: null,
};

// ─────────────────────────────────────────────────────────────
// Catálogo.
//
// El filtrado es 100% en cliente sobre la lista que ya trae el Server
// Component: es una sola consulta y el catálogo de una marca de
// indumentaria entra cómodo en memoria. Cuando el volumen lo pida, el
// cambio es mover este `useMemo` a la query de Supabase.
//
// Layout: sidebar de filtros a la izquierda desde 1024px y drawer
// inferior en mobile. El mobile no es el desktop "adaptado": los
// filtros no ocupan lugar hasta que se piden y la grilla arranca en dos
// columnas.
//
// Las categorías, los talles y los colores salen SIEMPRE de los datos
// reales — las categorías de Supabase y las opciones de variantes de
// los productos publicados. No hay ninguna lista fija.
// ─────────────────────────────────────────────────────────────
export default function ProductsExplorer({
  products,
  categories,
  initialCategory,
  initialSearch = "",
}: ProductsExplorerProps) {
  const [filters, setFilters] = useState<FiltersState>({
    ...EMPTY_FILTERS,
    category: initialCategory,
  });
  const [sort, setSort] = useState<SortOption>("featured");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useBodyScrollLock(drawerOpen);

  const search = initialSearch.trim();

  // Opciones disponibles: derivadas del catálogo real. Se calculan sobre
  // TODOS los productos (no sobre el resultado filtrado) para que las
  // opciones no desaparezcan mientras se filtra.
  const availableSizes = useMemo(
    () =>
      Array.from(
        new Set(
          products.flatMap((p) => p.variants.map((v) => v.size).filter((s): s is string => !!s))
        )
      ).sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    [products]
  );

  const availableColors = useMemo(
    () =>
      Array.from(
        new Set(
          products.flatMap((p) => p.variants.map((v) => v.color).filter((c): c is string => !!c))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [products]
  );

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map((p) => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === filters.category) ?? null,
    [categories, filters.category]
  );

  const finalList = useMemo(() => {
    // `products` ya viene filtrado a status='active' desde
    // getPublicProducts() — no se re-filtra acá.
    let list = products;

    if (filters.category) {
      const categoryId = categories.find((c) => c.slug === filters.category)?.id;
      // Si el slug de la URL ya no corresponde a ninguna categoría
      // (porque se eliminó desde el panel), no se filtra por un id
      // inexistente: se muestra el catálogo completo en vez de una
      // pantalla vacía sin explicación.
      if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (filters.sizes.length > 0) {
      list = list.filter((p) => p.variants.some((v) => v.size && filters.sizes.includes(v.size)));
    }

    if (filters.colors.length > 0) {
      list = list.filter((p) =>
        p.variants.some((v) => v.color && filters.colors.includes(v.color))
      );
    }

    if (filters.maxPrice !== null) {
      const max = filters.maxPrice;
      list = list.filter((p) => p.price <= max);
    }

    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      case "recent":
        return [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "featured":
      default:
        return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
    }
  }, [products, categories, filters, search, sort]);

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    filters.sizes.length +
    filters.colors.length +
    (filters.maxPrice !== null ? 1 : 0);

  const heading = search
    ? `Resultados para “${search}”`
    : activeCategory?.name ?? "Todos los productos";

  const subheading = search
    ? null
    : activeCategory
      ? `Descubrí nuestra selección de ${activeCategory.name.toLowerCase()}.`
      : "Prendas y accesorios para todos los días.";

  const filtersPanel = (
    <ProductFilters
      categories={categories}
      availableSizes={availableSizes}
      availableColors={availableColors}
      priceBounds={priceBounds}
      filters={filters}
      onChange={setFilters}
      onReset={() => setFilters(EMPTY_FILTERS)}
      showResetButton={false}
    />
  );

  return (
    <div className="container-app py-8 sm:py-12 lg:py-16">
      <header className="mb-8 border-b border-warmgray-100 pb-6 sm:mb-10 sm:pb-8">
        <h1 className="title-editorial">{heading}</h1>
        {subheading && <p className="mt-2 text-sm text-warmgray-500 sm:mt-3">{subheading}</p>}
      </header>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-14">
        {/* Sidebar de filtros — desde 1024px */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            {filtersPanel}
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="link-quiet mt-6 border-t border-warmgray-100 pt-6 text-[10px] uppercase tracking-editorial text-warmgray-600"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </aside>

        <div>
          {/* Barra de control */}
          <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
            <p className="shrink-0 text-xs text-warmgray-500">
              {finalList.length} {finalList.length === 1 ? "producto" : "productos"}
            </p>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-2 border border-warmgray-200 px-3 text-[10px] uppercase tracking-editorial text-ink sm:px-4 lg:hidden"
              >
                <SlidersHorizontal size={14} strokeWidth={1.5} />
                Filtrar
                {activeFilterCount > 0 && <span>({activeFilterCount})</span>}
              </button>

              <label className="sr-only" htmlFor="sort">
                Ordenar por
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="min-h-[40px] max-w-[160px] border border-warmgray-200 bg-white px-2 text-[10px] uppercase tracking-editorial text-ink outline-none focus:border-ink sm:max-w-none sm:px-3"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                  <option key={option} value={option}>
                    {SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ProductGrid products={finalList} categories={categories} />
        </div>
      </div>

      {/* Drawer de filtros — mobile.
          Está fuera de cualquier elemento con `backdrop-filter`, así que
          `fixed` se resuelve contra el viewport (mismo cuidado que con
          el menú del header). Bloquea el scroll del body mientras está
          abierto y tiene botones explícitos de Aplicar y Limpiar. */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
        >
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />

          <div className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col bg-cream">
            <div className="flex shrink-0 items-center justify-between border-b border-warmgray-100 px-5 py-4">
              <p className="text-[11px] uppercase tracking-editorial">Filtrar</p>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar filtros"
                className="-mr-2 rounded-sm p-2.5 text-warmgray-500 transition-colors hover:text-ink"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
              {filtersPanel}
            </div>

            <div className="shrink-0 border-t border-warmgray-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  disabled={activeFilterCount === 0}
                  className="btn-secondary flex-1 disabled:border-warmgray-200 disabled:text-warmgray-400 disabled:hover:bg-transparent disabled:hover:text-warmgray-400"
                >
                  Limpiar
                </button>
                <button onClick={() => setDrawerOpen(false)} className="btn-primary flex-[1.6]">
                  Aplicar ({finalList.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
