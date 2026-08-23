"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { StoreSettings } from "@/lib/types";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import CartItemThumb from "@/components/cart/CartItemThumb";

export default function CheckoutPageClient({ storeSettings }: { storeSettings: StoreSettings }) {
  const { items, total } = useCart();

  return (
    <div className="container-app py-10 sm:py-14">
      <h1 className="mb-10 border-b border-warmgray-100 pb-8 title-editorial">Completar datos</h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm storeSettings={storeSettings} />
        </div>

        <div className="card-surface h-fit p-6">
          <h3 className="mb-5 text-[11px] uppercase tracking-editorial">Tu pedido</h3>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                <CartItemThumb src={item.image} alt={item.name} className="h-20 w-16" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{item.name}</p>
                  {item.variantLabel && (
                    <p className="text-xs text-warmgray-500">{item.variantLabel}</p>
                  )}
                  <p className="text-xs text-warmgray-500">Cantidad: {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-warmgray-100 pt-4">
            <span className="font-medium">Total</span>
            <span className="text-base">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
