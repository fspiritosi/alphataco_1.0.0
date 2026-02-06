import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeviationData {
  row_id: string;
  customer_name: string;
  service_name: string | null;
  item_name: string | null;
  employee_id: string | null;
  employee_name: string | null;
  employee_cuil: string | null;
  deviation_type: string;
}

interface DuplicateData {
  employee_id: string;
  employee_name: string;
  employee_cuil: string;
  times_assigned: number;
  assignments: string[];
}

interface DeviationsResult {
  daily_report_id: string;
  report_date: string;
  deviations: DeviationData[];
  duplicates: DuplicateData[];
  summary: {
    total_deviations: number;
    total_duplicates: number;
    employees_not_assigned: number;
    employees_no_valid_diagram: number;
    rows_without_resources: number;
  };
}

const LOGO_URL = 'https://vvrckjjyrwqzpbaatemz.supabase.co/storage/v1/object/public/logo/30709694363.png';

function getDeviationBadge(type: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    'No afectado': { bg: '#fff7ed', text: '#c2410c' },
    'Sin diagrama válido': { bg: '#fef2f2', text: '#b91c1c' },
    'Sin recursos': { bg: '#fefce8', text: '#a16207' },
  };
  const c = colors[type] || { bg: '#f1f5f9', text: '#475569' };
  return `<span style="background:${c.bg};color:${c.text};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;white-space:nowrap;">${type}</span>`;
}

function formatDeviationsEmail(data: DeviationsResult): string {
  const { report_date, deviations, duplicates, summary } = data;

  const formattedDate = new Date(report_date).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalIssues = summary.total_deviations + summary.total_duplicates;

  const summaryCards = [
    { label: 'Total Desvíos', value: totalIssues, color: '#ea580c' },
    { label: 'No Afectados', value: summary.employees_not_assigned, color: '#c2410c' },
    { label: 'Sin Diagrama', value: summary.employees_no_valid_diagram, color: '#b91c1c' },
    { label: 'Sin Recursos', value: summary.rows_without_resources, color: '#a16207' },
    { label: 'Duplicados', value: summary.total_duplicates, color: '#7c3aed' },
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
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

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
                        <p style="margin:2px 0 0;font-size:13px;color:#94a3b8;font-weight:400;">Sistema de Gestión</p>
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
                        <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">Reporte de Desvíos — Parte Diario</p>
                        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);text-transform:capitalize;">${formattedDate}</p>
                      </td>
                      <td align="right" style="vertical-align:middle;">
                        <span style="background:rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">${totalIssues} desvío${totalIssues !== 1 ? 's' : ''}</span>
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
                        <td align="center" style="padding:0 4px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                            <tr>
                              <td style="padding:14px 8px;text-align:center;">
                                <p style="margin:0;font-size:28px;font-weight:800;color:${card.color};line-height:1;">${card.value}</p>
                                <p style="margin:6px 0 0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${card.label}</p>
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

  // Desvíos table
  if (deviations.length > 0) {
    html += `
                  <!-- DEVIATIONS TABLE -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:15px;font-weight:700;color:#1e293b;">Desvíos Detectados</p>
                        <div style="width:40px;height:3px;background:#ff9800;border-radius:2px;margin-top:6px;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                          <thead>
                            <tr style="background:#1e293b;">
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Cliente</th>
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Servicio</th>
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Empleado</th>
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">CUIL</th>
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Tipo</th>
                            </tr>
                          </thead>
                          <tbody>
    `;

    for (let i = 0; i < deviations.length; i++) {
      const d = deviations[i];
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `
                            <tr style="background:${bgColor};">
                              <td style="padding:10px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">${d.customer_name || '—'}</td>
                              <td style="padding:10px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">${d.service_name || '—'}</td>
                              <td style="padding:10px 14px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #f1f5f9;">${d.employee_name || '—'}</td>
                              <td style="padding:10px 14px;font-size:13px;color:#64748b;font-family:monospace;border-bottom:1px solid #f1f5f9;">${d.employee_cuil || '—'}</td>
                              <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">${getDeviationBadge(d.deviation_type)}</td>
                            </tr>
      `;
    }

    html += `
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </table>
    `;
  }

  // Duplicates table
  if (duplicates.length > 0) {
    html += `
                  <!-- DUPLICATES TABLE -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:15px;font-weight:700;color:#1e293b;">Empleados Duplicados</p>
                        <div style="width:40px;height:3px;background:#7c3aed;border-radius:2px;margin-top:6px;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                          <thead>
                            <tr style="background:#1e293b;">
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Empleado</th>
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">CUIL</th>
                              <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Veces</th>
                              <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">Asignaciones</th>
                            </tr>
                          </thead>
                          <tbody>
    `;

    for (let i = 0; i < duplicates.length; i++) {
      const d = duplicates[i];
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `
                            <tr style="background:${bgColor};">
                              <td style="padding:10px 14px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #f1f5f9;">${d.employee_name}</td>
                              <td style="padding:10px 14px;font-size:13px;color:#64748b;font-family:monospace;border-bottom:1px solid #f1f5f9;">${d.employee_cuil}</td>
                              <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;">
                                <span style="background:#f5f3ff;color:#7c3aed;padding:3px 10px;border-radius:12px;font-size:13px;font-weight:700;">${d.times_assigned}</span>
                              </td>
                              <td style="padding:10px 14px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;line-height:1.5;">${d.assignments.join('<br>')}</td>
                            </tr>
      `;
    }

    html += `
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </table>
    `;
  }

  html += `
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Este es un correo automático generado por el sistema de gestión.</p>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">Grupo Horizonte — Por favor no responda a este correo.</p>
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { daily_report_id, recipient_email } = await req.json();

    if (!daily_report_id) {
      return new Response(JSON.stringify({ error: 'daily_report_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get deviations using the SQL function
    const { data: deviationsData, error: deviationsError } = await supabase.rpc('get_daily_report_deviations', {
      p_daily_report_id: daily_report_id,
    });

    if (deviationsError) {
      throw new Error(`Error getting deviations: ${deviationsError.message}`);
    }

    const deviations = deviationsData as DeviationsResult;

    // Check if there are any deviations
    if (deviations.summary.total_deviations === 0 && deviations.summary.total_duplicates === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No deviations found, email not sent',
          deviations: deviations,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email using SMTP
    const SMTP_HOST = Deno.env.get('SMTP_HOST');
    const SMTP_PORT = Deno.env.get('SMTP_PORT') || '465';
    const SMTP_USER = Deno.env.get('SMTP_USER');
    const SMTP_PASS = Deno.env.get('SMTP_PASS');
    const SMTP_SECURE = Deno.env.get('SMTP_SECURE') || 'true';

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }

    const emailTo = recipient_email || 'yordanpz@hotmail.com';
    const emailHtml = formatDeviationsEmail(deviations);

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

    const emailResult = await transporter.sendMail({
      from: `"Grupo Horizonte" <${SMTP_USER}>`,
      to: emailTo,
      subject: `⚠️ Desvíos del Parte Diario - ${deviations.report_date}`,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: emailResult.messageId,
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
