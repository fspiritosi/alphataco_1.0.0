import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// INTERFACES (match RPC output)
// ========================================

interface EmployeeDeviation {
  employee_id: string;
  employee_name: string;
  employee_cuil: string;
  role: string;
  is_duplicated: boolean;
  is_unassigned_to_client: boolean;
  has_no_diagram: boolean;
  is_non_work_day: boolean;
  diagram_type_name: string | null;
}

interface EquipmentDeviation {
  equipment_id: string;
  equipment_domain: string;
  equipment_intern_number: string;
  /** Identificador a mostrar: dominio del vehiculo, o N° de serie / interno si es otro equipo */
  equipment_label: string;
  /** Tipo del otro equipo (Pileta, Contenedor). NULL en vehiculos */
  equipment_type: string | null;
  /** true cuando la relacion apunta a other_equipment en vez de a vehicles */
  is_other_equipment: boolean;
  condition: string;
  is_duplicated: boolean;
  is_unassigned_to_client: boolean;
}

interface CustomerEquipment {
  name: string;
  type: string;
}

interface RowWithDeviations {
  row_id: string;
  customer_id: string;
  customer_name: string;
  service_name: string;
  item_name: string;
  start_time: string | null;
  end_time: string | null;
  working_day: string | null;
  type_service: string | null;
  status: string | null;
  description: string | null;
  sector_name: string | null;
  area_name: string | null;
  customer_equipment: CustomerEquipment[];
  employee_deviations: EmployeeDeviation[];
  equipment_deviations: EquipmentDeviation[];
}

interface DeviationsResult {
  rows_with_deviations: RowWithDeviations[];
  summary: {
    total_employee_deviations: number;
    total_equipment_deviations: number;
    total_duplicated_employees: number;
    total_duplicated_equipment: number;
    total_rows_with_deviations: number;
  };
}

const APP_URL = 'https://gh-gestion.com';
const LOGO_URL = 'https://vvrckjjyrwqzpbaatemz.supabase.co/storage/v1/object/public/logo/30709694363.png';

// ========================================
// HELPERS
// ========================================

const ROLE_LABELS: Record<string, string> = {
  chofer_dia: 'Chofer Día',
  chofer_noche: 'Chofer Noche',
  ayudante_dia: 'Ayudante Día',
  ayudante_noche: 'Ayudante Noche',
  sin_rol: 'Sin rol',
};

const CONDITION_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  operativo: { label: 'Operativo', bg: '#f0fdf4', text: '#15803d' },
  'no operativo': { label: 'No operativo', bg: '#fef2f2', text: '#b91c1c' },
  'en reparacion': { label: 'En reparación', bg: '#fefce8', text: '#a16207' },
  'operativo condicionado': { label: 'Operativo condicionado', bg: '#fff7ed', text: '#c2410c' },
  'en preparacion': { label: 'En preparación', bg: '#eff6ff', text: '#1d4ed8' },
  desconocido: { label: 'Desconocido', bg: '#f1f5f9', text: '#475569' },
};

function badge(label: string, bg: string, text: string): string {
  return `<span style="display:inline-block;background:${bg};color:${text};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;line-height:1.4;">${label}</span>`;
}

function employeeDeviationBadges(d: EmployeeDeviation): string {
  const badges: string[] = [];
  if (d.is_unassigned_to_client) badges.push(badge('No afectado', '#fff7ed', '#c2410c'));
  if (d.has_no_diagram) badges.push(badge('Sin diagrama', '#fef2f2', '#b91c1c'));
  if (d.is_non_work_day)
    badges.push(badge(`Día no laboral${d.diagram_type_name ? ` (${d.diagram_type_name})` : ''}`, '#fefce8', '#a16207'));
  if (d.is_duplicated) badges.push(badge('Duplicado', '#f5f3ff', '#7c3aed'));
  return badges.join(' ');
}

/**
 * Los otros equipos (piletas, contenedores) no tienen patente: se los muestra
 * por N° de serie con el tipo al lado, para distinguirlos de un vehiculo.
 */
function equipmentLabelCell(d: EquipmentDeviation): string {
  const label = d.equipment_label || d.equipment_domain || '—';
  if (!d.is_other_equipment || !d.equipment_type) return label;
  return `${label} ${badge(d.equipment_type, '#f1f5f9', '#475569')}`;
}

/**
 * En la mayoria de los otros equipos el N° de serie y el interno son el mismo
 * string: se omite para no repetir el dato en la misma fila.
 */
function equipmentInternCell(d: EquipmentDeviation): string {
  const intern = d.equipment_intern_number;
  if (!intern || intern === '—') return '—';
  if (intern === (d.equipment_label || d.equipment_domain)) return '—';
  return `#${intern}`;
}

function equipmentDeviationBadges(d: EquipmentDeviation): string {
  const badges: string[] = [];
  if (d.is_unassigned_to_client) badges.push(badge('No afectado', '#fff7ed', '#c2410c'));
  if (d.condition && d.condition !== 'operativo') {
    const c = CONDITION_LABELS[d.condition] || CONDITION_LABELS['desconocido'];
    badges.push(badge(c.label, c.bg, c.text));
  }
  if (d.is_duplicated) badges.push(badge('Duplicado', '#f5f3ff', '#7c3aed'));
  return badges.join(' ');
}

const TYPE_SERVICE_LABELS: Record<string, string> = {
  mensual: 'Mensual',
  adicional: 'Adicional',
  adicional_permanente: 'Adicional Permanente',
};

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', bg: '#fefce8', text: '#a16207' },
  sin_recursos_asignados: { label: 'Sin recursos', bg: '#fef2f2', text: '#b91c1c' },
  ejecutado: { label: 'Ejecutado', bg: '#f0fdf4', text: '#15803d' },
  reprogramado: { label: 'Reprogramado', bg: '#eff6ff', text: '#1d4ed8' },
  cancelado: { label: 'Cancelado', bg: '#fef2f2', text: '#b91c1c' },
  en_certificacion: { label: 'En certificaci\u00f3n', bg: '#f5f3ff', text: '#7c3aed' },
};

function formatTime(time: string | null): string {
  if (!time) return '—';
  // time comes as "HH:MM:SS" or "HH:MM", show only HH:MM
  return time.substring(0, 5);
}

function metadataItem(label: string, value: string): string {
  return `<span style="font-size:12px;color:#64748b;">${label}: </span><span style="font-size:12px;color:#1e293b;font-weight:500;">${value}</span>`;
}

function statusBadge(status: string | null): string {
  if (!status) return badge('—', '#f1f5f9', '#475569');
  const s = STATUS_LABELS[status] || { label: status, bg: '#f1f5f9', text: '#475569' };
  return badge(s.label, s.bg, s.text);
}

// ========================================
// EMAIL TEMPLATE
// ========================================

function formatDeviationsEmail(
  data: DeviationsResult,
  reportDate: string,
  dailyReportId: string,
  appUrl: string
): string {
  const { rows_with_deviations, summary } = data;

  const formattedDate = new Date(reportDate + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalIssues =
    summary.total_employee_deviations +
    summary.total_equipment_deviations +
    summary.total_duplicated_employees +
    summary.total_duplicated_equipment;
  const viewUrl = `${appUrl}/dashboard/operations/${dailyReportId}`;

  // Group rows by customer
  const customerGroups: Record<string, { customer_name: string; rows: RowWithDeviations[] }> = {};
  for (const row of rows_with_deviations) {
    const key = row.customer_id;
    if (!customerGroups[key]) {
      customerGroups[key] = { customer_name: row.customer_name, rows: [] };
    }
    customerGroups[key].rows.push(row);
  }

  const summaryCards = [
    { label: 'Rows con desvíos', value: summary.total_rows_with_deviations, color: '#ea580c' },
    { label: 'Desvíos Empleados', value: summary.total_employee_deviations, color: '#c2410c' },
    { label: 'Desvíos Equipos', value: summary.total_equipment_deviations, color: '#b91c1c' },
    { label: 'Empleados Duplicados', value: summary.total_duplicated_employees, color: '#7c3aed' },
    { label: 'Equipos Duplicados', value: summary.total_duplicated_equipment, color: '#6d28d9' },
  ];

  let html = `
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

              <!-- HEADER -->
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

              <!-- TITLE BAR -->
              <tr>
                <td style="background:#ff9800;padding:16px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">Reporte de Desv&iacute;os &mdash; Parte Diario</p>
                        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);text-transform:capitalize;">${formattedDate}</p>
                      </td>
                      <td align="right" style="vertical-align:middle;">
                        <span style="background:rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">${totalIssues} desv&iacute;o${totalIssues !== 1 ? 's' : ''}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="background:#ffffff;padding:28px 32px;">

                  <!-- SUMMARY CARDS -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      ${summaryCards
                        .map(
                          (card) => `
                        <td align="center" style="padding:0 3px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                            <tr>
                              <td style="padding:12px 6px;text-align:center;">
                                <p style="margin:0;font-size:24px;font-weight:800;color:${card.color};line-height:1;">${card.value}</p>
                                <p style="margin:5px 0 0;font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">${card.label}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      `
                        )
                        .join('')}
                    </tr>
                  </table>
  `;

  // ========================================
  // ROWS GROUPED BY CUSTOMER
  // ========================================
  const customerEntries = Object.values(customerGroups).sort((a, b) => a.customer_name.localeCompare(b.customer_name));

  for (const group of customerEntries) {
    // Customer header
    html += `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                    <!-- Customer Header -->
                    <tr>
                      <td style="background:#1e293b;padding:12px 18px;">
                        <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">${group.customer_name}</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">${group.rows.length} row${group.rows.length !== 1 ? 's' : ''} con desv&iacute;os</p>
                      </td>
                    </tr>
    `;

    for (let rowIdx = 0; rowIdx < group.rows.length; rowIdx++) {
      const row = group.rows[rowIdx];
      const rowBg = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const borderTop = rowIdx > 0 ? 'border-top:1px solid #e2e8f0;' : '';

      // Row info bar
      const workingDayLabel = row.working_day || '—';
      const typeServiceLabel = TYPE_SERVICE_LABELS[row.type_service || ''] || row.type_service || '—';
      const sectorLabel = row.sector_name || '—';
      const areaLabel = row.area_name || '—';
      const custEquip = (row.customer_equipment || []).filter((e: CustomerEquipment) => e.name !== '—');
      const custEquipText =
        custEquip.length > 0
          ? custEquip.map((e: CustomerEquipment) => `${e.name}${e.type !== '—' ? ` (${e.type})` : ''}`).join(', ')
          : null;

      html += `
                    <tr>
                      <td style="background:${rowBg};padding:0;${borderTop}">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <!-- Row info -->
                          <tr>
                            <td style="padding:10px 18px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td>
                                    <p style="margin:0;font-size:13px;font-weight:600;color:#334155;">${row.service_name}${row.item_name !== '—' ? ` &rsaquo; ${row.item_name}` : ''}</p>
                                  </td>
                                  <td align="right">
                                    <span style="font-size:12px;color:#64748b;">${formatTime(row.start_time)} &mdash; ${formatTime(row.end_time)}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <!-- Row metadata -->
                          <tr>
                            <td style="padding:8px 18px;">
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="padding:2px 0;">${metadataItem('Jornada', workingDayLabel)}</td>
                                  <td style="padding:2px 0;">${metadataItem('Tipo', typeServiceLabel)}</td>
                                  <td style="padding:2px 0;">${metadataItem('Estado', '')} ${statusBadge(row.status)}</td>
                                </tr>
                                <tr>
                                  <td style="padding:2px 0;">${metadataItem('Sector', sectorLabel)}</td>
                                  <td style="padding:2px 0;" colspan="2">${metadataItem('&Aacute;rea', areaLabel)}</td>
                                </tr>
                              </table>
                              ${custEquipText ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;">Equipo cliente: <span style="color:#1e293b;font-weight:500;">${custEquipText}</span></p>` : ''}
                              ${row.description ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;">Descripci&oacute;n: <span style="color:#475569;font-style:italic;">${row.description}</span></p>` : ''}
                            </td>
                          </tr>
      `;

      // Employee deviations
      if (row.employee_deviations.length > 0) {
        html += `
                          <tr>
                            <td style="padding:10px 18px 4px;">
                              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Empleados</p>
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                                <thead>
                                  <tr style="background:#f1f5f9;">
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Nombre</th>
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">CUIL</th>
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Rol</th>
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Desv&iacute;os</th>
                                  </tr>
                                </thead>
                                <tbody>
        `;

        for (let ei = 0; ei < row.employee_deviations.length; ei++) {
          const emp = row.employee_deviations[ei];
          const empBg = ei % 2 === 0 ? '#ffffff' : '#fafafa';
          html += `
                                  <tr style="background:${empBg};">
                                    <td style="padding:7px 10px;font-size:12px;color:#1e293b;font-weight:500;border-bottom:1px solid #f1f5f9;">${emp.employee_name}</td>
                                    <td style="padding:7px 10px;font-size:12px;color:#64748b;font-family:monospace;border-bottom:1px solid #f1f5f9;">${emp.employee_cuil}</td>
                                    <td style="padding:7px 10px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;">${ROLE_LABELS[emp.role] || emp.role}</td>
                                    <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${employeeDeviationBadges(emp)}</td>
                                  </tr>
          `;
        }

        html += `
                                </tbody>
                              </table>
                            </td>
                          </tr>
        `;
      }

      // Equipment deviations
      if (row.equipment_deviations.length > 0) {
        html += `
                          <tr>
                            <td style="padding:10px 18px 4px;">
                              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Equipos</p>
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                                <thead>
                                  <tr style="background:#f1f5f9;">
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Equipo</th>
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">N&deg; Interno</th>
                                    <th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Desv&iacute;os</th>
                                  </tr>
                                </thead>
                                <tbody>
        `;

        for (let qi = 0; qi < row.equipment_deviations.length; qi++) {
          const eq = row.equipment_deviations[qi];
          const eqBg = qi % 2 === 0 ? '#ffffff' : '#fafafa';
          html += `
                                  <tr style="background:${eqBg};">
                                    <td style="padding:7px 10px;font-size:12px;color:#1e293b;font-weight:500;font-family:monospace;border-bottom:1px solid #f1f5f9;">${equipmentLabelCell(eq)}</td>
                                    <td style="padding:7px 10px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;">${equipmentInternCell(eq)}</td>
                                    <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${equipmentDeviationBadges(eq)}</td>
                                  </tr>
          `;
        }

        html += `
                                </tbody>
                              </table>
                            </td>
                          </tr>
        `;
      }

      // Row bottom padding
      html += `
                          <tr><td style="padding:6px 0;"></td></tr>
                        </table>
                      </td>
                    </tr>
      `;
    }

    // Close customer group
    html += `
                  </table>
    `;
  }

  // CTA Button
  html += `
                  <!-- CTA BUTTON -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                    <tr>
                      <td align="center" style="padding:16px 0 4px;">
                        <a href="${viewUrl}" target="_blank" style="display:inline-block;background:#ff9800;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">Ver Parte Diario</a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:4px 0 0;">
                        <a href="${viewUrl}" target="_blank" style="font-size:11px;color:#94a3b8;text-decoration:underline;">${viewUrl}</a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- FOOTER -->
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

  return html;
}

// ========================================
// MAIN HANDLER
// ========================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================
    // RESOLVE report_date (optional)
    // If not provided, use current date in Argentina timezone
    // ========================================
    const resolvedDate: string =
      body.report_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

    // ========================================
    // RESOLVE daily_report_id (optional)
    // If not provided, find active daily report for resolvedDate
    // ========================================
    let resolvedDailyReportId: string = body.daily_report_id;

    if (!resolvedDailyReportId) {
      const { data: reports, error: reportsError } = await supabase
        .from('dailyreport')
        .select('id')
        .eq('date', resolvedDate)
        .eq('is_active', true);

      if (reportsError) {
        throw new Error(`Error finding daily report: ${reportsError.message}`);
      }

      if (!reports || reports.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `No active daily report found for date ${resolvedDate}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the first active daily report for the date
      resolvedDailyReportId = reports[0].id;
    }

    // ========================================
    // RESOLVE email recipients
    // Accepts: to (string[]), cc (string[]), bcc (string[])
    // Legacy: emails (string[]) or recipient_email (string) mapped to "to"
    // ========================================
    const emailTo: string[] =
      body.to ||
      body.emails ||
      (body.recipient_email ? [body.recipient_email] : undefined) ||
      (Deno.env.get('DEVIATIONS_RECIPIENTS') || '')
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);
    const emailCc: string[] = body.cc || [];
    const emailBcc: string[] = body.bcc || [];

    if (emailTo.length === 0) {
      return new Response(JSON.stringify({ error: 'missing recipients' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // GET DEVIATIONS
    // ========================================
    const { data: deviationsData, error: deviationsError } = await supabase.rpc('get_daily_report_deviations', {
      p_daily_report_id: resolvedDailyReportId,
      p_report_date: resolvedDate,
    });

    if (deviationsError) {
      throw new Error(`Error getting deviations: ${deviationsError.message}`);
    }

    const deviations = deviationsData as unknown as DeviationsResult;

    // Check if there are any deviations
    if (deviations.rows_with_deviations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No deviations found, email not sent',
          report_date: resolvedDate,
          daily_report_id: resolvedDailyReportId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // SEND EMAIL
    // ========================================
    const SMTP_HOST = Deno.env.get('SMTP_HOST');
    const SMTP_PORT = Deno.env.get('SMTP_PORT') || '465';
    const SMTP_USER = Deno.env.get('SMTP_USER');
    const SMTP_PASS = Deno.env.get('SMTP_PASS');
    const SMTP_SECURE = Deno.env.get('SMTP_SECURE') || 'true';

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }

    const emailHtml = formatDeviationsEmail(deviations, resolvedDate, resolvedDailyReportId, APP_URL);

    const nodemailer = (await import('npm:nodemailer@6')).default;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send single email with to, cc, bcc
    const emailResult = await transporter.sendMail({
      from: `"Grupo Horizonte" <${SMTP_USER}>`,
      to: emailTo.join(', '),
      cc: emailCc.length > 0 ? emailCc.join(', ') : undefined,
      bcc: emailBcc.length > 0 ? emailBcc.join(', ') : undefined,
      subject: `Desv\u00edos del Parte Diario - ${resolvedDate}`,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: emailResult.messageId,
        to: emailTo,
        cc: emailCc,
        bcc: emailBcc,
        report_date: resolvedDate,
        daily_report_id: resolvedDailyReportId,
        deviations_summary: deviations.summary,
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
