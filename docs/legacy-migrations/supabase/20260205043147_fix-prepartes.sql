drop policy "Users can insert change logs" on "public"."preparte_change_logs";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.after_dailyreportrows_update_optimized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    affected_reports UUID[];
    v_report_id UUID;
BEGIN
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    SELECT ARRAY_AGG(DISTINCT daily_report_id) 
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;
    
    IF affected_reports IS NOT NULL AND array_length(affected_reports, 1) > 0 THEN
        -- Procesar cada reporte afectado
        FOREACH v_report_id IN ARRAY affected_reports
        LOOP
            -- ÚNICA FUNCIÓN: Actualizar filas 'sin_recursos_asignados' que ahora tienen recursos
            UPDATE dailyreportrows
            SET status = 'pendiente',
                updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
            WHERE id IN (
                SELECT dr.id
                FROM dailyreportrows dr
                WHERE dr.status = 'sin_recursos_asignados'
                  AND dr.daily_report_id = v_report_id
                  AND EXISTS (
                      SELECT 1 FROM dailyreportemployeerelations 
                      WHERE daily_report_row_id = dr.id
                      UNION
                      SELECT 1 FROM dailyreportequipmentrelations 
                      WHERE daily_report_row_id = dr.id
                  )
            );
            
            -- NOTA: La lógica de cierre de partes fue removida
            -- El cierre ahora es responsabilidad exclusiva del cronjob
            -- que ejecuta actualizar_estado_daily_reports() a las 00:00 Argentina
        END LOOP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;


  create policy "Allow insert change logs for company prepartes"
  on "public"."preparte_change_logs"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.preparte p
  WHERE ((p.id = preparte_change_logs.preparte_id) AND (p.company_id IN ( SELECT share_company_users.company_id
           FROM public.share_company_users
          WHERE (share_company_users.profile_id = auth.uid())))))));



  create policy "Permitir todo"
  on "public"."preparte_change_logs"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Service role can insert change logs"
  on "public"."preparte_change_logs"
  as permissive
  for insert
  to service_role
with check (true);



