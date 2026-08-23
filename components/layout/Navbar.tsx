"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ShoppingBag,
  User,
  LogOut,
  Package,
  LayoutDashboard,
  Search,
  Heart,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { Category, StoreSettings } from "@/lib/types";
import { BRAND_WORDMARK } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// Header Angelo Mio.
//
// Estructura pedida:
//   izquierda  → logotipo
//   centro     → Inicio + las categorías reales de la base
//   derecha    → Buscar · Cuenta · Favoritos · Carrito
//
// Las categorías NO están hardcodeadas: llegan por prop desde el layout
// (Server Component), que las lee de Supabase. Si el admin agrega
// "Sale" o renombra "Indumentaria", el header lo refleja sin tocar
// código.
//
// Se conserva íntegro el comportamiento que ya existía:
//  - menú de cuenta con sesión / sin sesión, logout y acceso al panel;
//  - "Mis pedidos" oculto para administradores (no compran en su propia
//    tienda);
//  - contador del carrito y apertura del drawer.
//
// Agregados de esta versión: buscador (navega a /productos?q=) y acceso
// a Favoritos con su contador.
// ─────────────────────────────────────────────────────────────

interface NavbarProps {
  storeSettings: StoreSettings;
  categories: Category[];
}

export default function Navbar({ storeSettings, categories }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { count, openCart } = useCart();
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();
  const { count: favoritesCount, hydrated: favoritesHydrated } = useFavorites();
  const router = useRouter();

  // El nombre de la tienda sigue saliendo de la configuración: si el
  // admin lo cambia desde el panel, el logotipo cambia con él.
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

  // Cerrar el buscador con Escape y enfocarlo al abrirlo: sin esto, el
  // panel se abre y el usuario tiene que ir a buscar el input con el
  // mouse.
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
    setOpen(false);
    router.push("/");
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setOpen(false);
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-warmgray-100 bg-cream/90 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-6 sm:h-20">
        {/* Izquierda: menú mobile + logotipo */}
        <div className="flex items-center gap-2">
          <button
            className="-ml-2 rounded-sm p-2 transition-colors hover:bg-beige-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <Link
            href="/"
            className="brand-wordmark whitespace-nowrap text-base sm:text-lg"
            aria-label={`${wordmark} — Inicio`}
          >
            {wordmark}
          </Link>
        </div>

        {/* Centro: navegación desktop */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-7 xl:gap-9 lg:flex">
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

        {/* Derecha: buscar, cuenta, favoritos, carrito */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="rounded-sm p-2.5 transition-colors hover:bg-beige-100"
            aria-label="Buscar"
            aria-expanded={searchOpen}
          >
            <Search size={18} strokeWidth={1.5} />
          </button>

          {/* Cuenta (desktop) */}
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
                      {/* Un admin no tiene pedidos propios: no se le muestra. */}
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

          <Link
            href="/favoritos"
            className="relative hidden rounded-sm p-2.5 transition-colors hover:bg-beige-100 sm:block"
            aria-label="Favoritos"
          >
            <Heart size={18} strokeWidth={1.5} />
            {favoritesHydrated && favoritesCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium text-cream">
                {favoritesCount}
              </span>
            )}
          </Link>

          <button
            onClick={openCart}
            className="relative rounded-sm p-2.5 transition-colors hover:bg-beige-100"
            aria-label="Carrito"
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[9px] font-medium text-cream">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Buscador desplegable */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-warmgray-100 bg-cream"
          >
            <form onSubmit={handleSearch} className="container-app flex items-center gap-3 py-4">
              <Search size={18} strokeWidth={1.5} className="shrink-0 text-warmgray-500" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar prendas, colores, talles…"
                aria-label="Buscar productos"
                className="w-full border-0 bg-transparent py-1 text-sm outline-none placeholder:text-warmgray-400"
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

      {/* Menú mobile: panel lateral completo, no un acordeón apretado */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-cream"
              aria-label="Menú principal"
            >
              <div className="flex items-center justify-between border-b border-warmgray-100 px-5 py-5">
                <span className="brand-wordmark text-base">{wordmark}</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="rounded-sm p-2 transition-colors hover:bg-beige-100"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-2">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-ink"
                >
                  Inicio
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/productos?categoria=${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                  >
                    {c.name}
                  </Link>
                ))}
                <Link
                  href="/productos"
                  onClick={() => setOpen(false)}
                  className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                >
                  Ver todo
                </Link>
                <Link
                  href="/favoritos"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                >
                  <span>Favoritos</span>
                  {favoritesHydrated && favoritesCount > 0 && <span>{favoritesCount}</span>}
                </Link>

                <div className="mt-6 border-t border-warmgray-100 pt-2">
                  {isAuthenticated ? (
                    <>
                      <Link
                        href="/cuenta"
                        onClick={() => setOpen(false)}
                        className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                      >
                        Mi cuenta
                      </Link>
                      {!isAdmin && (
                        <Link
                          href="/cuenta"
                          onClick={() => setOpen(false)}
                          className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                        >
                          Mis pedidos
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setOpen(false)}
                          className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-ink"
                        >
                          Panel de administración
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full py-4 text-left text-xs uppercase tracking-editorial text-warmgray-600"
                      >
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="block border-b border-warmgray-100 py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        href="/registro"
                        onClick={() => setOpen(false)}
                        className="block py-4 text-xs uppercase tracking-editorial text-warmgray-600"
                      >
                        Crear cuenta
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
