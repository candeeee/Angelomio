"use client";

import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// Bloqueo del scroll del body mientras hay una capa abierta
// (menú mobile, drawer del carrito, drawer de filtros).
//
// POR QUÉ UN HOOK Y NO `overflow: hidden` SUELTO EN CADA COMPONENTE:
//
// 1. Se pueden solapar dos capas (por ejemplo, abrir el carrito desde
//    el menú mobile). Si cada una escribiera y borrara
//    `document.body.style.overflow` por su cuenta, la primera en
//    cerrarse desbloquearía el scroll aunque la otra siguiera abierta.
//    Por eso se lleva un CONTADOR de bloqueos activos y sólo se
//    restaura el estilo cuando llega a cero.
//
// 2. En iOS, poner `overflow: hidden` en el body no alcanza: Safari
//    sigue permitiendo el "rubber band" y, peor, al restaurar el
//    scroll la página vuelve arriba de todo. Por eso se fija la
//    posición del body y se restaura el scrollY exacto al desbloquear.
//
// 3. Al fijar el body desaparece la barra de scroll en escritorio y
//    todo el layout se corre unos píxeles. Se compensa con un padding
//    del ancho real de la barra.
// ─────────────────────────────────────────────────────────────

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
  paddingRight: string;
} | null = null;

function lock() {
  lockCount += 1;
  if (lockCount > 1) return; // Ya estaba bloqueado por otra capa.

  const body = document.body;
  savedScrollY = window.scrollY;
  savedStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedStyles) return;

  const body = document.body;
  body.style.position = savedStyles.position;
  body.style.top = savedStyles.top;
  body.style.left = savedStyles.left;
  body.style.right = savedStyles.right;
  body.style.width = savedStyles.width;
  body.style.overflow = savedStyles.overflow;
  body.style.paddingRight = savedStyles.paddingRight;
  savedStyles = null;

  // `scrollTo` sin animación: el usuario tiene que volver exactamente
  // donde estaba, no ver la página desplazarse sola.
  window.scrollTo({ top: savedScrollY, behavior: "instant" as ScrollBehavior });
}

/**
 * Bloquea el scroll del body mientras `active` sea true.
 * El cleanup libera el bloqueo aunque el componente se desmonte con la
 * capa abierta (por ejemplo, si una navegación lo saca de pantalla).
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
