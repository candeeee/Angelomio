"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { checkoutAction } from "@/app/checkout/actions";
import { StoreSettings } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface CheckoutFormProps {
  storeSettings: StoreSettings;
}

export default function CheckoutForm({ storeSettings }: CheckoutFormProps) {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { order, error } = await checkoutAction({
      customer: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes || undefined,
      },
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        variantLabel: i.variantLabel,
        price: i.price,
        quantity: i.quantity,
      })),
      total,
    });

    if (error || !order) {
      setSubmitting(false);
      setError(error ?? "No se pudo confirmar el pedido. Probá de nuevo.");
      return;
    }

    // Guardamos el pedido recién creado para que /pedido-confirmado/[id]
    // lo muestre de inmediato sin esperar el round-trip de un nuevo
    // fetch a Supabase — el checkout ya requiere sesión (ver README),
    // así que getOrder(id) también funcionaría por RLS (dueño del
    // pedido), pero esto evita cualquier lag de consistencia justo
    // después de crear el pedido.
    sessionStorage.setItem("angelo-mio-last-order", JSON.stringify(order));

    clearCart();
    router.push(`/pedido-confirmado/${order.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="field-label">Nombre completo</label>
        <input
          required
          name="name"
          value={form.name}
          onChange={handleChange}
          className="field"
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label">Teléfono</label>
          <input
            required
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="field"
          />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input
            required
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="field"
          />
        </div>
      </div>
      <div>
        <label className="field-label">Dirección</label>
        <input
          required
          name="address"
          value={form.address}
          onChange={handleChange}
          className="field"
        />
      </div>
      <div>
        <label className="field-label">Observaciones (opcional)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="field"
        />
      </div>

      {/* El texto anterior listaba `storeSettings.paymentMethods` y, si
          la tienda no tenía métodos cargados, quedaba la frase cortada:
          "coordinamos el pago por ." Ahora el canal es explícito y no
          depende de que ese campo esté completo. */}
      <div className="rounded-sm bg-beige-50 p-4 text-xs leading-relaxed text-warmgray-600">
        El pago no se realiza en esta página. Luego de confirmar tu pedido, coordinaremos el
        pago y los detalles de entrega por WhatsApp
        {storeSettings.whatsappNumber ? (
          <>
            {" "}
            (+{storeSettings.whatsappNumber})
          </>
        ) : null}
        .
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between border-t border-warmgray-100 pt-5">
        <span className="text-sm text-warmgray-500">Total del pedido</span>
        <span className="text-lg font-semibold">{formatPrice(total)}</span>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Confirmando..." : "Confirmar pedido"}
      </Button>
    </form>
  );
}
