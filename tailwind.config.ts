import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────────────────────
// SISTEMA VISUAL — ANGELO MIO
//
// Se conservan TODAS las claves de color que ya existían
// (cream, beige, earth, warmgray, ink) y solo cambian sus valores.
// Eso es deliberado: hay cientos de clases escritas a mano en los
// componentes (`bg-beige-100`, `text-warmgray-500`, `border-warmgray-200`)
// y renombrar la escala rompería silenciosamente el diseño en lugares
// que no se están tocando. Cambiando solo los valores, todo el sitio se
// mueve al mismo tiempo y no puede quedar una clase inexistente.
//
// Dirección Angelo Mio: blanco de papel, negro casi puro, grises
// piedra fríos y un beige apenas perceptible. Sin colores saturados:
// el color lo aporta la ropa en las fotografías.
// ─────────────────────────────────────────────────────────────

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFFFFF", // fondo general — blanco puro, estética editorial
        beige: {
          50: "#FAF9F7", // beige muy claro — bandas de sección
          100: "#F3F2EF", // fondo de imagen mientras carga
          200: "#E9E7E2",
          300: "#D8D5CE",
          400: "#C2BEB5",
        },
        earth: {
          400: "#A9A49A", // tierra muy sutil
          500: "#79746B",
          600: "#3A3835", // hover de botón primario (gris muy oscuro)
        },
        warmgray: {
          100: "#EFEEEC", // hairlines
          200: "#E2E0DC",
          300: "#CECBC5",
          400: "#A5A29C",
          500: "#7E7B76", // gris piedra — texto secundario
          600: "#5A5854",
          700: "#3C3A37",
        },
        ink: "#111110", // negro casi puro — texto y botones
      },
      fontFamily: {
        // Las variables las define next/font en app/layout.tsx.
        // Tipografía 100% sans serif (requisito de marca): DM Sans para
        // titulares, Inter para interfaz y textos largos.
        //
        // `serif` se mantiene como ALIAS del display sans a propósito:
        // el código heredado usa `font-serif` en decenas de titulares y
        // quitar la clave dejaría esos textos sin fuente asignada. Ahora
        // `font-serif` y `font-display` rinden exactamente lo mismo.
        display: ["var(--font-display)", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["var(--font-display)", "Helvetica Neue", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        editorial: "0.18em",
        // Tracking amplio para el logotipo y los titulares grandes.
        brand: "0.28em",
      },
      borderRadius: {
        // Editorial = esquinas rectas. Solo un radio mínimo para que los
        // bordes de 1px no se vean cortados.
        xl2: "0.125rem",
      },
      boxShadow: {
        soft: "0 30px 80px -40px rgba(17,17,16,0.30)",
        card: "0 1px 2px rgba(17,17,16,0.04)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp .6s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
