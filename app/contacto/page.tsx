import { MessageCircle, Instagram, Mail } from "lucide-react";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import ContactForm from "@/components/contact/ContactForm";
import { BRAND_EMAIL } from "@/lib/site";

// El email de contacto sigue sin tener columna en `store_settings`
// (agregarla implicaba tocar esquema, tipos, service y formulario de
// admin). Ahora al menos vive en un solo lugar, junto al resto de los
// datos fijos de la marca: lib/site.ts.
const CONTACT_EMAIL = BRAND_EMAIL;

export default async function ContactPage() {
  const storeSettings = await getStoreSettingsOrDefault();

  return (
    <div className="container-app py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="eyebrow mb-4">Contacto</p>
          <h1 className="text-4xl font-light sm:text-5xl">¿Cómo podemos ayudarte?</h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-warmgray-500">
            Escribinos por el canal que prefieras. Respondemos de lunes a viernes.
          </p>
        </div>

        <div className="mt-14">
          <ContactForm whatsappNumber={storeSettings.whatsappNumber} email={CONTACT_EMAIL} />
        </div>

        {/* Accesos directos: los mismos tres de antes, ahora al pie del
            formulario y sin tarjetas, para quien prefiere no completar
            nada. */}
        <div className="mt-16 border-t border-warmgray-100 pt-10">
          <p className="eyebrow mb-6 text-center">O escribinos directamente</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <a
              href={`https://wa.me/${storeSettings.whatsappNumber}`}
              target="_blank"
              className="link-quiet inline-flex items-center gap-2 text-sm text-warmgray-600"
            >
              <MessageCircle size={15} strokeWidth={1.5} /> WhatsApp
            </a>
            {storeSettings.instagram && (
              <a
                href={storeSettings.instagram}
                target="_blank"
                className="link-quiet inline-flex items-center gap-2 text-sm text-warmgray-600"
              >
                <Instagram size={15} strokeWidth={1.5} /> Instagram
              </a>
            )}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="link-quiet inline-flex items-center gap-2 text-sm text-warmgray-600"
            >
              <Mail size={15} strokeWidth={1.5} /> {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
