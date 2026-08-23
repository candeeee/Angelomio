import Image from "next/image";
import Link from "next/link";
import { StoreSettings } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Hero editorial.
//
// Sigue leyendo los mismos datos de siempre (`banner_url` y
// `welcome_text` de `store_settings`) y manteniendo el único link a
// /productos.
//
// ALTURA EN MOBILE: se usa `svh` (small viewport height) en vez de
// `vh`. En Safari y Chrome de celular, `100vh` mide la ventana CON la
// barra de direcciones RETRAÍDA, así que un `78vh` real ocupa bastante
// más de lo que se ve y empuja todo lo que viene abajo fuera de la
// pantalla inicial — parte del motivo por el que la sección de
// categorías "no aparecía". `svh` mide la ventana con la barra
// desplegada, que es lo que el usuario ve al entrar.
//
// Ya no usa framer-motion: la entrada es una animación CSS, así que
// este componente volvió a ser un Server Component (ver
// components/ui/Reveal.tsx).
// ─────────────────────────────────────────────────────────────

interface HeroProps {
  storeSettings: StoreSettings;
  /** Titular. Cae al texto de bienvenida configurado en el panel. */
  headline?: string;
}

export default function Hero({ storeSettings, headline }: HeroProps) {
  const title = headline || storeSettings.welcomeText || "Básicos para todos los días.";

  return (
    <section className="relative flex h-[62svh] min-h-[420px] items-end overflow-hidden sm:h-[70svh] lg:h-[82svh]">
      {storeSettings.bannerUrl ? (
        <Image
          src={storeSettings.bannerUrl}
          alt={storeSettings.storeName}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        // Placeholder neutro: sin banner cargado el hero conserva su
        // estructura en vez de colapsar. No se usa una foto de stock.
        <div className="absolute inset-0 bg-beige-100" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />

      <div className="container-app animate-fadeUp relative z-10 pb-12 sm:pb-16 lg:pb-20">
        <p className="mb-4 text-[10px] uppercase tracking-brand text-cream/80 sm:mb-5">
          Nueva colección
        </p>
        <h1 className="max-w-3xl text-[28px] font-light leading-[1.12] text-cream sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <Link
          href="/productos"
          className="btn-secondary mt-7 border-cream/50 text-cream hover:border-cream hover:bg-cream hover:text-ink sm:mt-9"
        >
          Ver colección
        </Link>
      </div>
    </section>
  );
}
