import BrandLoader from "@/components/ui/BrandLoader";

// Fallback de navegación para las rutas públicas. Next.js lo muestra
// mientras el Server Component de la página resuelve sus datos, sin
// recargar el navegador y sin desmontar el header ni el carrito.
export default function Loading() {
  return <BrandLoader message="Cargando..." />;
}
