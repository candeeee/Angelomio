"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// FAVORITOS
//
// El proyecto NO tenía favoritos: no hay tabla, ni service, ni columna
// en Supabase. Como el header y la card de producto los piden, se
// implementan de verdad — pero del lado del cliente, sin inventar
// estructura de base de datos que después haya que mantener.
//
// Consecuencia (documentada también en el README): la lista es POR
// DISPOSITIVO, no por cuenta. No se sincroniza entre el teléfono y la
// computadora ni sobrevive a un borrado de datos del navegador. Si en
// algún momento se quiere que siga a la cuenta, el cambio es una tabla
// `favorites (user_id, product_id)` y reemplazar el cuerpo de este
// provider — los componentes que lo consumen no se enteran.
//
// Mismo patrón exacto que CartContext (localStorage + flag `hydrated`
// para no pisar lo guardado durante el primer render del servidor).
// ─────────────────────────────────────────────────────────────

interface FavoritesContextValue {
  /** Ids de producto marcados como favoritos. */
  ids: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
  count: number;
  /** false hasta que se leyó localStorage — evita parpadeos en el header. */
  hydrated: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "angelo-mio-favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setIds(parsed.filter((value): value is string => typeof value === "string"));
        }
      }
    } catch {
      // Un localStorage corrupto no debe romper la navegación.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Modo privado / cuota llena: los favoritos siguen funcionando en
      // memoria durante la sesión.
    }
  }, [ids, hydrated]);

  function toggleFavorite(productId: string) {
    setIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }

  function removeFavorite(productId: string) {
    setIds((prev) => prev.filter((id) => id !== productId));
  }

  return (
    <FavoritesContext.Provider
      value={{
        ids,
        isFavorite: (productId: string) => ids.includes(productId),
        toggleFavorite,
        removeFavorite,
        clearFavorites: () => setIds([]),
        count: ids.length,
        hydrated,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return ctx;
}
