import { Order } from "./types";
import { formatPrice } from "./utils";

/**
 * Genera el link de WhatsApp con el mensaje pre-armado del pedido.
 * El número sale de la configuración de la tienda (StoreSettings.whatsappNumber),
 * nunca hardcodeado en el componente.
 */
export function buildWhatsAppLink(order: Order, whatsappNumber: string) {
  const lines = [
    "Hola 😊",
    "Quiero realizar el siguiente pedido:",
    "",
    ...order.items.map(
      (item) =>
        `• ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""} x${item.quantity}`
    ),
    "",
    `Total: ${formatPrice(order.total)}`,
    "",
    `Número de pedido: ${order.number}`,
    `Cliente: ${order.customer.name}`,
    `Dirección: ${order.customer.address}`,
    order.customer.notes ? `Observaciones: ${order.customer.notes}` : "",
    "",
    "Muchas gracias.",
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${whatsappNumber}?text=${text}`;
}

// ─────────────────────────────────────────────────────────────
// A partir de acá: armado del mensaje de la página de Contacto.
// `buildWhatsAppLink()` (arriba) no se tocó — sigue siendo la del
// checkout, con su propio formato de pedido.
// ─────────────────────────────────────────────────────────────

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

/**
 * Genera el link de WhatsApp de una consulta desde /contacto.
 * El número, igual que en el checkout, sale de la configuración de la
 * tienda (StoreSettings.whatsappNumber) — nunca hardcodeado.
 */
export function buildContactWhatsAppLink(contact: ContactMessage, whatsappNumber: string) {
  const lines = [
    "Hola 😊",
    `Motivo: ${contact.subject}`,
    "",
    contact.message,
    "",
    `Nombre: ${contact.name}`,
    `Email: ${contact.email}`,
    contact.phone ? `Teléfono: ${contact.phone}` : "",
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${whatsappNumber}?text=${text}`;
}
