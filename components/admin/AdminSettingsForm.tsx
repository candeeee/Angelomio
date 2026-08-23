"use client";

import { useState, useTransition } from "react";
import { StoreSettings, PaymentMethod } from "@/lib/types";
import { upsertStoreSettingsAction } from "@/app/admin/configuracion/actions";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const paymentLabels: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago",
  efectivo: "Efectivo",
  otro: "Otro",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-6">
      <h2 className="mb-4 font-display text-base font-normal">{title}</h2>
      {children}
    </div>
  );
}

interface AdminSettingsFormProps {
  initialSettings: StoreSettings;
  settingsId?: string;
}

export default function AdminSettingsForm({ initialSettings, settingsId }: AdminSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function togglePayment(method: PaymentMethod) {
    setSettings((s) => ({
      ...s,
      paymentMethods: s.paymentMethods.includes(method)
        ? s.paymentMethods.filter((m) => m !== method)
        : [...s.paymentMethods, method],
    }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await upsertStoreSettingsAction({
        id: settingsId,
        storeName: settings.storeName,
        welcomeText: settings.welcomeText,
        whatsappNumber: settings.whatsappNumber,
        instagram: settings.instagram,
        paymentMethods: settings.paymentMethods,
        shipping: settings.shipping,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <>
      <Section title="Personalización de tienda">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Nombre de la tienda</label>
            <input
              value={settings.storeName}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              className="w-full rounded-lg border border-warmgray-300 px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Texto de bienvenida</label>
            <textarea
              value={settings.welcomeText}
              onChange={(e) => setSettings({ ...settings, welcomeText: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-warmgray-300 px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">WhatsApp (formato internacional)</label>
              <input
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full rounded-lg border border-warmgray-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Instagram</label>
              <input
                value={settings.instagram ?? ""}
                onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                className="w-full rounded-lg border border-warmgray-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Métodos de pago">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(paymentLabels) as PaymentMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => togglePayment(method)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                settings.paymentMethods.includes(method)
                  ? "border-ink bg-ink text-cream"
                  : "border-warmgray-300 hover:border-ink"
              )}
            >
              {paymentLabels[method]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Envíos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Costo de envío</label>
            <input
              type="number"
              value={settings.shipping.cost}
              onChange={(e) =>
                setSettings({ ...settings, shipping: { ...settings.shipping, cost: Number(e.target.value) } })
              }
              className="w-full rounded-lg border border-warmgray-300 px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Zonas (separadas por coma)</label>
            <input
              value={settings.shipping.zones.join(", ")}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  shipping: { ...settings.shipping, zones: e.target.value.split(",").map((z) => z.trim()) },
                })
              }
              className="w-full rounded-lg border border-warmgray-300 px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
        </div>
      </Section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Cambios guardados ✓</span>}
      </div>
    </>
  );
}
