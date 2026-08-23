"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Minus, Plus, X, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import CartItemThumb from "@/components/cart/CartItemThumb";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, total } = useCart();

  // El carrito se abre a pantalla casi completa en mobile: sin esto, al
  // scrollear dentro del panel se movía la página de atrás y al cerrar
  // el usuario terminaba en otro punto de la página.
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeCart]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-[100svh] w-full max-w-md flex-col bg-cream shadow-soft"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-warmgray-100 px-5 py-4 sm:px-6 sm:py-5">
              <h3 className="text-[11px] uppercase tracking-editorial">Tu carrito</h3>
              <button onClick={closeCart} aria-label="Cerrar carrito" className="-mr-2 rounded-sm p-2.5 transition-colors hover:bg-beige-100">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {items.length === 0 ? (
                <p className="mt-10 text-center text-sm text-warmgray-500">
                  Tu carrito está vacío.
                </p>
              ) : (
                <ul className="space-y-5">
                  {items.map((item) => (
                    <li key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                      <CartItemThumb src={item.image} alt={item.name} className="h-24 w-[72px]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.variantLabel && (
                          <p className="text-xs text-warmgray-500">{item.variantLabel}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 border border-warmgray-200 px-2 py-1">
                            <button
                              aria-label="Quitar una unidad"
                              className="-my-1 px-1.5 py-2"
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity - 1, item.variantId)
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-4 text-center text-xs">{item.quantity}</span>
                            <button
                              aria-label="Agregar una unidad"
                              className="-my-1 px-1.5 py-2"
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity + 1, item.variantId)
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <span className="text-sm">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        aria-label="Eliminar del carrito"
                        className="-mr-2 -mt-1 self-start p-2 text-warmgray-400 transition-colors hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-warmgray-100 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-warmgray-500">Total</span>
                  <span className="text-base">{formatPrice(total)}</span>
                </div>
                <Link href="/carrito" onClick={closeCart}>
                  <Button className="w-full">Ver carrito y finalizar</Button>
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
