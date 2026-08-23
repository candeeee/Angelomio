import { Product, Category } from "@/lib/types";
import ProductCard from "./ProductCard";
import Reveal from "@/components/ui/Reveal";

interface ProductGridProps {
  products: Product[];
  categories?: Category[];
  /** Ver ProductCard: apagado por defecto, lo enciende la home. */
  showAddToCart?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Grilla de productos.
//
// Responsive: 2 columnas en mobile, 2 en tablet chica, 3 desde 768px y
// 4 desde 1024px. Se mantiene en 2 columnas hasta 640px a propósito —
// con 3 columnas en un teléfono, la foto queda tan chica que no se
// distingue la prenda.
//
// Ya NO usa framer-motion (antes cada card era un `motion.div` con
// `whileInView` y `opacity: 0` inicial). Motivo detallado en
// components/ui/Reveal.tsx: el contenido no debe depender de JavaScript
// para ser visible. Como consecuencia, este archivo dejó de necesitar
// "use client" y puede renderizarse en el servidor cuando lo usa un
// Server Component (la home). ProductCard sigue siendo el límite
// cliente, porque necesita carrito y favoritos.
// ─────────────────────────────────────────────────────────────
export default function ProductGrid({
  products,
  categories = [],
  showAddToCart = false,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-warmgray-500">No encontramos productos con esos filtros.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-14 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <Reveal key={product.id} delay={(i % 8) * 0.05}>
          <ProductCard
            product={product}
            categories={categories}
            showAddToCart={showAddToCart}
          />
        </Reveal>
      ))}
    </div>
  );
}
