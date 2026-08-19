-- ============================================================================
-- ROLLBACK de 20260819120100_add_daily_report_deviations_snapshot
--
-- NO se ejecuta en el deploy: Prisma solo aplica `migration.sql`. Este archivo
-- esta para tenerlo a mano si hay que revertir a mano en produccion.
--
-- El unico objeto preexistente que la migracion pisa es
-- `run_daily_indicators_for_all_companies()`. Lo de abajo es su definicion tal
-- como estaba en produccion antes del cambio (capturada con pg_get_functiondef
-- el 2026-08-19): los mismos 10 indicadores, sin la llamada al de desvios.
--
-- Lo demas que agrega la migracion es aditivo y no necesita rollback:
--   - `get_daily_report_deviations_indicator` no la llama nadie mas.
--   - Las filas de `daily_indicators` usan un `source` propio; borrarlas es
--     opcional (ver el DELETE comentado al final).
--   - El valor del enum no se puede quitar en Postgres, pero es inofensivo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_daily_indicators_for_all_companies()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_record RECORD;
  v_today date := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  FOR company_record IN SELECT id FROM company LOOP
    BEGIN
      PERFORM public.get_employee_usage_indicator(
        position_uuids => NULL::uuid[],
        save_to_table => true,
        p_company_id => company_record.id
      );

      PERFORM public.get_employee_diagram_count_by_day(
        p_day => EXTRACT(DAY FROM v_today)::integer,
        p_month => EXTRACT(MONTH FROM v_today)::integer,
        p_year => EXTRACT(YEAR FROM v_today)::integer,
        p_company_position_ids => NULL,
        save_to_table => true,
        p_company_id => company_record.id
      );

      PERFORM public.get_vehicle_usage_indicator(
        p_vehicle_type_ids => ARRAY[]::uuid[],
        p_company_id => company_record.id,
        save_to_table => true
      );

      PERFORM public.get_company_counts_indicator(
        p_company_id => company_record.id,
        save_to_table => true
      );

      PERFORM public.hr_get_absenteeism_summary(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_absenteeism_trend(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_current_absent_employees(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_daily_absence_timeseries(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_department_absence_reasons(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_department_absence_summary(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al ejecutar indicadores para company_id %: %', company_record.id, SQLERRM;
    END;
  END LOOP;
END;
$function$;

-- Opcional: descartar los snapshots generados por el indicador de desvios.
-- DELETE FROM public.daily_indicators WHERE source = 'get_daily_report_deviations_indicator';

-- Opcional: quitar la funcion nueva (nadie mas la referencia).
-- DROP FUNCTION IF EXISTS public.get_daily_report_deviations_indicator(uuid, date, boolean);
