-- =====================================================================
-- UPDATE RPC: get_documents_expiry_summary
-- -------
-- Agrega expired_doc_type_ids para empresa (lista de UUIDs distintos de
-- los tipos de documento que tienen al menos un vencido). Necesario para
-- que el correo automatico genere un link filtrado al tab de empresa con
-- ?...&documentType=<UUID,UUID,...> cuando se hace click en "Vencidos →
-- Empresa". documents_company.validity es String? por lo que no soporta
-- filtro dateRange.
--
-- Tambien se incluye lo mismo para empleados y equipos por consistencia,
-- aunque para esos el correo principalmente usa el filtro dateRange en
-- validity. El campo puede ser util para futuras necesidades.
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
    employees_expiring_all AS (
      SELECT
        de.id,
        de.applies AS employee_id,
        de.id_document_types AS document_type_id,
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
    equipment_expiring_all AS (
      SELECT
        deq.id,
        deq.applies AS vehicle_id,
        deq.id_document_types AS document_type_id,
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
    company_docs_parsed AS (
      SELECT
        dc.id,
        dc.id_document_types AS document_type_id,
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
        document_type_id,
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
    -- ── IDs distintos de doc_types para vencidos (por entidad) ──────────────
    employees_expired_doc_type_ids AS (
      SELECT DISTINCT de.id_document_types AS dt_id
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
    equipment_expired_doc_type_ids AS (
      SELECT DISTINCT deq.id_document_types AS dt_id
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
    company_expired_doc_type_ids AS (
      SELECT DISTINCT document_type_id AS dt_id
      FROM company_docs_parsed
      WHERE state <> 'pendiente'
        AND validity_parsed IS NOT NULL
        AND validity_parsed < v_today
    )

  SELECT jsonb_build_object(
    'generated_at',  NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires',
    'today',         v_today,
    'window_end',    v_window_end,
    'days_ahead',    p_days_ahead,
    'detail_limit',  p_detail_limit,

    'expiring_soon', jsonb_build_object(
      'employees', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM employees_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'employee_id',         d.employee_id,
                'document_type_id',    d.document_type_id,
                'file_number',         d.file_number,
                'employee_name',       d.employee_name,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.employee_name
           ) FROM employees_expiring_all d),
          '[]'::jsonb
        )
      ),
      'equipment', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM equipment_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'vehicle_id',          d.vehicle_id,
                'document_type_id',    d.document_type_id,
                'domain',              d.domain,
                'intern_number',       d.intern_number,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.domain
           ) FROM equipment_expiring_all d),
          '[]'::jsonb
        )
      ),
      'company', jsonb_build_object(
        'total',  (SELECT COUNT(*) FROM company_expiring_all),
        'detail', COALESCE(
          (SELECT jsonb_agg(
              jsonb_build_object(
                'id',                  d.id,
                'document_type_id',    d.document_type_id,
                'document_type_name',  d.document_type_name,
                'validity',            d.validity,
                'validity_raw',        d.validity_raw,
                'days_remaining',      d.days_remaining
              ) ORDER BY d.validity, d.document_type_name
           ) FROM company_expiring_all d),
          '[]'::jsonb
        )
      )
    ),

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

    -- NUEVO: IDs distintos de doc_types con vencidos, por entidad
    'expired_doc_type_ids', jsonb_build_object(
      'employees', COALESCE(
        (SELECT jsonb_agg(dt_id) FROM employees_expired_doc_type_ids),
        '[]'::jsonb
      ),
      'equipment', COALESCE(
        (SELECT jsonb_agg(dt_id) FROM equipment_expired_doc_type_ids),
        '[]'::jsonb
      ),
      'company', COALESCE(
        (SELECT jsonb_agg(dt_id) FROM company_expired_doc_type_ids),
        '[]'::jsonb
      )
    ),

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
