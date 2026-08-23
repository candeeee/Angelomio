"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { StoreSettings } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Hero editorial.
//
// Sigue leyendo los MISMOS datos de siempre (`banner_url` y
// `welcome_text` de `store_settings`) y manteniendo el único link a
// /productos. Lo que cambia es el peso visual: la fotografía pasa a ser
// protagonista y ocupa casi toda la ventana, con el texto mínimo que
// pide el brief y un degradado solo en la base para que el titular sea
// legible sobre cualquier foto.
// ─────────────────────────────────────────────────────────────

interface HeroProps {
  storeSettings: StoreSettings;
  /** Titular. Cae al texto de bienvenida configurado en el panel. */
  headline?: string;
}

export default function Hero({ storeSettings, headline }: HeroProps) {
  const title = headline || storeSettings.welcomeText || "Básicos para todos los días.";

  return (
    <section className="relative flex h-[78vh] min-h-[460px] items-end overflow-hidden sm:h-[88vh]">
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
        // Placeholder neutro y elegante: sin banner cargado el hero
        // sigue teniendo estructura en vez de colapsar.
        <div className="absolute inset-0 bg-beige-100" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="container-app relative z-10 pb-14 sm:pb-20"
      >
        <p className="mb-5 text-[10px] uppercase tracking-brand text-cream/80">Nueva colección</p>
        <h1 className="max-w-3xl text-3xl font-light leading-[1.1] text-cream sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <Link
          href="/productos"
          className="btn-secondary mt-9 border-cream/50 text-cream hover:border-cream hover:bg-cream hover:text-ink"
        >
          Ver colección
        </Link>
      </motion.div>
    </section>
  );
}
