"use client";

import { motion } from "framer-motion";
import { Product, Category } from "@/lib/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  categories?: Category[];
  /** Ver ProductCard: apagado por defecto, lo enciende la home. */
  showAddToCart?: boolean;
}

export default function ProductGrid({
  products,
  categories = [],
  showAddToCart = false,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-warmgray-500">No encontramos productos con esos filtros.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-14 lg:grid-cols-4">
      {products.map((product, i) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: (i % 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProductCard
            product={product}
            categories={categories}
            showAddToCart={showAddToCart}
          />
        </motion.div>
      ))}
    </div>
  );
}
