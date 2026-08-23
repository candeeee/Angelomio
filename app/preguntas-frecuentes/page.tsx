import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { ContentSection } from "@/components/layout/ContentPage";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Dudas sobre talles, envíos, pagos y cambios en Angelo Mio.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

export default function FaqPage() {
  return (
    <ContentPage eyebrow="Ayuda" title="Preguntas frecuentes">
      <ContentSection title="¿Cómo sé qué talle me queda?">
        <p>
          Cada producto tiene su guía de talles en la ficha, dentro de la solapa
          &laquo;Guía de talles&raquo;. Si estás entre dos talles, te recomendamos el mayor. Ante
          la duda, escribinos y te ayudamos.
        </p>
      </ContentSection>

      <ContentSection title="¿Necesito cuenta para comprar?">
        <p>
          Sí. Para confirmar un pedido tenés que iniciar sesión: así podés seguir el estado de
          tu compra y consultar tu historial desde Mi cuenta.
        </p>
      </ContentSection>

      <ContentSection title="¿Cómo puedo pagar?">
        <p>
          Los medios de pago disponibles se muestran al finalizar la compra. Si tenés alguna
          consulta antes de pagar, escribinos.
        </p>
      </ContentSection>

      <ContentSection title="¿Hacen envíos a todo el país?">
        <p>
          Sí. Podés ver los detalles en{" "}
          <Link href="/envios" className="link-quiet text-ink">
            envíos
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection title="¿Puedo cambiar una prenda?">
        <p>
          Sí, dentro de los 30 días y sin uso. Los detalles están en{" "}
          <Link href="/cambios" className="link-quiet text-ink">
            cambios
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection title="¿Cómo sigo mi pedido?">
        <p>
          Desde Mi cuenta vas a ver el estado de cada compra: pendiente, confirmado, preparando,
          enviado y entregado.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
