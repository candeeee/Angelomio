import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/site";

interface BrandLoaderProps {
  /** Nombre del local. Se muestra debajo del monograma. */
  name?: string;
  /** "Cargando...", "Actualizando información...", etc. */
  message?: string;
  /**
   * `page`    → ocupa el alto de la pantalla (para loading.tsx).
   * `overlay` → capa sobre el contenido actual, para operaciones que
   *             no deberían desmontar lo que ya está en pantalla.
   */
  variant?: "page" | "overlay";
}

const DEFAULT_STORE_NAME = BRAND_NAME;

/** Iniciales de la marca: "Angelo Mio" → "AM". */
function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Pantalla de carga de la marca.
//
// Un solo componente para los dos usos, para no tener dos estéticas de
// espera distintas: `loading.tsx` (navegación entre páginas) y la capa
// que aparece mientras se guarda algo en el panel.
//
// El spinner es un arco de 1px, no un ícono grueso: a esta altura del
// rediseño, un loader ruidoso sería lo más pesado de toda la interfaz.
// ─────────────────────────────────────────────────────────────
export default function BrandLoader({
  name = DEFAULT_STORE_NAME,
  message = "Cargando...",
  variant = "page",
}: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-6",
        variant === "page" && "min-h-[70vh] w-full bg-cream",
        variant === "overlay" &&
          "fixed inset-0 z-[60] bg-cream/80 backdrop-blur-sm animate-fadeUp"
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="brand-wordmark text-3xl font-light text-ink">{monogram(name)}</span>
        <span className="h-px w-10 bg-warmgray-300" />
        <span className="brand-wordmark text-sm font-light text-warmgray-500">{name}</span>
      </div>

      <div className="flex flex-col items-center gap-4">
        <span className="h-6 w-6 animate-spin rounded-full border border-warmgray-200 border-t-ink" />
        <span className="text-[10px] uppercase tracking-editorial text-warmgray-500">
          {message}
        </span>
      </div>
    </div>
  );
}
