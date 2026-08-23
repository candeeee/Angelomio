"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { BRAND_NAME } from "@/lib/site";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    // signUp SIEMPRE crea la cuenta con role='user' — lo define el trigger
    // de la base de datos, no el cliente. No existe forma de registrarse
    // como administrador desde este formulario.
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    // router.refresh() es necesario acá: la sesión se crea en el
    // cliente, y sin este refresh los Server Components (que leen la
    // cookie) seguirían viendo un visitante anónimo y /cuenta rebotaría
    // al login.
    router.push("/cuenta");
    router.refresh();
  }

  return (
    <div className="container-app flex min-h-[75vh] items-center justify-center py-14">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl">Crear cuenta</h1>
        <p className="mb-8 text-center text-sm text-warmgray-500">
          Sumate a {BRAND_NAME}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Nombre</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="field-label">Contraseña</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-warmgray-500">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-ink underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
