import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { ContentSection } from "@/components/layout/ContentPage";

export const metadata: Metadata = {
  title: "Cambios",
  description: "Política de cambios y devoluciones de Angelo Mio.",
  alternates: { canonical: "/cambios" },
};

export default function ReturnsPage() {
  return (
    <ContentPage
      eyebrow="Ayuda"
      title="Cambios"
      intro="Queremos que la prenda te quede como esperabas. Si no es así, la cambiamos."
    >
      <ContentSection title="Plazo">
        <p>
          Tenés 30 días corridos desde que recibís tu pedido para solicitar un cambio.
        </p>
      </ContentSection>

      <ContentSection title="Condiciones">
        <ul className="list-inside list-disc space-y-1.5">
          <li>La prenda debe estar sin uso y sin lavar.</li>
          <li>Debe conservar su etiqueta original.</li>
          <li>Es necesario presentar el número de pedido.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Cómo solicitarlo">
        <p>
          Escribinos por WhatsApp o desde la página de{" "}
          <Link href="/contacto" className="link-quiet text-ink">
            contacto
          </Link>{" "}
          indicando tu número de pedido y qué querés cambiar. Te respondemos con los pasos a
          seguir.
        </p>
      </ContentSection>

      <ContentSection title="Prendas en Sale">
        <p>
          Las prendas con precio rebajado admiten cambio por otro talle del mismo artículo,
          sujeto a disponibilidad de stock.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
