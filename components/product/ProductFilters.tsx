"use client";

import { Category } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Filtros del catálogo.
//
// Todas las opciones son DERIVADAS de los productos reales que llegan
// del servidor: los talles y los colores salen de `product_variants` y
// el tope de precio del producto más caro. No hay listas fijas de
// talles ni una paleta hardcodeada — si mañana se carga un talle 46,
// aparece solo.
//
// Este componente es puramente presentacional: recibe el estado y los
// callbacks de ProductsExplorer, que es quien filtra. Así el mismo
// panel se reutiliza en el sidebar de escritorio y en el drawer mobile
// sin duplicar lógica.
// ─────────────────────────────────────────────────────────────

export type SortOption = "featured" | "recent" | "price-asc" | "price-desc";

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Destacados",
  recent: "Más recientes",
  "price-asc": "Precio: menor a mayor",
  "price-desc": "Precio: mayor a menor",
};

export interface FiltersState {
  category: string | null;
  sizes: string[];
  colors: string[];
  maxPrice: number | null;
}

interface ProductFiltersProps {
  categories: Category[];
  availableSizes: string[];
  availableColors: string[];
  priceBounds: { min: number; max: number };
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
  onReset: () => void;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-warmgray-100 py-6 first:border-t-0 first:pt-0">
      <p className="eyebrow mb-4">{title}</p>
      {children}
    </div>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function ProductFilters({
  categories,
  availableSizes,
  availableColors,
  priceBounds,
  filters,
  onChange,
  onReset,
}: ProductFiltersProps) {
  const hasActiveFilters =
    filters.category !== null ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.maxPrice !== null;

  const sliderMax = Math.max(priceBounds.max, priceBounds.min + 1);
  const currentMax = filters.maxPrice ?? sliderMax;

  return (
    <div>
      <FilterGroup title="Categoría">
        <ul className="space-y-2.5">
          <li>
            <button
              onClick={() => onChange({ ...filters, category: null })}
              className={cn(
                "text-left text-sm transition-colors",
                filters.category === null ? "text-ink underline" : "text-warmgray-500 hover:text-ink"
              )}
            >
              Todas
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onChange({ ...filters, category: c.slug })}
                className={cn(
                  "text-left text-sm transition-colors",
                  filters.category === c.slug
                    ? "text-ink underline"
                    : "text-warmgray-500 hover:text-ink"
                )}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {availableSizes.length > 0 && (
        <FilterGroup title="Talle">
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => {
              const active = filters.sizes.includes(size);
              return (
                <button
                  key={size}
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, sizes: toggle(filters.sizes, size) })}
                  className={cn(
                    "min-w-[44px] border px-3 py-2 text-[11px] uppercase tracking-wider transition-colors",
                    active
                      ? "border-ink bg-ink text-cream"
                      : "border-warmgray-200 text-warmgray-600 hover:border-ink hover:text-ink"
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {availableColors.length > 0 && (
        <FilterGroup title="Color">
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => {
              const active = filters.colors.includes(color);
              return (
                <button
                  key={color}
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, colors: toggle(filters.colors, color) })}
                  className={cn(
                    "border px-3 py-2 text-[11px] uppercase tracking-wider transition-colors",
                    active
                      ? "border-ink bg-ink text-cream"
                      : "border-warmgray-200 text-warmgray-600 hover:border-ink hover:text-ink"
                  )}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {priceBounds.max > priceBounds.min && (
        <FilterGroup title="Precio">
          <label htmlFor="price-range" className="mb-3 block text-sm text-warmgray-500">
            Hasta {formatPrice(currentMax)}
          </label>
          <input
            id="price-range"
            type="range"
            min={priceBounds.min}
            max={sliderMax}
            step={Math.max(1, Math.round((sliderMax - priceBounds.min) / 100))}
            value={currentMax}
            onChange={(e) => {
              const value = Number(e.target.value);
              onChange({ ...filters, maxPrice: value >= sliderMax ? null : value });
            }}
            className="w-full accent-ink"
          />
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-warmgray-400">
            <span>{formatPrice(priceBounds.min)}</span>
            <span>{formatPrice(sliderMax)}</span>
          </div>
        </FilterGroup>
      )}

      {hasActiveFilters && (
        <div className="border-t border-warmgray-100 pt-6">
          <button
            onClick={onReset}
            className="link-quiet text-[10px] uppercase tracking-editorial text-warmgray-600"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
