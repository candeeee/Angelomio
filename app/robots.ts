import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// El panel, el checkout y las páginas de cuenta no deben indexarse:
// no aportan nada a un buscador y algunas exponen datos del comprador.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/cuenta", "/carrito", "/pedido-confirmado", "/favoritos"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
