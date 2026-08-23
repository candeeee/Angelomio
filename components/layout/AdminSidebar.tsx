"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  Settings,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_WORDMARK } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// Navegación del panel.
//
// CORRECCIÓN DE ESTA VERSIÓN: "Configuración" vuelve al menú. La
// página (`app/admin/configuracion/page.tsx`), su Server Action y el
// formulario existían y funcionaban, pero el ítem se había quitado del
// sidebar — o sea, la única forma de llegar era escribir la URL a mano.
// Es la pantalla que edita el nombre de la tienda, el WhatsApp, los
// medios de pago y los envíos, así que sin ella el rebrand no se puede
// completar desde la interfaz.
//
// El panel usa la misma identidad que el storefront (negro, blanco,
// versalita espaciada) pero con más densidad de información: es una
// herramienta de trabajo, no una vidriera.
// ─────────────────────────────────────────────────────────────

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <p className="brand-wordmark text-sm">{BRAND_WORDMARK}</p>
      {!compact && <p className="eyebrow mt-1.5">Panel de administración</p>}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-[10px] uppercase tracking-editorial transition-colors",
              active ? "bg-ink text-cream" : "text-warmgray-600 hover:bg-beige-50 hover:text-ink"
            )}
          >
            <item.icon size={16} strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-6 flex items-center gap-3 rounded-sm border-t border-warmgray-100 px-3.5 pb-2.5 pt-6 text-[10px] uppercase tracking-editorial text-warmgray-500 transition-colors hover:text-ink"
      >
        <ExternalLink size={16} strokeWidth={1.5} /> Ver tienda
      </Link>
    </nav>
  );
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden w-60 shrink-0 border-r border-warmgray-100 bg-white p-5 lg:block">
        <div className="mb-8 px-1">
          <BrandBlock />
        </div>
        <NavLinks />
      </aside>

      {/* Mobile */}
      <div className="flex items-center justify-between border-b border-warmgray-100 bg-white px-5 py-4 lg:hidden">
        <BrandBlock compact />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú del panel"
          className="rounded-sm p-2 transition-colors hover:bg-beige-50"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white p-5">
            <div className="mb-8 flex items-start justify-between">
              <BrandBlock />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú del panel"
                className="rounded-sm p-2 transition-colors hover:bg-beige-50"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
