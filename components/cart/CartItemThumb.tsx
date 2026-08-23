import Image from "next/image";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Miniatura de un ítem del carrito.
//
// Existe por un motivo concreto: desde el rediseño, un producto sin
// foto cargada ya no recibe una imagen de stock de relleno, así que
// `CartItem.image` puede venir vacío. `next/image` con `src=""` tira un
// error en runtime y rompe el drawer entero. Acá se resuelve una sola
// vez, en lugar de repetir el mismo `if` en el drawer, la página de
// carrito y el resumen del checkout.
// ─────────────────────────────────────────────────────────────

interface CartItemThumbProps {
  src: string;
  alt: string;
  className?: string;
}

export default function CartItemThumb({ src, alt, className }: CartItemThumbProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-beige-100", className)}>
      {src && <Image src={src} alt={alt} fill className="object-cover" sizes="120px" />}
    </div>
  );
}
