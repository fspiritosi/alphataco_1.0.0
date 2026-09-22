-- Ticket 546 — La tab de la ficha de "otros equipos" pasa a llamarse "Documentos".
--
-- Ahi es donde se adjunta toda la documentacion del equipo (ficha, manuales,
-- procedimientos, certificados), no solo certificaciones. El nombre viejo hacia que
-- los usuarios no encontraran donde subirla.
--
-- Se conserva el slug `certificaciones-otro` a proposito: renombrarlo obligaria a
-- reasignar los permisos que los roles custom de la empresa ya tienen cargados a mano.
-- Este UPDATE solo cambia el texto que se muestra en el editor de permisos.

UPDATE public.tabs
SET name = 'Documentos',
    description = 'Documentos del equipo tipo Otro'
WHERE id = 'b635efcb-e558-4709-8037-f5d3f3761c84';
