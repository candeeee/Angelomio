import type { Metadata } from "next";
import { getPublicProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import FavoritesClient from "./FavoritesClient";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Las prendas que guardaste en Angelo Mio.",
  // Lista personal: no aporta nada a un buscador y cambia por dispositivo.
  robots: { index: false, follow: true },
};

export const revalidate = 60;

export default async function FavoritesPage() {
  const [products, categories] = await Promise.all([getPublicProducts(), getCategories()]);

  return <FavoritesClient products={products} categories={categories} />;
}
