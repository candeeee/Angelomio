import BrandLoader from "@/components/ui/BrandLoader";

// Se aplica a /admin y a todas sus subrutas (productos, categorías,
// pedidos, clientes) que no definan su propio loading.
export default function AdminLoading() {
  return <BrandLoader message="Cargando el panel..." />;
}
