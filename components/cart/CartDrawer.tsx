"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Minus, Plus, X, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import CartItemThumb from "@/components/cart/CartItemThumb";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, total } = useCart();

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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-soft"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-warmgray-100 px-6 py-5">
              <h3 className="text-[11px] uppercase tracking-editorial">Tu carrito</h3>
              <button onClick={closeCart} className="rounded-full p-1.5 hover:bg-warmgray-100">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
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
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity - 1, item.variantId)
                              }
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-4 text-center text-xs">{item.quantity}</span>
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity + 1, item.variantId)
                              }
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-sm">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="self-start text-warmgray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-warmgray-100 px-6 py-5">
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
