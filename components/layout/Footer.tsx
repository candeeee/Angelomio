import Link from "next/link";
import { Instagram, Facebook, MessageCircle, MapPin, Truck } from "lucide-react";
import { getStoreSettingsOrDefault } from "@/lib/services/store-settings";
import { BRAND_ADDRESS, BRAND_TAGLINE, BRAND_WORDMARK } from "@/lib/site";

// ─────────────────────────────────────────────────────────────
// Footer Angelo Mio.
//
// Minimalista pero con la navegación secundaria que pide el brief
// (Nosotros, Contacto, Envíos, Cambios, Preguntas frecuentes) más los
// canales de contacto reales.
//
// Instagram, Facebook y WhatsApp SOLO se muestran si están cargados en
// `store_settings`: no se hardcodea ningún link ni número. Si el admin
// todavía no los completó, esos accesos no aparecen en vez de llevar a
// una URL rota.
//
// Sin emojis en la interfaz: los pocos íconos son de lucide, a 1px.
// ─────────────────────────────────────────────────────────────

const helpLinks = [
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
  { href: "/envios", label: "Envíos" },
  { href: "/cambios", label: "Cambios" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
];

export default async function Footer() {
  const storeSettings = await getStoreSettingsOrDefault();
  const wordmark = storeSettings.storeName || BRAND_WORDMARK;
  const whatsappHref = storeSettings.whatsappNumber
    ? `https://wa.me/${storeSettings.whatsappNumber}`
    : null;

  return (
    <footer className="border-t border-warmgray-100 bg-cream">
      <div className="container-app py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div className="lg:col-span-2">
            <p className="brand-wordmark text-lg">{wordmark}</p>
            <p className="mt-3 text-sm text-warmgray-500">{BRAND_TAGLINE}</p>

            <div className="mt-8 space-y-2.5 text-sm text-warmgray-500">
              <p className="flex items-start gap-2.5">
                <MapPin size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                {BRAND_ADDRESS}
              </p>
              <p className="flex items-start gap-2.5">
                <Truck size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                Envíos a todo el país
              </p>
            </div>
          </div>

          {/* Ayuda */}
          <div>
            <p className="eyebrow mb-5">Ayuda</p>
            <ul className="space-y-3">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-quiet text-sm text-warmgray-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Redes */}
          <div>
            <p className="eyebrow mb-5">Seguinos</p>
            <ul className="space-y-3">
              {storeSettings.instagram && (
                <li>
                  <a
                    href={storeSettings.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-quiet inline-flex items-center gap-2 text-sm text-warmgray-600"
                  >
                    <Instagram size={15} strokeWidth={1.5} /> Instagram
                  </a>
                </li>
              )}
              {whatsappHref && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-quiet inline-flex items-center gap-2 text-sm text-warmgray-600"
                  >
                    <MessageCircle size={15} strokeWidth={1.5} /> WhatsApp
                  </a>
                </li>
              )}
              {storeSettings.facebook && (
                <li>
                  <a
                    href={storeSettings.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-quiet inline-flex items-center gap-2 text-sm text-warmgray-600"
                  >
                    <Facebook size={15} strokeWidth={1.5} /> Facebook
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-warmgray-100 pt-8">
          <p className="text-[10px] uppercase tracking-editorial text-warmgray-400">
            {wordmark} © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
