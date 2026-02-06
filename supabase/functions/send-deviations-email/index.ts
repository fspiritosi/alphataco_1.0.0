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

function formatDeviationsEmail(data: DeviationsResult): string {
  const { report_date, deviations, duplicates, summary } = data;

  const formattedDate = new Date(report_date).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .summary { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .summary-item { display: inline-block; margin-right: 20px; padding: 10px; background: #fef2f2; border-radius: 4px; }
        .summary-number { font-size: 24px; font-weight: bold; color: #dc2626; }
        .section { margin-top: 20px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1f2937; border-bottom: 2px solid #dc2626; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; }
        th { background: #374151; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background: #f3f4f6; }
        .deviation-type { background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .footer { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Reporte de Desvíos - Parte Diario</h1>
          <p>Fecha: ${formattedDate}</p>
        </div>
        <div class="content">
          <div class="summary">
            <h3>Resumen</h3>
            <div class="summary-item">
              <div class="summary-number">${summary.total_deviations + summary.total_duplicates}</div>
              <div>Total Desvíos</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${summary.employees_not_assigned}</div>
              <div>No Afectados</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${summary.employees_no_valid_diagram}</div>
              <div>Sin Diagrama</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${summary.rows_without_resources}</div>
              <div>Sin Recursos</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${summary.total_duplicates}</div>
              <div>Duplicados</div>
            </div>
          </div>
  `;

  // Desvíos por tipo
  if (deviations.length > 0) {
    html += `
          <div class="section">
            <div class="section-title">Desvíos Detectados</div>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Empleado</th>
                  <th>CUIL</th>
                  <th>Tipo de Desvío</th>
                </tr>
              </thead>
              <tbody>
    `;

    for (const d of deviations) {
      html += `
                <tr>
                  <td>${d.customer_name || '-'}</td>
                  <td>${d.service_name || '-'}</td>
                  <td>${d.employee_name || '-'}</td>
                  <td>${d.employee_cuil || '-'}</td>
                  <td><span class="deviation-type">${d.deviation_type}</span></td>
                </tr>
      `;
    }

    html += `
              </tbody>
            </table>
          </div>
    `;
  }

  // Duplicados
  if (duplicates.length > 0) {
    html += `
          <div class="section">
            <div class="section-title">Empleados Duplicados</div>
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>CUIL</th>
                  <th>Veces Asignado</th>
                  <th>Asignaciones</th>
                </tr>
              </thead>
              <tbody>
    `;

    for (const d of duplicates) {
      html += `
                <tr>
                  <td>${d.employee_name}</td>
                  <td>${d.employee_cuil}</td>
                  <td>${d.times_assigned}</td>
                  <td>${d.assignments.join('<br>')}</td>
                </tr>
      `;
    }

    html += `
              </tbody>
            </table>
          </div>
    `;
  }

  html += `
        </div>
        <div class="footer">
          <p>Este es un correo automático generado por el sistema de gestión.</p>
          <p>Por favor no responda a este correo.</p>
        </div>
      </div>
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
