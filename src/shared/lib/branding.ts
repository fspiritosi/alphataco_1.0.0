/**
 * Assets de marca servidos desde `public/`.
 *
 * Antes estas imágenes se cargaban desde el Storage de dos proyectos Supabase de Grupo
 * Horizonte que este producto no controla: al apagarlos, las pantallas de login y los PDF
 * quedaban con un 404. Son assets propios del repo, no archivos de una empresa, así que no
 * pasan por el storage ni por el perímetro: van en el bundle.
 *
 * Único punto a tocar cuando se rehaga el branding.
 */

/** Logo para pantallas (login, registro, recupero de contraseña). */
export const BRAND_LOGO = '/gh_logo.png';

/** Logo para los PDF: fondo blanco y sin transparencia. Sólo se usa como respaldo cuando la empresa no cargó el suyo. */
export const BRAND_LOGO_PDF = '/gh_logo-pdf.jpg';
