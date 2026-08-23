"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import Button from "@/components/ui/Button";

interface OrderConfirmedClientProps {
  orderId: string;
  serverOrder: Order | null;
  whatsappNumber: string;
}

export default function OrderConfirmedClient({
  orderId,
  serverOrder,
  whatsappNumber,
}: OrderConfirmedClientProps) {
  const [order, setOrder] = useState<Order | null>(serverOrder);

  useEffect(() => {
    // sessionStorage tiene prioridad: es el pedido recién creado en
    // este mismo checkout, mostrado al instante sin esperar el
    // round-trip del fetch server-side de arriba. Si no está (recarga
    // de página, otra pestaña, o el usuario volviendo más tarde), usamos
    // lo que trajo el servidor (funciona vía RLS: es el dueño logueado
    // o un admin).
    const raw = sessionStorage.getItem("angelo-mio-last-order");
    if (raw) {
      const parsed: Order = JSON.parse(raw);
      if (parsed.id === orderId) {
        setOrder(parsed);
      }
    }
  }, [orderId]);

  if (!order) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-24 text-center">
        <p className="text-warmgray-500">No encontramos ese pedido.</p>
        <Link href="/productos" className="mt-4 underline">
          Volver a productos
        </Link>
      </div>
    );
  }

  const whatsappLink = buildWhatsAppLink(order, whatsappNumber);

  return (
    <div className="container-app flex flex-col items-center py-16 text-center sm:py-24">
      <CheckCircle2 className="mb-4 text-earth-500" size={56} />
      <h1 className="text-2xl sm:text-3xl">Pedido recibido correctamente</h1>
      <p className="mt-2 text-sm text-warmgray-500">
        Guardá tu número de pedido para hacer seguimiento.
      </p>

      <div className="card-surface mt-8 w-full max-w-md p-6 text-left">
        <div className="flex items-center justify-between">
          <span className="text-sm text-warmgray-500">Número de pedido</span>
          <span className="font-mono text-sm font-semibold">{order.number}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-warmgray-500">Estado</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            🟡 Pendiente de confirmar
          </span>
        </div>
        <div className="mt-4 border-t border-warmgray-100 pt-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between py-1 text-sm">
              <span>
                {item.name} x{item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-warmgray-100 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="mt-8">
        <Button size="lg" className="bg-[#25D366] hover:bg-[#1DA851]">
          <MessageCircle size={18} /> Enviar pedido por WhatsApp
        </Button>
      </a>

      <Link href="/productos" className="mt-6 text-sm text-warmgray-500 underline">
        Seguir comprando
      </Link>
    </div>
  );
}
