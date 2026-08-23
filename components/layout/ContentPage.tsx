import { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Envoltorio de las páginas de contenido (Nosotros, Envíos, Cambios,
// Preguntas frecuentes).
//
// Existe para que las cuatro compartan exactamente el mismo ritmo
// tipográfico y el mismo ancho de lectura en vez de repetir el bloque
// de clases en cada archivo y que se vayan separando con el tiempo.
// ─────────────────────────────────────────────────────────────

interface ContentPageProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function ContentPage({ eyebrow, title, intro, children }: ContentPageProps) {
  return (
    <div className="container-app py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-warmgray-100 pb-10">
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h1 className="title-editorial">{title}</h1>
          {intro && (
            <p className="mt-6 text-base leading-relaxed text-warmgray-600">{intro}</p>
          )}
        </header>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-warmgray-600">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Bloque con subtítulo, para no repetir la jerarquía en cada página. */
export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[11px] uppercase tracking-editorial text-ink">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
