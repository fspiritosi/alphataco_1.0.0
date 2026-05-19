import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INTERFACES (match RPC output)
// ============================================================================

interface EmployeeExpiringItem {
  id: string;
  employee_id: string;
  document_type_id: string;
  file_number: string;
  employee_name: string;
  document_type_name: string;
  validity: string;
  days_remaining: number;
}

interface EquipmentExpiringItem {
  id: string;
  vehicle_id: string;
  document_type_id: string;
  domain: string;
  intern_number: string;
  document_type_name: string;
  validity: string;
  days_remaining: number;
}

interface CompanyExpiringItem {
  id: string;
  document_type_id: string;
  document_type_name: string;
  validity: string;
  validity_raw: string;
  days_remaining: number;
}

interface ExpirySummaryResult {
  generated_at: string;
  today: string;
  window_end: string;
  days_ahead: number;
  detail_limit: number;
  expiring_soon: {
    employees: { total: number; detail: EmployeeExpiringItem[] };
    equipment: { total: number; detail: EquipmentExpiringItem[] };
    company: { total: number; detail: CompanyExpiringItem[] };
  };
  expired_counts: { employees: number; equipment: number; company: number };
  expired_doc_type_ids: { employees: string[]; equipment: string[]; company: string[] };
  pending_counts: { employees: number; equipment: number; company: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const APP_URL = Deno.env.get('APP_URL') || 'https://gh-gestion.com';
const LOGO_URL = 'https://vvrckjjyrwqzpbaatemz.supabase.co/storage/v1/object/public/logo/30709694363.png';

// Table IDs y subtabs de las tablas permanentes en /dashboard/document
const TAB_EMP = 'documentos-de-empleados';
const TAB_EQ = 'documentos-de-equipos';
const TAB_CO = 'documentos-de-empresa';
const SUBTAB_EMP = 'empleados-permanentes';
const SUBTAB_EQ = 'equipos-permanentes';
const SUBTAB_CO = 'empresa-permanentes';
const TABLE_ID_EMP = 'employee-permanent-docs';
const TABLE_ID_EQ = 'equipment-permanent-docs';
const TABLE_ID_CO = 'company-docs-permanentes';

// Las tablas de empresa usan 'documentType' (camelCase). Las de emp/eq usan 'document_type'.
const COL_DT_EMP = 'document_type';
const COL_DT_EQ = 'document_type';
const COL_DT_CO = 'documentType';

// Voiding unused var warning in some builds
void COL_DT_EQ;

// ============================================================================
// HELPERS — formatters
// ============================================================================

function formatDateAr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function formatLongDateAr(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// HELPERS — visual primitives
// ============================================================================

function expiryChip(daysRemaining: number): string {
  let bg: string;
  let fg: string;
  let label: string;

  if (daysRemaining < 0) {
    bg = '#fef2f2';
    fg = '#b91c1c';
    label = `vencido hace ${Math.abs(daysRemaining)}d`;
  } else if (daysRemaining === 0) {
    bg = '#fee2e2';
    fg = '#991b1b';
    label = 'hoy';
  } else if (daysRemaining === 1) {
    bg = '#fee2e2';
    fg = '#991b1b';
    label = 'mañana';
  } else if (daysRemaining <= 3) {
    bg = '#ffedd5';
    fg = '#c2410c';
    label = `en ${daysRemaining} días`;
  } else {
    bg = '#fef3c7';
    fg = '#a16207';
    label = `en ${daysRemaining} días`;
  }

  return `<span style="display:inline-block;background:${bg};color:${fg};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;line-height:1.4;margin-left:6px;">${label}</span>`;
}

// ============================================================================
// HELPERS — URLs filtradas a la app
// ============================================================================

function buildDocUrl(tab: string, subtab: string, extraParams: Record<string, string>): string {
  const qs = new URLSearchParams({ tab, subtab, ...extraParams });
  return `${APP_URL}/dashboard/document?${qs.toString()}`;
}

function urlExpiringTable(
  tab: string,
  subtab: string,
  tableId: string,
  fromIso: string,
  toIso: string
): string {
  return buildDocUrl(tab, subtab, {
    [`${tableId}__validity_from`]: fromIso,
    [`${tableId}__validity_to`]: toIso,
  });
}

function urlExpiredTable(tab: string, subtab: string, tableId: string, todayIso: string): string {
  return buildDocUrl(tab, subtab, { [`${tableId}__validity_to`]: todayIso });
}

function urlPendingTable(tab: string, subtab: string, tableId: string): string {
  return buildDocUrl(tab, subtab, { [`${tableId}__state`]: 'pendiente' });
}

function urlEmployeeDetailDocs(employeeId: string, documentTypeId: string): string {
  const qs = new URLSearchParams({
    action: 'view',
    employee_id: employeeId,
    tab: 'documents',
    [`${TABLE_ID_EMP}__${COL_DT_EMP}`]: documentTypeId,
  });
  return `${APP_URL}/dashboard/employee/action?${qs.toString()}`;
}

function urlEquipmentDetailDocs(vehicleId: string, documentTypeId: string): string {
  const qs = new URLSearchParams({
    action: 'view',
    id: vehicleId,
    tab: 'documents',
    [`${TABLE_ID_EQ}__${COL_DT_EQ}`]: documentTypeId,
  });
  return `${APP_URL}/dashboard/equipment/action?${qs.toString()}`;
}

function urlCompanyDocFiltered(documentTypeIds: string[]): string {
  if (documentTypeIds.length === 0) {
    return buildDocUrl(TAB_CO, SUBTAB_CO, {});
  }
  return buildDocUrl(TAB_CO, SUBTAB_CO, {
    [`${TABLE_ID_CO}__${COL_DT_CO}`]: documentTypeIds.join(','),
  });
}

function urlDashboardRoot(): string {
  return `${APP_URL}/dashboard/document`;
}

// ============================================================================
// TEMPLATE — summary card con mini-CTAs distribuidos por recurso
// ============================================================================

interface SummaryCTA {
  label: string; // "Empleados (5)"
  href: string | null; // null = sin link (no se renderiza)
}

function summaryCardDistributed(opts: {
  value: number;
  label: string;
  color: string;
  ctas: SummaryCTA[];
  fallbackText: string; // si todos los ctas son null
}): string {
  const visibleCtas = opts.ctas.filter((c) => c.href !== null);
  let ctaBlock = '';

  if (visibleCtas.length === 0) {
    ctaBlock = `<p style="margin:8px 0 0;font-size:11px;font-weight:500;color:${opts.color};line-height:1.4;">${opts.fallbackText}</p>`;
  } else {
    ctaBlock = visibleCtas
      .map(
        (c) =>
          `<a href="${c.href}" style="display:block;margin-top:6px;font-size:11px;font-weight:600;color:${opts.color};text-decoration:underline;line-height:1.3;">${c.label} &rsaquo;</a>`
      )
      .join('');
  }

  return `
    <td align="center" valign="top" style="padding:0 4px;width:33.33%;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
        <tr>
          <td style="padding:14px 10px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:800;color:${opts.color};line-height:1;">${opts.value.toLocaleString('es-AR')}</p>
            <p style="margin:6px 0 0;font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">${opts.label}</p>
            ${ctaBlock}
          </td>
        </tr>
      </table>
    </td>
  `;
}

function sectionHeader(title: string, subtitle: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">${title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${subtitle}</p>
        </td>
      </tr>
    </table>
  `;
}

function groupCardOpen(title: string, countLabel: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="background:#1e293b;padding:12px 18px;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">${title}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">${countLabel}</p>
        </td>
      </tr>
  `;
}

const groupCardClose = `</table>`;

function tableHeaderRow(headers: string[]): string {
  return `
    <tr style="background:#f1f5f9;">
      ${headers
        .map(
          (h) =>
            `<th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">${h}</th>`
        )
        .join('')}
    </tr>
  `;
}

// ============================================================================
// TEMPLATE — secciones por entidad (sin truncate, todos los docs)
// ============================================================================

function employeesGroup(group: { total: number; detail: EmployeeExpiringItem[] }): string {
  if (group.total === 0) return '';
  let html = groupCardOpen(
    `Empleados &middot; ${group.total} documento${group.total !== 1 ? 's' : ''}`,
    'por vencer en los próximos 7 días'
  );

  html += `
    <tr><td style="padding:14px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead>${tableHeaderRow(['Legajo', 'Empleado', 'Documento', 'Vence'])}</thead>
        <tbody>
  `;

  group.detail.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
    const detailUrl = urlEmployeeDetailDocs(item.employee_id, item.document_type_id);
    html += `
      <tr style="background:${bg};">
        <td style="padding:7px 10px;font-size:12px;color:#475569;font-family:monospace;border-bottom:1px solid #f1f5f9;">[${item.file_number}]</td>
        <td style="padding:7px 10px;font-size:12px;border-bottom:1px solid #f1f5f9;"><a href="${detailUrl}" style="color:#1e293b;font-weight:500;text-decoration:underline;">${item.employee_name}</a></td>
        <td style="padding:7px 10px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;">${item.document_type_name}</td>
        <td style="padding:7px 10px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${formatDateAr(item.validity)}${expiryChip(item.days_remaining)}</td>
      </tr>
    `;
  });

  html += `</tbody></table></td></tr>${groupCardClose}`;
  return html;
}

function equipmentGroup(group: { total: number; detail: EquipmentExpiringItem[] }): string {
  if (group.total === 0) return '';
  let html = groupCardOpen(
    `Equipos &middot; ${group.total} documento${group.total !== 1 ? 's' : ''}`,
    'por vencer en los próximos 7 días'
  );

  html += `
    <tr><td style="padding:14px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead>${tableHeaderRow(['Dominio', 'Nº Int.', 'Documento', 'Vence'])}</thead>
        <tbody>
  `;

  group.detail.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
    const detailUrl = urlEquipmentDetailDocs(item.vehicle_id, item.document_type_id);
    html += `
      <tr style="background:${bg};">
        <td style="padding:7px 10px;font-size:12px;font-weight:500;font-family:monospace;border-bottom:1px solid #f1f5f9;"><a href="${detailUrl}" style="color:#1e293b;text-decoration:underline;">${item.domain}</a></td>
        <td style="padding:7px 10px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;">#${item.intern_number}</td>
        <td style="padding:7px 10px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;">${item.document_type_name}</td>
        <td style="padding:7px 10px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${formatDateAr(item.validity)}${expiryChip(item.days_remaining)}</td>
      </tr>
    `;
  });

  html += `</tbody></table></td></tr>${groupCardClose}`;
  return html;
}

function companyGroup(group: { total: number; detail: CompanyExpiringItem[] }): string {
  if (group.total === 0) return '';
  let html = groupCardOpen(
    `Empresa &middot; ${group.total} documento${group.total !== 1 ? 's' : ''}`,
    'por vencer en los próximos 7 días'
  );

  html += `
    <tr><td style="padding:14px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead>${tableHeaderRow(['Documento', 'Vence'])}</thead>
        <tbody>
  `;

  group.detail.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
    const filterUrl = urlCompanyDocFiltered([item.document_type_id]);
    html += `
      <tr style="background:${bg};">
        <td style="padding:7px 10px;font-size:12px;font-weight:500;border-bottom:1px solid #f1f5f9;"><a href="${filterUrl}" style="color:#1e293b;text-decoration:underline;">${item.document_type_name}</a></td>
        <td style="padding:7px 10px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${formatDateAr(item.validity)}${expiryChip(item.days_remaining)}</td>
      </tr>
    `;
  });

  html += `</tbody></table></td></tr>${groupCardClose}`;
  return html;
}

// ============================================================================
// TEMPLATE — hero "todo al día"
// ============================================================================

function heroAllClear(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:32px 0 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
            <tr>
              <td style="padding:32px 28px;text-align:center;">
                <div style="font-size:56px;line-height:1;color:#15803d;margin-bottom:8px;">&#10003;</div>
                <p style="margin:0;font-size:18px;font-weight:700;color:#15803d;">Todo al d&iacute;a</p>
                <p style="margin:8px 0 0;font-size:13px;color:#166534;line-height:1.5;">
                  No hay documentos vencidos, por vencer ni pendientes esta semana.<br>
                  Buen trabajo del equipo de control documental.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

// ============================================================================
// MAIN TEMPLATE
// ============================================================================

function formatDocumentsExpiryEmail(data: ExpirySummaryResult): string {
  const fromIso = data.today;
  const toIso = data.window_end;

  const exp = data.expiring_soon;
  const totalExpiringSoon = exp.employees.total + exp.equipment.total + exp.company.total;
  const totalExpired = data.expired_counts.employees + data.expired_counts.equipment + data.expired_counts.company;
  const totalPending = data.pending_counts.employees + data.pending_counts.equipment + data.pending_counts.company;
  const isAllClear = totalExpiringSoon === 0 && totalExpired === 0 && totalPending === 0;

  const titleBadge = isAllClear
    ? `<span style="background:#10b981;color:#ffffff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">Todo al d&iacute;a</span>`
    : `<span style="background:rgba(255,255,255,0.2);color:#ffffff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">${totalExpiringSoon} por vencer</span>`;

  // CTAs distribuidos por recurso para card "Vencidos"
  const expiredCtas: SummaryCTA[] = [
    {
      label: `Empleados (${data.expired_counts.employees})`,
      href: data.expired_counts.employees > 0 ? urlExpiredTable(TAB_EMP, SUBTAB_EMP, TABLE_ID_EMP, fromIso) : null,
    },
    {
      label: `Equipos (${data.expired_counts.equipment})`,
      href: data.expired_counts.equipment > 0 ? urlExpiredTable(TAB_EQ, SUBTAB_EQ, TABLE_ID_EQ, fromIso) : null,
    },
    {
      // Empresa: validity es String? sin filtro dateRange. Usamos documentType con IDs distintos.
      label: `Empresa (${data.expired_counts.company})`,
      href:
        data.expired_counts.company > 0
          ? urlCompanyDocFiltered(data.expired_doc_type_ids?.company ?? [])
          : null,
    },
  ];

  const pendingCtas: SummaryCTA[] = [
    {
      label: `Empleados (${data.pending_counts.employees})`,
      href: data.pending_counts.employees > 0 ? urlPendingTable(TAB_EMP, SUBTAB_EMP, TABLE_ID_EMP) : null,
    },
    {
      label: `Equipos (${data.pending_counts.equipment})`,
      href: data.pending_counts.equipment > 0 ? urlPendingTable(TAB_EQ, SUBTAB_EQ, TABLE_ID_EQ) : null,
    },
    {
      label: `Empresa (${data.pending_counts.company})`,
      href: data.pending_counts.company > 0 ? urlPendingTable(TAB_CO, SUBTAB_CO, TABLE_ID_CO) : null,
    },
  ];

  const expiringCtas: SummaryCTA[] = [
    {
      label: `Empleados (${exp.employees.total})`,
      href: exp.employees.total > 0 ? urlExpiringTable(TAB_EMP, SUBTAB_EMP, TABLE_ID_EMP, fromIso, toIso) : null,
    },
    {
      label: `Equipos (${exp.equipment.total})`,
      href: exp.equipment.total > 0 ? urlExpiringTable(TAB_EQ, SUBTAB_EQ, TABLE_ID_EQ, fromIso, toIso) : null,
    },
    {
      // Empresa: validity es String? sin filtro dateRange. Filtramos por documentType
      // con los IDs distintos de los docs por vencer (extraídos del detail).
      label: `Empresa (${exp.company.total})`,
      href:
        exp.company.total > 0
          ? urlCompanyDocFiltered(
              Array.from(new Set(exp.company.detail.map((d) => d.document_type_id)))
            )
          : null,
    },
  ];

  let bodyInner = '';

  if (isAllClear) {
    bodyInner = heroAllClear();
  } else {
    bodyInner += `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          ${summaryCardDistributed({
            value: totalExpiringSoon,
            label: 'Por vencer en 7 días',
            color: '#ea580c',
            ctas: expiringCtas,
            fallbackText: 'Sin documentos',
          })}
          ${summaryCardDistributed({
            value: totalExpired,
            label: 'Vencidos',
            color: '#b91c1c',
            ctas: expiredCtas,
            fallbackText: 'Sin documentos',
          })}
          ${summaryCardDistributed({
            value: totalPending,
            label: 'Pendientes de carga',
            color: '#a16207',
            ctas: pendingCtas,
            fallbackText: 'Sin documentos',
          })}
        </tr>
      </table>
    `;

    if (totalExpiringSoon > 0) {
      bodyInner += sectionHeader(
        'Documentos por vencer en los próximos 7 días',
        `${totalExpiringSoon} documento${totalExpiringSoon !== 1 ? 's' : ''} requiere${totalExpiringSoon !== 1 ? 'n' : ''} atención`
      );
      bodyInner += employeesGroup(exp.employees);
      bodyInner += equipmentGroup(exp.equipment);
      bodyInner += companyGroup(exp.company);
    }
  }

  const ctaBlock = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center" style="padding:16px 0 4px;">
          <a href="${urlDashboardRoot()}" target="_blank" style="display:inline-block;background:#ff9800;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">Ver tablero de documentos &rsaquo;</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:4px 0 0;">
          <a href="${urlDashboardRoot()}" target="_blank" style="font-size:11px;color:#94a3b8;text-decoration:underline;">${urlDashboardRoot()}</a>
        </td>
      </tr>
    </table>
  `;

  return `
    <!DOCTYPE html>
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
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="56" style="vertical-align:middle;">
                        <img src="${LOGO_URL}" alt="Grupo Horizonte" width="48" height="48" style="display:block;border-radius:8px;border:2px solid rgba(255,255,255,0.15);" />
                      </td>
                      <td style="vertical-align:middle;padding-left:16px;">
                        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Grupo Horizonte</p>
                        <p style="margin:2px 0 0;font-size:13px;color:#94a3b8;font-weight:400;">Sistema de Gesti&oacute;n</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background:#ff9800;padding:16px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">Resumen Semanal de Documentos</p>
                        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);text-transform:capitalize;">${formatLongDateAr(data.today)}</p>
                      </td>
                      <td align="right" style="vertical-align:middle;">
                        ${titleBadge}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff;padding:28px 32px;">
                  ${bodyInner}
                  ${ctaBlock}
                </td>
              </tr>

              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Este es un correo autom&aacute;tico generado por el sistema de gesti&oacute;n.</p>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">Grupo Horizonte &mdash; Por favor no responda a este correo.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const daysAhead: number = typeof body.days_ahead === 'number' ? body.days_ahead : 7;
    // detail_limit se mantiene en la firma de la RPC por compatibilidad pero ya no se aplica
    const detailLimit: number = typeof body.detail_limit === 'number' ? body.detail_limit : 9999;

    const emailTo: string[] =
      body.to || body.emails || (body.recipient_email ? [body.recipient_email] : ['yordanpz@hotmail.com']);
    const emailCc: string[] = body.cc || [];
    const emailBcc: string[] = body.bcc || [];

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_documents_expiry_summary', {
      p_days_ahead: daysAhead,
      p_detail_limit: detailLimit,
    });

    if (rpcError) {
      throw new Error(`Error getting documents expiry summary: ${rpcError.message}`);
    }

    const summary = rpcData as unknown as ExpirySummaryResult;

    const SMTP_HOST = Deno.env.get('SMTP_HOST');
    const SMTP_PORT = Deno.env.get('SMTP_PORT') || '465';
    const SMTP_USER = Deno.env.get('SMTP_USER');
    const SMTP_PASS = Deno.env.get('SMTP_PASS');
    const SMTP_SECURE = Deno.env.get('SMTP_SECURE') || 'true';

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }

    const emailHtml = formatDocumentsExpiryEmail(summary);

    const nodemailer = (await import('npm:nodemailer@6')).default;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    const subjectDate = formatLongDateAr(summary.today);
    const emailResult = await transporter.sendMail({
      from: `"Grupo Horizonte" <${SMTP_USER}>`,
      to: emailTo.join(', '),
      cc: emailCc.length > 0 ? emailCc.join(', ') : undefined,
      bcc: emailBcc.length > 0 ? emailBcc.join(', ') : undefined,
      subject: `Resumen semanal de documentos — ${subjectDate}`,
      html: emailHtml,
    });

    const totals = {
      expiring_soon:
        summary.expiring_soon.employees.total + summary.expiring_soon.equipment.total + summary.expiring_soon.company.total,
      expired: summary.expired_counts.employees + summary.expired_counts.equipment + summary.expired_counts.company,
      pending: summary.pending_counts.employees + summary.pending_counts.equipment + summary.pending_counts.company,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: emailResult.messageId,
        to: emailTo,
        app_url: APP_URL,
        report_date: summary.today,
        days_ahead: summary.days_ahead,
        totals,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
