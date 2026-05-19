-- =====================================================================
-- RPC: get_documents_expiry_summary
-- -------
-- Agrega documentos por vencer en los proximos N dias (con detalle limitado),
-- vencidos (solo conteo) y pendientes (solo conteo) para empleados, equipos
-- y empresa. Devuelve un JSONB consumido por la edge function
-- send-documents-expiry-email.
--
-- Reglas:
--   * Filtra is_active=true en documento, empleado/vehiculo y document_type.
--   * Categorias excluyentes en este orden de prioridad: pendiente → vencido → por vencer.
--   * Fechas se calculan en zona horaria America/Argentina/Buenos_Aires.
--   * documents_company.validity es String (formato DD/MM/YYYY); se parsea
--     defensivamente con regex y TO_DATE.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_documents_expiry_summary(
  p_days_ahead int DEFAULT 7,
  p_detail_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_window_end date;
  v_result jsonb;
BEGIN
  v_today := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_window_end := v_today + p_days_ahead;

  WITH
    -- ================================================================
    -- EMPLEADOS — por vencer (detalle limitado + total real)
    -- ================================================================
    employees_expiring_all AS (
      SELECT
        de.id,
        de.validity::date AS validity,
        e.file AS file_number,
        TRIM(BOTH ' ' FROM CONCAT_WS(', ', e.lastname, e.firstname)) AS employee_name,
        dt.name AS document_type_name,
        (de.validity::date - v_today)::int AS days_remaining
      FROM documents_employees de
      INNER JOIN employees e ON e.id = de.applies
      INNER JOIN document_types dt ON dt.id = de.id_document_types
      WHERE
        de.is_active = true
        AND e.is_active = true
        AND dt.is_active = true
        AND de.state <> 'pendiente'
        AND de.validity IS NOT NULL
        AND de.validity::date BETWEEN v_today AND v_window_end
    ),
    employees_expiring_detail AS (
      SELECT * FROM employees_expiring_all
      ORDER BY validity ASC, employee_name ASC
      LIMIT p_detail_limit
    ),

    -- ================================================================
    -- EQUIPOS — por vencer (detalle limitado + total real)
    -- ================================================================
    equipment_expiring_all AS (
      SELECT
        deq.id,
        deq.validity::date AS validity,
        COALESCE(v.domain, '—') AS domain,
        COALESCE(v.intern_number, '—') AS intern_number,
        dt.name AS document_type_name,
        (deq.validity::date - v_today)::int AS days_remaining
      FROM documents_equipment deq
      INNER JOIN vehicles v ON v.id = deq.applies
      INNER JOIN document_types dt ON dt.id = deq.id_document_types
      WHERE
        deq.is_active = true
        AND v.is_active = true
        AND dt.is_active = true
        AND deq.state <> 'pendiente'
        AND deq.validity IS NOT NULL
        AND deq.validity::date BETWEEN v_today AND v_window_end
    ),
    equipment_expiring_detail AS (
      SELECT * FROM equipment_expiring_all
      ORDER BY validity ASC, domain ASC
      LIMIT p_detail_limit
    ),

    -- ================================================================
    -- EMPRESA — parseo defensivo de validity (string DD/MM/YYYY)
    -- ================================================================
    company_docs_parsed AS (
      SELECT
        dc.id,
        dc.state,
        dc.validity AS validity_raw,
        CASE
          WHEN dc.validity ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            THEN TO_DATE(dc.validity, 'DD/MM/YYYY')
          ELSE NULL
        END AS validity_parsed,
        dt.name AS document_type_name
      FROM documents_company dc
      INNER JOIN document_types dt ON dt.id = dc.id_document_types
      WHERE
        dc.is_active = true
        AND dt.is_active = true
    ),
    company_expiring_all AS (
      SELECT
        id,
        validity_parsed AS validity,
        validity_raw,
        document_type_name,
        (validity_parsed - v_today)::int AS days_remaining
      FROM company_docs_parsed
      WHERE
        state <> 'pendiente'
        AND validity_parsed IS NOT NULL
        AND validity_parsed BETWEEN v_today AND v_window_end
    ),
    company_expiring_detail AS (
      SELECT * FROM company_expiring_all
      ORDER BY validity ASC, document_type_name ASC
      LIMIT p_detail_limit
    )

  SELECT jsonb_build_object(
    'generated_at',  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires',
    'today',         v_today,
    'window_end',    v_window_end,
    'days_ahead',    p_days_ahead,
    'detail_limit',  p_detail_limit,

    -- Detalle "por vencer" (lista) + total por entidad
    'expiring_soon', jsonb_build_object(
      'employees', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM employees_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'file_number',         d.file_number,
                'employee_name',       d.employee_name,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.employee_name
           ) FROM employees_expiring_detail d),
          '[]'::jsonb
        )
      ),
      'equipment', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM equipment_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'domain',              d.domain,
                'intern_number',       d.intern_number,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.domain
           ) FROM equipment_expiring_detail d),
          '[]'::jsonb
        )
      ),
      'company', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM company_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'validity_raw',        d.validity_raw,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.document_type_name
           ) FROM company_expiring_detail d),
          '[]'::jsonb
        )
      )
    ),

    -- Vencidos (solo conteo por entidad)
    'expired_counts', jsonb_build_object(
      'employees', (
        SELECT COUNT(*)
        FROM documents_employees de
        INNER JOIN employees e ON e.id = de.applies
        INNER JOIN document_types dt ON dt.id = de.id_document_types
        WHERE de.is_active = true
          AND e.is_active = true
          AND dt.is_active = true
          AND de.state <> 'pendiente'
          AND de.validity IS NOT NULL
          AND de.validity::date < v_today
      ),
      'equipment', (
        SELECT COUNT(*)
        FROM documents_equipment deq
        INNER JOIN vehicles v ON v.id = deq.applies
        INNER JOIN document_types dt ON dt.id = deq.id_document_types
        WHERE deq.is_active = true
          AND v.is_active = true
          AND dt.is_active = true
          AND deq.state <> 'pendiente'
          AND deq.validity IS NOT NULL
          AND deq.validity::date < v_today
      ),
      'company', (
        SELECT COUNT(*)
        FROM company_docs_parsed
        WHERE state <> 'pendiente'
          AND validity_parsed IS NOT NULL
          AND validity_parsed < v_today
      )
    ),

    -- Pendientes (solo conteo por entidad)
    'pending_counts', jsonb_build_object(
      'employees', (
        SELECT COUNT(*)
        FROM documents_employees de
        INNER JOIN employees e ON e.id = de.applies
        INNER JOIN document_types dt ON dt.id = de.id_document_types
        WHERE de.is_active = true
          AND e.is_active = true
          AND dt.is_active = true
          AND de.state = 'pendiente'
      ),
      'equipment', (
        SELECT COUNT(*)
        FROM documents_equipment deq
        INNER JOIN vehicles v ON v.id = deq.applies
        INNER JOIN document_types dt ON dt.id = deq.id_document_types
        WHERE deq.is_active = true
          AND v.is_active = true
          AND dt.is_active = true
          AND deq.state = 'pendiente'
      ),
      'company', (
        SELECT COUNT(*)
        FROM company_docs_parsed
        WHERE state = 'pendiente'
      )
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Permisos: la edge function llama con service_role (SUPABASE_SERVICE_ROLE_KEY),
-- que ya tiene acceso completo a SECURITY DEFINER. No se otorgan permisos extra
-- a roles authenticated/anon para no exponer la funcion en la API publica.
COMMENT ON FUNCTION public.get_documents_expiry_summary(int, int) IS
  'Agrega documentos por vencer/vencidos/pendientes para el correo semanal automatico. Consumido por la edge function send-documents-expiry-email.';
