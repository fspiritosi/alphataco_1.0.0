'use client';

import { useEffect } from 'react';

/**
 * Lleva al título del `#ancla` de la URL cuando la guía termina de llegar.
 *
 * Next intenta hacer ese scroll al navegar, pero la guía se transmite dentro de un Suspense y el
 * título todavía no existe en ese momento: los enlaces de la búsqueda ("ir a la parte donde está")
 * abrían la guía arriba de todo. Sincronizar con la URL del navegador es un uso válido de efecto.
 */
export function ScrollToHash({ guideSlug }: { guideSlug: string }) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    // `instant`: al abrir la guía se aterriza en el título, sin animar el recorrido de toda la
    // guía (la app tiene `scroll-behavior: smooth` global).
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [guideSlug]);

  return null;
}
