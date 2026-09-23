/**
 * Layout y primitivas compartidas de los correos HTML.
 *
 * Portado de las dos edge functions de Deno (`send-deviations-email` y
 * `send-documents-expiry-email`), que repetían el mismo encabezado, barra de título, cuerpo y
 * pie en ~150 líneas cada una. Se conserva el diseño (tablas anidadas, estilos inline: es lo
 * que renderizan los clientes de correo), con tres cambios deliberados:
 *
 * 1. **Sin logo remoto.** Las edge functions embebían
 *    `https://vvrckjjyrwqzpbaatemz.supabase.co/storage/v1/object/public/logo/...`, que murió
 *    con Supabase. El logo de cada empresa hoy vive en MinIO, que no se publica en internet y
 *    sólo se sirve por `/api/files` contra una sesión — un cliente de correo no puede
 *    autenticarse ahí. Una imagen rota en todos los correos es peor que ninguna, así que el
 *    encabezado es tipográfico.
 * 2. **Nombre de la empresa en el encabezado.** Los jobs corren para todas las empresas y
 *    mandan un correo por empresa; que el destinatario vea de quién son los datos es la
 *    señal más barata de que no se mezclaron.
 * 3. **Todo lo que viene de la base se escapa.** Las edge functions interpolaban nombres de
 *    cliente, de empleado y descripciones libres directamente en el HTML.
 */

/** Escapa un valor para interpolarlo en el cuerpo de un tag HTML o en un atributo entre comillas. */
export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Base pública de la app, para los enlaces de los correos. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Píldora de color usada en todas las tablas de los correos. */
export function badge(label: string, bg: string, fg: string): string {
  return `<span style="display:inline-block;background:${bg};color:${fg};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;line-height:1.4;">${escapeHtml(label)}</span>`;
}

export function tableHeaderRow(headers: readonly string[]): string {
  return `<tr style="background:#f1f5f9;">${headers
    .map(
      (header) =>
        `<th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">${escapeHtml(header)}</th>`
    )
    .join('')}</tr>`;
}

/** Encabezado oscuro de un grupo (una empresa, un cliente, un tipo de recurso). */
export function groupCardOpen(title: string, countLabel: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="background:#1e293b;padding:12px 18px;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">${escapeHtml(countLabel)}</p>
        </td>
      </tr>`;
}

export const groupCardClose = '</table>';

export function sectionHeader(title: string, subtitle: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">${escapeHtml(title)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${escapeHtml(subtitle)}</p>
        </td>
      </tr>
    </table>`;
}

/** Botón principal + el enlace en texto, para los clientes que no renderizan el botón. */
export function ctaBlock(url: string, label: string): string {
  const safeUrl = escapeHtml(url);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center" style="padding:16px 0 4px;">
          <a href="${safeUrl}" target="_blank" style="display:inline-block;background:#ff9800;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">${escapeHtml(label)}</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:4px 0 0;">
          <a href="${safeUrl}" target="_blank" style="font-size:11px;color:#94a3b8;text-decoration:underline;">${safeUrl}</a>
        </td>
      </tr>
    </table>`;
}

export interface EmailShellOptions {
  /** Empresa dueña de los datos. Va en el encabezado. */
  companyName: string;
  /** Título de la barra naranja. */
  title: string;
  /** Bajada de la barra naranja (normalmente la fecha). */
  subtitle: string;
  /** Píldora a la derecha de la barra naranja (ya renderizada). */
  badgeHtml?: string;
  /** Cuerpo, ya renderizado. */
  body: string;
}

/** Documento HTML completo de un correo del sistema. */
export function renderEmailShell(options: EmailShellOptions): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="780" cellpadding="0" cellspacing="0" style="max-width:780px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${escapeHtml(options.companyName)}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#94a3b8;font-weight:400;">Sistema de Gesti&oacute;n</p>
            </td>
          </tr>

          <tr>
            <td style="background:#ff9800;padding:16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${escapeHtml(options.title)}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);text-transform:capitalize;">${escapeHtml(options.subtitle)}</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">${options.badgeHtml ?? ''}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;padding:28px 32px;">${options.body}</td>
          </tr>

          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Este es un correo autom&aacute;tico generado por el sistema de gesti&oacute;n.</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">${escapeHtml(options.companyName)} &mdash; Por favor no responda a este correo.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Layout simple (un párrafo y un botón) para los correos transaccionales de auth. */
export function renderActionEmail(title: string, body: string, action: { url: string; label: string }): string {
  const safeUrl = escapeHtml(action.url);
  return `<!doctype html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5">
  <h2 style="color:#111827">${escapeHtml(title)}</h2>
  <p>${escapeHtml(body)}</p>
  <p><a href="${safeUrl}" style="display:inline-block;padding:10px 18px;background:#ea580c;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(action.label)}</a></p>
  <p style="font-size:12px;color:#6b7280">Si el bot&oacute;n no funciona, copi&aacute; este enlace en tu navegador:<br>${safeUrl}</p>
</body></html>`;
}
