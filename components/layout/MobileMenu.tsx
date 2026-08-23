"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Heart, ShoppingBag, Search, LogOut, LayoutDashboard, Package } from "lucide-react";
import { Category } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

// ─────────────────────────────────────────────────────────────
// MENÚ MOBILE
//
// POR QUÉ ES UN COMPONENTE APARTE Y NO VIVE DENTRO DE <header>:
//
// Este es el bug que rompía el menú en celular. El header tiene
// `backdrop-blur-md`, y según la especificación de Filter Effects,
// cualquier valor de `filter`/`backdrop-filter` distinto de `none`
// convierte al elemento en CONTAINING BLOCK de sus descendientes
// `position: fixed`.
//
// Resultado: el panel `fixed inset-0` no se posicionaba contra el
// viewport sino contra el header — o sea, se abría dentro de una franja
// de ~64px de alto, tapada y sin poder tocar nada. Visualmente parecía
// "el menú no abre".
//
// Sacándolo del header y renderizándolo como hermano (hijo directo del
// body), `fixed inset-0` vuelve a referirse al viewport. No hace falta
// un portal: los providers del layout no renderizan DOM propio.
//
// El resto de los requisitos del menú están resueltos acá:
//  · botón X, cierre al tocar fuera, cierre al elegir una opción
//  · cierre con Escape
//  · bloqueo del scroll del body (ver lib/use-body-scroll-lock.ts)
//  · scroll interno si hay muchas categorías
//  · z-50, por encima del header (z-30)
//  · respeta el notch/áreas seguras de iPhone
// ─────────────────────────────────────────────────────────────

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  wordmark: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userLabel?: string;
  userEmail?: string;
  favoritesCount: number;
  cartCount: number;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onLogout: () => void;
}

function MenuLink({
  href,
  onClick,
  children,
  emphasis = false,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      // min-h-[52px]: objetivo táctil cómodo. Con py-4 sobre una línea
      // de texto de 10px quedaban ~38px, por debajo de lo recomendado.
      className={`flex min-h-[52px] items-center justify-between border-b border-warmgray-100 text-xs uppercase tracking-editorial ${
        emphasis ? "text-ink" : "text-warmgray-600"
      }`}
    >
      {children}
    </Link>
  );
}

export default function MobileMenu({
  open,
  onClose,
  categories,
  wordmark,
  isAuthenticated,
  isAdmin,
  userLabel,
  userEmail,
  favoritesCount,
  cartCount,
  onOpenSearch,
  onOpenCart,
  onLogout,
}: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);

  // Escape cierra. Además se mueve el foco al panel para que el lector
  // de pantalla y la navegación por teclado entren al menú y no queden
  // atrás, en la página.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/40"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-cream outline-none"
          >
            {/* Cabecera fija del panel */}
            <div className="flex shrink-0 items-center justify-between border-b border-warmgray-100 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <span className="brand-wordmark text-sm">{wordmark}</span>
              <button
                onClick={onClose}
                aria-label="Cerrar menú"
                className="-mr-2 rounded-sm p-2.5 transition-colors hover:bg-beige-100"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Cuerpo con scroll propio: si hay muchas categorías, se
                desplaza acá adentro y la cabecera queda fija. */}
            <nav className="flex-1 overflow-y-auto overscroll-contain px-5">
              <MenuLink href="/" onClick={onClose} emphasis>
                Inicio
              </MenuLink>

              {/* Categorías REALES de Supabase, en el orden configurado
                  desde /admin/categorias. Si el admin crea una, aparece
                  acá sin tocar código. */}
              {categories.map((c) => (
                <MenuLink key={c.id} href={`/productos?categoria=${c.slug}`} onClick={onClose}>
                  {c.name}
                </MenuLink>
              ))}

              <MenuLink href="/productos" onClick={onClose}>
                Ver todo
              </MenuLink>

              {/* Accesos rápidos */}
              <div className="mt-6 border-t border-warmgray-100 pt-2">
                <p className="eyebrow py-3">Tu cuenta</p>

                <button
                  onClick={() => {
                    onClose();
                    onOpenSearch();
                  }}
                  className="flex min-h-[52px] w-full items-center gap-3 border-b border-warmgray-100 text-left text-xs uppercase tracking-editorial text-warmgray-600"
                >
                  <Search size={16} strokeWidth={1.5} /> Buscar
                </button>

                <MenuLink href="/favoritos" onClick={onClose}>
                  <span className="flex items-center gap-3">
                    <Heart size={16} strokeWidth={1.5} /> Favoritos
                  </span>
                  {favoritesCount > 0 && <span>{favoritesCount}</span>}
                </MenuLink>

                <button
                  onClick={() => {
                    onClose();
                    onOpenCart();
                  }}
                  className="flex min-h-[52px] w-full items-center justify-between border-b border-warmgray-100 text-left text-xs uppercase tracking-editorial text-warmgray-600"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag size={16} strokeWidth={1.5} /> Carrito
                  </span>
                  {cartCount > 0 && <span>{cartCount}</span>}
                </button>

                {/* CUENTA / LOGIN — el acceso que faltaba en mobile.
                    En pantallas chicas el ícono de cuenta del header
                    está oculto por espacio, así que este es el único
                    camino a /login: no puede faltar ni depender de que
                    haya sesión. */}
                {isAuthenticated ? (
                  <>
                    {(userLabel || userEmail) && (
                      <div className="border-b border-warmgray-100 py-4">
                        <p className="truncate text-sm normal-case tracking-normal text-ink">
                          {userLabel || "Mi cuenta"}
                        </p>
                        {userEmail && (
                          <p className="truncate text-xs normal-case tracking-normal text-warmgray-500">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    )}
                    <MenuLink href="/cuenta" onClick={onClose} emphasis>
                      <span className="flex items-center gap-3">
                        <User size={16} strokeWidth={1.5} /> Mi cuenta
                      </span>
                    </MenuLink>
                    {!isAdmin && (
                      <MenuLink href="/cuenta" onClick={onClose}>
                        <span className="flex items-center gap-3">
                          <Package size={16} strokeWidth={1.5} /> Mis pedidos
                        </span>
                      </MenuLink>
                    )}
                    {isAdmin && (
                      <MenuLink href="/admin" onClick={onClose} emphasis>
                        <span className="flex items-center gap-3">
                          <LayoutDashboard size={16} strokeWidth={1.5} /> Panel
                        </span>
                      </MenuLink>
                    )}
                    <button
                      onClick={onLogout}
                      className="flex min-h-[52px] w-full items-center gap-3 text-left text-xs uppercase tracking-editorial text-warmgray-600"
                    >
                      <LogOut size={16} strokeWidth={1.5} /> Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <MenuLink href="/login" onClick={onClose} emphasis>
                      <span className="flex items-center gap-3">
                        <User size={16} strokeWidth={1.5} /> Iniciar sesión
                      </span>
                    </MenuLink>
                    <MenuLink href="/registro" onClick={onClose}>
                      Crear cuenta
                    </MenuLink>
                  </>
                )}
              </div>

              {/* Respiro inferior para el gesto de home de iOS. */}
              <div className="h-[max(2rem,env(safe-area-inset-bottom))]" />
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
