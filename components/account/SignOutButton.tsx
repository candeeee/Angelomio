"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// El cierre de sesión vive en el contexto de auth (única fuente de
// verdad, no se duplica la lógica): este botón solo lo invoca. Existe
// como componente aparte porque `/cuenta` es un Server Component y
// necesita una isla de cliente para poder ejecutarlo.
export default function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center gap-2 border-b border-ink/20 pb-1 text-[11px] uppercase tracking-editorial text-warmgray-600 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
    >
      <LogOut size={14} strokeWidth={1.5} />
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
