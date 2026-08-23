import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import { getCategories } from "@/lib/services/categories";
import { SITE_URL } from "@/lib/site";

// Tipografía 100% sans serif. DM Sans para titulares y logotipo (formas
// abiertas, buen rendimiento en versalita muy espaciada) e Inter para
// interfaz y textos largos. `next/font` las autohostea y las inyecta
// como variables CSS que lee tailwind.config — no se agregó ninguna
// dependencia al package.json.
const display = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Angelo Mio | Indumentaria y accesorios",
    template: "%s | Angelo Mio",
  },
  description:
    "Angelo Mio. Indumentaria y accesorios para todos los días: jeans, remeras, camisas y básicos con envíos a todo el país.",
  keywords: ["indumentaria", "ropa", "jeans", "remeras", "camisas", "accesorios", "Argentina"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Angelo Mio",
    title: "Angelo Mio | Indumentaria y accesorios",
    description: "Prendas para todos los días. Envíos a todo el país.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Angelo Mio | Indumentaria y accesorios",
    description: "Prendas para todos los días. Envíos a todo el país.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Las categorías se leen acá (una sola vez por request) para que la
  // navegación del header sea la real de la base y no una lista
  // hardcodeada que quede desfasada cuando el admin cargue o renombre
  // una categoría.
  const [storeSettings, categories] = await Promise.all([
    getStoreSettingsOrDefault(),
    getCategories(),
  ]);

  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <Navbar storeSettings={storeSettings} categories={categories} />
              <main className="min-h-screen">{children}</main>
              <Footer />
              <CartDrawer />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
