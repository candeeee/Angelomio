"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/layout/AdminSidebar";
import BrandLoader from "@/components/ui/BrandLoader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isAdmin, profile } = useAuth();
  const router = useRouter();

  // El middleware ya bloquea el acceso a nivel de servidor (ver middleware.ts).
  // Este efecto es una segunda capa de defensa en el cliente: si por algún
  // motivo el usuario llega a renderizar este layout sin permisos (ej. su
  // rol cambió durante la sesión), lo sacamos igual.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login?redirect=/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  if (loading || !isAuthenticated || !isAdmin) {
    // Mientras se resuelve la sesión mostramos la misma pantalla de
    // marca que el resto de las esperas, en vez de un spinner suelto.
    return <BrandLoader message="Verificando tu sesión..." />;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar />
      <div className="flex-1 bg-beige-50">
        <div className="border-b border-warmgray-100 bg-white px-6 py-4">
          <p className="text-[10px] uppercase tracking-editorial text-warmgray-500">
            {profile?.full_name || profile?.email} · {profile?.role}
          </p>
        </div>
        <div className="p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
