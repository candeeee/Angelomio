"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingBag, User, LogOut, Package, LayoutDashboard, Search, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { Category, StoreSettings } from "@/lib/types";
import { BRAND_WORDMARK } from "@/lib/site";
import MobileMenu from "@/components/layout/MobileMenu";

// ─────────────────────────────────────────────────────────────
// Header Angelo Mio.
//
// Estructura:
//   izquierda → logotipo
//   centro    → Inicio + categorías reales de Supabase (sólo ≥1024px)
//   derecha   → Buscar · Cuenta (≥640px) · Favoritos · Carrito · Menú
//
// Las categorías NO están hardcodeadas: llegan por prop desde el layout
// (Server Component), que las lee de Supabase con el orden configurado
// en /admin/categorias. Es la única fuente de verdad.
//
// El menú mobile vive en <MobileMenu>, RENDERIZADO FUERA DEL <header>.
// El motivo está explicado en ese archivo: el `backdrop-blur` del
// header creaba un containing block que rompía el `position: fixed` del
// panel. No moverlo de nuevo adentro.
// ─────────────────────────────────────────────────────────────

interface NavbarProps {
  storeSettings: StoreSettings;
  categories: Category[];
}

export default function Navbar({ storeSettings, categories }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { count, openCart } = useCart();
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();
  const { count: favoritesCount, hydrated: favoritesHydrated } = useFavorites();
  const router = useRouter();

  // El nombre sale de la configuración: si el admin lo cambia desde el
  // panel, el logotipo cambia con él.
  const wordmark = storeSettings.storeName || BRAND_WORDMARK;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  async function handleLogout() {
    await signOut();
    setAccountOpen(false);
    setMenuOpen(false);
    router.push("/");
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  }

  // El contador sólo se muestra después de hidratar. Sin esto, el HTML
  // del servidor (siempre 0) y el primer render del cliente (con lo
  // guardado en localStorage) no coinciden y React tira un error de
  // hidratación en la consola.
  const showFavoritesCount = favoritesHydrated && favoritesCount > 0;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-warmgray-100 bg-cream/90 backdrop-blur-md">
        <div className="container-app flex h-14 items-center justify-between gap-3 sm:h-16 lg:h-20 lg:gap-6">
          {/* Logotipo. El tracking se reduce en pantallas chicas: con
              `tracking-brand` (0.28em) "ANGELO MIO" no entra junto a
              cuatro íconos en un viewport de 320px. */}
          <Link
            href="/"
            className="brand-wordmark shrink-0 whitespace-nowrap text-[13px] tracking-[0.16em] sm:text-base sm:tracking-brand lg:text-lg"
            aria-label={`${wordmark} — Inicio`}
          >
            {wordmark}
          </Link>

          {/* Navegación desktop */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-6 lg:flex xl:gap-9">
            <Link
              href="/"
              className="link-quiet whitespace-nowrap text-[10px] uppercase tracking-editorial text-warmgray-600 hover:text-ink"
            >
              Inicio
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/productos?categoria=${c.slug}`}
                className="link-quiet whitespace-nowrap text-[10px] uppercase tracking-editorial text-warmgray-600 hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="link-quiet flex items-center gap-1.5 whitespace-nowrap text-[10px] uppercase tracking-editorial text-ink"
              >
                <LayoutDashboard size={13} strokeWidth={1.5} /> Panel
              </Link>
            )}
          </nav>

          {/* Acciones */}
          <div className="flex shrink-0 items-center">
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className="rounded-sm p-2 transition-colors hover:bg-beige-100 sm:p-2.5"
              aria-label="Buscar"
              aria-expanded={searchOpen}
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {/* Cuenta: sólo desde 640px. En mobile el acceso está en el
                menú hamburguesa (ver MobileMenu), donde siempre hay una
                entrada visible a Iniciar sesión / Mi cuenta. */}
            <div className="relative hidden sm:block" ref={accountRef}>
              <button
                onClick={() => setAccountOpen((o) => !o)}
                className="rounded-sm p-2.5 transition-colors hover:bg-beige-100"
                aria-label="Cuenta"
                aria-expanded={accountOpen}
              >
                <User size={18} strokeWidth={1.5} />
              </button>
              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-sm border border-warmgray-100 bg-white shadow-soft"
                  >
                    {isAuthenticated ? (
                      <>
                        <div className="border-b border-warmgray-100 px-4 py-3.5">
                          <p className="truncate text-sm">{profile?.full_name || "Mi cuenta"}</p>
                          <p className="truncate text-xs text-warmgray-500">{profile?.email}</p>
                        </div>
                        <Link
                          href="/cuenta"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-beige-50"
                        >
                          <User size={15} strokeWidth={1.5} /> Mi cuenta
                        </Link>
                        {/* Un admin no tiene pedidos propios. */}
                        {!isAdmin && (
                          <Link
                            href="/cuenta"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-beige-50"
                          >
                            <Package size={15} strokeWidth={1.5} /> Mis pedidos
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-beige-50"
                          >
                            <LayoutDashboard size={15} strokeWidth={1.5} /> Panel de administración
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 border-t border-warmgray-100 px-4 py-3 text-left text-sm text-warmgray-600 transition-colors hover:bg-beige-50 hover:text-ink"
                        >
                          <LogOut size={15} strokeWidth={1.5} /> Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-3 text-sm transition-colors hover:bg-beige-50"
                        >
                          Iniciar sesión
                        </Link>
                        <Link
                          href="/registro"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-3 text-sm transition-colors hover:bg-beige-50"
                        >
                          Crear cuenta
                        </Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Favoritos: ahora también en mobile (antes estaba oculto
                por debajo de 640px y no había forma de llegar). */}
            <Link
              href="/favoritos"
              className="relative rounded-sm p-2 transition-colors hover:bg-beige-100 sm:p-2.5"
              aria-label="Favoritos"
            >
              <Heart size={18} strokeWidth={1.5} />
              {showFavoritesCount && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium text-cream sm:right-1 sm:top-1">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <button
              onClick={openCart}
              className="relative rounded-sm p-2 transition-colors hover:bg-beige-100 sm:p-2.5"
              aria-label="Carrito"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium text-cream sm:right-1 sm:top-1">
                  {count}
                </span>
              )}
            </button>

            {/* Hamburguesa a la derecha, junto al resto de las acciones. */}
            <button
              className="-mr-1 rounded-sm p-2 transition-colors hover:bg-beige-100 sm:p-2.5 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Buscador desplegable — misma lógica en mobile y desktop, no
            hay un segundo buscador paralelo. */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-warmgray-100 bg-cream"
            >
              <form onSubmit={handleSearch} className="container-app flex items-center gap-3 py-3.5">
                <Search size={18} strokeWidth={1.5} className="shrink-0 text-warmgray-500" />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar prendas, colores, talles…"
                  aria-label="Buscar productos"
                  // text-base evita el zoom automático de iOS Safari al
                  // enfocar un input con fuente menor a 16px.
                  className="w-full min-w-0 border-0 bg-transparent py-1 text-base outline-none placeholder:text-warmgray-400 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Cerrar búsqueda"
                  className="shrink-0 rounded-sm p-1.5 text-warmgray-500 transition-colors hover:text-ink"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* FUERA del <header>: ver la explicación en MobileMenu.tsx. */}
      <div id="menu-mobile">
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          categories={categories}
          wordmark={wordmark}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          userLabel={profile?.full_name}
          userEmail={profile?.email}
          favoritesCount={favoritesHydrated ? favoritesCount : 0}
          cartCount={count}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCart={openCart}
          onLogout={handleLogout}
        />
      </div>
    </>
  );
}
