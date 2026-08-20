import { useEffect, useRef } from "react";
import { getDataStamp } from "./api";

/**
 * Avisa cuando los datos cambiaron detrás de esta pestaña: otra pestaña, el
 * Mac, o el teléfono a través del buzón. Y recarga la página sola cuando el
 * front cambió de build.
 *
 * Vivía suelto dentro de CashFlowPage, que era la única sección enterada: el
 * plan alimentario y las deudas se quedaban con lo que hubieran leído al
 * abrirse, así que randomizar la semana desde el teléfono dejaba la web
 * mostrando la anterior sin señal de nada.
 */
export function useDataChanges(onChanged: () => void): void {
  // Por referencia: el callback cambia en cada render y no debe reiniciar el
  // sondeo ni perder el sello ya visto.
  const latest = useRef(onChanged);
  latest.current = onChanged;

  useEffect(() => {
    let alive = true;
    let last: { data: string; app: string } | null = null;

    const tick = async () => {
      if (document.hidden) return;
      // Escribiendo no se interrumpe: recargar bajo los dedos pierde el texto.
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return;
      }
      const stamp = await getDataStamp();
      if (!alive || stamp === null) return;
      if (last !== null && stamp.app !== last.app) {
        // Llegó un build nuevo del front: la pestaña se renueva sola.
        window.location.reload();
        return;
      }
      if (last !== null && stamp.data !== last.data) latest.current();
      last = stamp;
    };

    const interval = window.setInterval(() => void tick(), 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
}
