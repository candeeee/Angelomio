// ─────────────────────────────────────────────────────────────
// Aparición progresiva de una sección.
//
// POR QUÉ ES CSS Y NO FRAMER MOTION (cambio importante):
//
// La versión anterior usaba `motion.div` con `whileInView` e
// `initial={{ opacity: 0 }}`. Eso significa que el contenido arranca
// INVISIBLE y sólo se vuelve visible cuando JavaScript, ya hidratado,
// recibe el callback del IntersectionObserver.
//
// Es un punto único de falla: si la hidratación se demora, si un error
// de JS corta el árbol antes de ese componente, o si el observer no
// dispara con el `rootMargin` negativo que teníamos en pantallas
// chicas, la sección queda en `opacity: 0` PARA SIEMPRE. El síntoma es
// exactamente el reportado: "la sección de categorías debajo del hero
// no aparece en mobile", con el HTML presente en el DOM.
//
// Con una animación CSS el contenido se muestra sí o sí: la animación
// corre sola al pintar, sin JavaScript, sin observer y sin hidratación.
// Y la regla de `prefers-reduced-motion` de globals.css la reduce a
// 0.01ms, así que quien pidió menos movimiento ve el contenido al
// instante en vez de no verlo.
//
// Beneficio secundario: al no depender de framer-motion, este
// componente y todos los que lo usan pueden seguir siendo Server
// Components. Es JavaScript que deja de viajar al navegador.
// ─────────────────────────────────────────────────────────────

interface RevealProps {
  children: React.ReactNode;
  /** Retardo en segundos, para escalonar elementos de una grilla. */
  delay?: number;
  className?: string;
}

export default function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <div
      className={`animate-fadeUp${className ? ` ${className}` : ""}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
