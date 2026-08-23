"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { buildContactWhatsAppLink, type ContactMessage } from "@/lib/whatsapp";

interface ContactFormProps {
  whatsappNumber: string;
  email: string;
}

const SUBJECTS = [
  "Consulta sobre producto",
  "Estado de pedido",
  "Cambios/devoluciones",
  "Otro",
] as const;

// ─────────────────────────────────────────────────────────────
// Formulario de contacto.
//
// NO crea pedidos ni escribe en Supabase: es un armador de mensajes.
// Los dos botones toman los mismos campos y abren el canal elegido —
// `mailto:` con asunto y cuerpo prellenados, o WhatsApp con el mensaje
// ya escrito. Por eso no hizo falta ninguna tabla nueva, ni una Server
// Action, ni un servicio de mails: nada que mantener ni que asegurar.
//
// El armado del texto de WhatsApp vive en `lib/whatsapp.ts`, al lado
// del que ya se usaba para los pedidos, para no tener dos lugares
// distintos donde se construyen mensajes de WhatsApp.
// ─────────────────────────────────────────────────────────────
export default function ContactForm({ whatsappNumber, email }: ContactFormProps) {
  const [form, setForm] = useState<ContactMessage>({
    name: "",
    email: "",
    phone: "",
    subject: SUBJECTS[0],
    message: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ContactMessage>(key: K, value: ContactMessage[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  }

  /** Campos mínimos para que la consulta sirva de algo del otro lado. */
  function validate(): boolean {
    if (!form.name.trim()) {
      setError("Escribí tu nombre para que sepamos con quién hablamos.");
      return false;
    }
    if (!form.email.trim()) {
      setError("Necesitamos un email para poder responderte.");
      return false;
    }
    if (!form.message.trim()) {
      setError("Contanos tu consulta en el mensaje.");
      return false;
    }
    return true;
  }

  function handleWhatsApp() {
    if (!validate()) return;
    window.open(buildContactWhatsAppLink(form, whatsappNumber), "_blank", "noopener");
  }

  function handleEmail() {
    if (!validate()) return;

    const body = [
      `Nombre: ${form.name}`,
      `Email: ${form.email}`,
      form.phone ? `Teléfono: ${form.phone}` : "",
      `Motivo: ${form.subject}`,
      "",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");

    const href = `mailto:${email}?subject=${encodeURIComponent(
      `[Contacto] ${form.subject}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="contacto-nombre">
            Nombre
          </label>
          <input
            id="contacto-nombre"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="contacto-email">
            Email
          </label>
          <input
            id="contacto-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="contacto-telefono">
            Teléfono (opcional)
          </label>
          <input
            id="contacto-telefono"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="contacto-motivo">
            Motivo de consulta
          </label>
          <select
            id="contacto-motivo"
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            className="field"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="contacto-mensaje">
          Mensaje
        </label>
        <textarea
          id="contacto-mensaje"
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="field resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button type="button" onClick={handleWhatsApp} className="btn-primary flex-1">
          <MessageCircle size={15} strokeWidth={1.5} /> Enviar por WhatsApp
        </button>
        <button type="button" onClick={handleEmail} className="btn-secondary flex-1">
          <Mail size={15} strokeWidth={1.5} /> Enviar por email
        </button>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-warmgray-500">
        Al elegir un canal se abre WhatsApp o tu aplicación de correo con el mensaje ya escrito.
      </p>
    </div>
  );
}
