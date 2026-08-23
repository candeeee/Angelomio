import { getStoreSettings } from "@/lib/services/store-settings";
import { getAdminProfiles } from "@/lib/services/profiles";
import { Role } from "@/lib/types";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";

const rolePermissions: Record<Role, string> = {
  admin: "Acceso total al panel: productos, pedidos, clientes y configuración.",
  user: "Cliente de la tienda, sin acceso al panel de administración.",
};

// Server Component. `store_settings` y "Administradores" (profiles) ya
// son 100% Supabase — no queda ninguna dependencia de mock-data.ts acá.
export default async function AdminSettingsPage() {
  const [settingsRow, admins] = await Promise.all([getStoreSettings(), getAdminProfiles()]);

  const initialSettings = settingsRow ?? {
    storeName: "",
    logoUrl: "",
    bannerUrl: "",
    welcomeText: "",
    whatsappNumber: "",
    primaryColor: "#111110",
    paymentMethods: [],
    shipping: { cost: 0, zones: [], info: "" },
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="title-editorial">Configuración</h1>
        <p className="text-sm text-warmgray-500">
          Personalización de la tienda, pagos, envíos y administradores.
        </p>
      </div>

      <AdminSettingsForm initialSettings={initialSettings} settingsId={settingsRow?.id} />

      <div className="card-surface p-6">
        <h2 className="mb-4 font-display text-base font-normal">Administradores y permisos</h2>
        {admins.length === 0 ? (
          <p className="text-sm text-warmgray-500">
            No se encontraron administradores (o no tenés permisos para verlos).
          </p>
        ) : (
          <ul className="divide-y divide-warmgray-100">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{admin.full_name || admin.email}</p>
                  <p className="text-xs text-warmgray-500">{admin.email}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-warmgray-100 px-2.5 py-1 text-xs font-medium capitalize">
                    {admin.role}
                  </span>
                  <p className="mt-1 max-w-[220px] text-[11px] text-warmgray-500">
                    {rolePermissions[admin.role]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
