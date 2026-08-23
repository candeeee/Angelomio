"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import CartItemThumb from "@/components/cart/CartItemThumb";

export default function CartPage() {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-24 text-center">
        <h1 className="mb-4 title-editorial">Tu carrito está vacío</h1>
        <p className="mb-6 text-sm text-warmgray-500">
          Explorá el catálogo y encontrá tus próximos básicos.
        </p>
        <Link href="/productos">
          <Button>Ver productos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-10 sm:py-14">
      <h1 className="mb-10 border-b border-warmgray-100 pb-8 title-editorial">Carrito</h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y divide-warmgray-100">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId}`} className="flex gap-4 py-6">
                <CartItemThumb src={item.image} alt={item.name} className="h-32 w-24" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-sm text-warmgray-500">{item.variantLabel}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 border border-warmgray-200 px-3 py-1.5">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1, item.variantId)
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1, item.variantId)
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">{formatPrice(item.price * item.quantity)}</span>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-warmgray-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface h-fit p-6">
          <h3 className="mb-5 text-[11px] uppercase tracking-editorial">Resumen</h3>
          <div className="flex items-center justify-between text-sm text-warmgray-700">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <p className="mt-1 text-xs text-warmgray-500">
            El costo de envío se coordina luego de confirmar el pedido.
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-warmgray-100 pt-4">
            <span className="font-medium">Total</span>
            <span className="text-base">{formatPrice(total)}</span>
          </div>
          <Link href="/checkout">
            <Button className="mt-6 w-full">
              Finalizar compra <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
