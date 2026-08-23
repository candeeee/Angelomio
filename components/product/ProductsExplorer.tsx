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
// El filtrado sigue siendo 100% en cliente sobre la lista que ya trae
// el Server Component: es una sola consulta y el catálogo de una marca
// de indumentaria entra cómodo en memoria. Cuando el volumen lo pida,
// el cambio es mover este `useMemo` a la query de Supabase — la UI no
// se entera.
//
// Layout: sidebar de filtros a la izquierda en escritorio y drawer a
// pantalla completa en mobile. El mobile no es el desktop "adaptado":
// los filtros no ocupan lugar hasta que se piden, y la grilla arranca
// en dos columnas desde el borde de la pantalla.
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

  const search = initialSearch.trim();

  // Opciones disponibles: se derivan del catálogo real, no de una lista
  // fija. Se calculan sobre TODOS los productos (no sobre el resultado
  // filtrado) para que las opciones no desaparezcan mientras se filtra.
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
    // getPublicProducts() (Server Component padre) — no se re-filtra
    // acá para no duplicar esa lógica en dos lugares.
    let list = products;

    if (filters.category) {
      const categoryId = categories.find((c) => c.slug === filters.category)?.id;
      list = list.filter((p) => p.categoryId === categoryId);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (filters.sizes.length > 0) {
      list = list.filter((p) =>
        p.variants.some((v) => v.size && filters.sizes.includes(v.size))
      );
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
    />
  );

  return (
    <div className="container-app py-10 sm:py-16">
      <header className="mb-10 border-b border-warmgray-100 pb-8">
        <h1 className="title-editorial">{heading}</h1>
        {subheading && <p className="mt-3 text-sm text-warmgray-500">{subheading}</p>}
      </header>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-14">
        {/* Sidebar de filtros — escritorio */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">{filtersPanel}</div>
        </aside>

        <div>
          {/* Barra de control: cantidad, filtros (mobile) y orden */}
          <div className="mb-8 flex items-center justify-between gap-4">
            <p className="text-xs text-warmgray-500">
              {finalList.length} {finalList.length === 1 ? "producto" : "productos"}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 border border-warmgray-200 px-4 py-2 text-[10px] uppercase tracking-editorial text-ink lg:hidden"
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
                className="border border-warmgray-200 bg-white px-3 py-2 text-[10px] uppercase tracking-editorial text-ink outline-none focus:border-ink"
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

      {/* Drawer de filtros — mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-cream">
            <div className="sticky top-0 flex items-center justify-between border-b border-warmgray-100 bg-cream px-5 py-4">
              <p className="text-[11px] uppercase tracking-editorial">Filtrar</p>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar filtros"
                className="rounded-sm p-1.5 text-warmgray-500 hover:text-ink"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-5 py-6">{filtersPanel}</div>
            <div className="sticky bottom-0 border-t border-warmgray-100 bg-cream px-5 py-4">
              <button onClick={() => setDrawerOpen(false)} className="btn-primary w-full">
                Ver {finalList.length} {finalList.length === 1 ? "producto" : "productos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
