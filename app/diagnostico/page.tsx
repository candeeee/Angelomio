"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// PÁGINA TEMPORAL DE DIAGNÓSTICO — BORRAR CUANDO EL LOGIN ANDE.
//
// Sirve para responder una sola pregunta: ¿el navegador está recibiendo
// las variables de Supabase, y puede llegar al servidor?
//
// "Load failed" (Safari) o "Failed to fetch" (Chrome) NO son errores de
// Supabase: son del navegador diciendo que la petición nunca llegó a
// destino. Las causas posibles son pocas y esta página las separa.
//
// IMPORTANTE sobre cómo lee las variables:
// Next.js reemplaza `process.env.NEXT_PUBLIC_X` por su valor literal
// DURANTE EL BUILD, y sólo si está escrito como acceso estático
// completo. Por eso abajo aparecen escritas enteras y no con una
// variable intermedia: si se leyeran dinámicamente, saldría `undefined`
// aunque estén bien configuradas, y el diagnóstico mentiría.
// ─────────────────────────────────────────────────────────────

const RAW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const RAW_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type TestState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; detail: string }
  | { status: "fail"; detail: string };

function Row({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-warmgray-100 py-3">
      <span className="shrink-0 text-xs uppercase tracking-wider text-warmgray-500">{label}</span>
      <span
        className={`break-all text-right font-mono text-xs ${
          ok === null ? "text-warmgray-600" : ok ? "text-green-700" : "text-red-600"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function DiagnosticoPage() {
  const [test, setTest] = useState<TestState>({ status: "idle" });

  const url = (RAW_URL ?? "").trim();
  const key = (RAW_KEY ?? "").trim();

  // Cada comprobación aísla un error distinto.
  const urlPresent = url.length > 0;
  const keyPresent = key.length > 0;
  // Comillas o espacios pegados suelen venir de copiar mal el .env.local.
  const urlClean = urlPresent && url === RAW_URL && !/["']/.test(url);
  const usesHttps = url.startsWith("https://");
  // Un host que no termina en supabase.co suele ser la cadena de
  // conexión de Postgres o el pooler, no la URL de la API.
  let hostname = "";
  let urlParses = false;
  try {
    hostname = new URL(url).hostname;
    urlParses = true;
  } catch {
    urlParses = false;
  }
  const looksLikeApiUrl = urlParses && /\.supabase\.(co|in)$/.test(hostname);
  const isPlaceholder = hostname === "placeholder.supabase.co";

  async function runTest() {
    setTest({ status: "running" });
    if (!urlParses) {
      setTest({ status: "fail", detail: "La URL no es válida, no hay nada que probar." });
      return;
    }
    try {
      // /auth/v1/health es público y liviano. Si esto responde, la red y
      // el DNS están bien y el problema es de credenciales, no de
      // conexión.
      const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
        headers: key ? { apikey: key } : undefined,
      });
      const body = await res.text();
      setTest({
        status: res.ok ? "ok" : "fail",
        detail: `HTTP ${res.status} — ${body.slice(0, 200) || "(sin cuerpo)"}`,
      });
    } catch (err) {
      setTest({
        status: "fail",
        detail: `La petición no llegó a destino: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  }

  return (
    <div className="container-app py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="title-editorial">Diagnóstico de Supabase</h1>
        <p className="mt-3 text-sm text-warmgray-500">
          Página temporal. Borrá la carpeta <code>app/diagnostico/</code> cuando el login
          funcione.
        </p>

        <h2 className="mt-10 text-[11px] uppercase tracking-editorial">
          Lo que recibió el navegador
        </h2>
        <div className="mt-4">
          <Row
            label="URL definida"
            value={urlPresent ? "sí" : "NO — falta NEXT_PUBLIC_SUPABASE_URL"}
            ok={urlPresent}
          />
          <Row
            label="Clave definida"
            value={
              keyPresent
                ? `sí (${key.length} caracteres)`
                : "NO — falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
            }
            ok={keyPresent}
          />
          <Row label="Host" value={hostname || "(no se pudo interpretar la URL)"} ok={urlParses} />
          <Row label="Usa https" value={usesHttps ? "sí" : "no"} ok={usesHttps} />
          <Row
            label="Sin comillas ni espacios"
            value={urlClean ? "sí" : "NO — revisá el .env.local"}
            ok={urlClean}
          />
          <Row
            label="Parece URL de API"
            value={looksLikeApiUrl ? "sí" : "no — ¿copiaste la cadena de Postgres?"}
            ok={looksLikeApiUrl}
          />
          <Row
            label="Inicio de la clave"
            value={keyPresent ? `${key.slice(0, 12)}…` : "—"}
            ok={keyPresent ? null : false}
          />
        </div>

        {isPlaceholder && (
          <p className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            El navegador está usando <code>placeholder.supabase.co</code>. Eso significa que las
            variables NO llegaron al bundle. Casi siempre es una de dos cosas: el archivo no se
            llama exactamente <code>.env.local</code> y no está junto a{" "}
            <code>package.json</code>, o no reiniciaste <code>npm run dev</code> después de
            crearlo.
          </p>
        )}

        <h2 className="mt-10 text-[11px] uppercase tracking-editorial">Prueba de conexión</h2>
        <button onClick={runTest} className="btn-primary mt-4">
          {test.status === "running" ? "Probando…" : "Probar conexión"}
        </button>

        {test.status !== "idle" && test.status !== "running" && (
          <div
            className={`mt-4 border p-4 text-sm ${
              test.status === "ok"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p className="font-medium">
              {test.status === "ok" ? "Conexión correcta" : "Falló la conexión"}
            </p>
            <p className="mt-1 break-all font-mono text-xs">{test.detail}</p>
            {test.status === "ok" && (
              <p className="mt-3">
                El navegador llega a Supabase. Entonces el problema no es de red: revisá que la
                clave sea la de este mismo proyecto y que el email exista.
              </p>
            )}
            {test.status === "fail" && (
              <p className="mt-3">
                Si el mensaje dice “Load failed” o “Failed to fetch”, la petición ni siquiera
                salió. Las causas habituales son: proyecto de Supabase pausado (revisá el
                dashboard, botón <em>Restore</em>), un bloqueador de anuncios o extensión de
                privacidad, o un host mal escrito.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
