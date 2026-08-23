import type { Metadata } from "next";
import ContentPage, { ContentSection } from "@/components/layout/ContentPage";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Envíos",
  description: "Cómo, cuándo y a dónde enviamos tu compra de Angelo Mio.",
  alternates: { canonical: "/envios" },
};

export const revalidate = 60;

// El costo, las zonas y el texto de envíos son los que el admin carga
// en /admin/configuracion (`store_settings`). Esta página los muestra,
// no los define: si el panel todavía no tiene nada cargado, cada bloque
// se oculta en vez de mostrar un dato inventado.
export default async function ShippingPage() {
  const settings = await getStoreSettingsOrDefault();
  const { cost, zones, info } = settings.shipping;

  return (
    <ContentPage
      eyebrow="Ayuda"
      title="Envíos"
      intro="Realizamos envíos a todo el país. Preparamos los pedidos de lunes a viernes."
    >
      {info && (
        <ContentSection title="Información de envío">
          <p className="whitespace-pre-line">{info}</p>
        </ContentSection>
      )}

      {cost > 0 && (
        <ContentSection title="Costo">
          <p>El costo de envío es de {formatPrice(cost)}.</p>
        </ContentSection>
      )}

      {zones.length > 0 && (
        <ContentSection title="Zonas">
          <ul className="list-inside list-disc space-y-1">
            {zones.map((zone) => (
              <li key={zone}>{zone}</li>
            ))}
          </ul>
        </ContentSection>
      )}

      <ContentSection title="Seguimiento">
        <p>
          Cuando despachamos tu pedido te avisamos por WhatsApp con el número de seguimiento.
          También podés ver el estado de tu compra desde Mi cuenta.
        </p>
      </ContentSection>

      <ContentSection title="Retiro">
        <p>
          Si preferís retirar tu compra en persona, escribinos antes de finalizar el pedido y lo
          coordinamos.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
