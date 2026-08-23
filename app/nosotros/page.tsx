import type { Metadata } from "next";
import ContentPage, { ContentSection } from "@/components/layout/ContentPage";
import { BRAND_ADDRESS, BRAND_WORDMARK } from "@/lib/site";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Angelo Mio es una marca argentina de indumentaria y accesorios. Básicos versátiles, bien hechos, para todos los días.",
  alternates: { canonical: "/nosotros" },
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="La marca"
      title={BRAND_WORDMARK}
      intro="Somos una marca argentina de indumentaria y accesorios. Hacemos prendas versátiles, pensadas para usarse todos los días y durar más de una temporada."
    >
      <ContentSection title="Qué hacemos">
        <p>
          Trabajamos con una idea simple: menos prendas, mejor elegidas. Jeans, remeras, camisas
          y accesorios que combinan entre sí y se adaptan a cualquier momento del día, sin
          depender de la tendencia del mes.
        </p>
      </ContentSection>

      <ContentSection title="Cómo elegimos">
        <p>
          Cada prenda se prueba antes de entrar al catálogo: calce, caída, resistencia del
          textil y comportamiento después del lavado. Si no pasa esa prueba, no la vendemos.
        </p>
      </ContentSection>

      <ContentSection title="Dónde estamos">
        <p>{BRAND_ADDRESS}</p>
        <p>Realizamos envíos a todo el país.</p>
      </ContentSection>
    </ContentPage>
  );
}
