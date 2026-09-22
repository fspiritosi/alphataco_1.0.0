drop trigger if exists "tr_after_dailyreportrows_update" on "public"."dailyreportrows";

alter table "public"."preparte" add column "confirmed_by" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.after_dailyreportrows_update_optimized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    affected_reports UUID[];
    v_report_id UUID;
    row_record RECORD;
    tiene_filas BOOLEAN;
    todas_completas BOOLEAN;
    tiene_recursos BOOLEAN;
BEGIN
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    -- Esto funciona tanto para 1 fila como para múltiples filas
    SELECT ARRAY_AGG(DISTINCT daily_report_id) 
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;
    
    -- Procesar cada reporte afectado UNA SOLA VEZ
    FOREACH v_report_id IN ARRAY affected_reports
    LOOP
        -- Actualizar filas 'sin_recursos_asignados' que ahora tienen recursos
        UPDATE dailyreportrows
        SET status = 'pendiente',
            updated_at = NOW()
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

        -- Continuar con la lógica de cierre SOLO para reportes pasados y abiertos
        IF EXISTS (
            SELECT 1 
            FROM dailyreport 
            WHERE id = v_report_id
              AND date < CURRENT_DATE 
              AND status IN ('abierto', 'cerrado_incompleto')
        ) THEN
            -- Verificar si el reporte tiene filas asociadas
            SELECT EXISTS (SELECT 1 FROM dailyreportrows WHERE daily_report_id = v_report_id) INTO tiene_filas;
            
            IF NOT tiene_filas THEN
                -- Si no tiene filas, marcarlo como cerrado_completo
                UPDATE dailyreport 
                SET status = 'cerrado_completo', 
                    updated_at = NOW() 
                WHERE id = v_report_id;
            ELSE
                -- Verificar si todas las filas están completas
                SELECT NOT EXISTS (
                    SELECT 1 
                    FROM dailyreportrows 
                    WHERE daily_report_id = v_report_id 
                    AND (
                        status NOT IN ('ejecutado', 'reprogramado', 'cancelado')
                        OR (status = 'ejecutado' AND (document_path IS NULL OR document_path = ''))
                    )
                ) INTO todas_completas;
                
                -- Actualizar el estado según corresponda
                IF todas_completas THEN
                    UPDATE dailyreport 
                    SET status = 'cerrado_completo', 
                        updated_at = NOW() 
                    WHERE id = v_report_id;
                ELSE
                    UPDATE dailyreport 
                    SET status = 'cerrado_incompleto', 
                        updated_at = NOW() 
                    WHERE id = v_report_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE TRIGGER tr_after_dailyreportrows_update_optimized AFTER INSERT OR DELETE OR UPDATE ON public.dailyreportrows FOR EACH ROW EXECUTE FUNCTION after_dailyreportrows_update_optimized();


