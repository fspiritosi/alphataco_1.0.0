-- El modulo "Empresa" pasa a llamarse "Configuracion".
--
-- Es lo que realmente contiene: los catalogos que configuran el sistema (tipos de documento,
-- puestos, tipos de diagrama, aptitudes, tipos/marcas/modelos de equipo, centros de costo...).
-- El nombre viejo se confundia ademas con el concepto de empresa-inquilino, que es otra cosa y
-- vive en la tabla `company`.
--
-- El `id` NO cambia, y ese es el punto: `tabs.module_id`, `role_permissions.tab_id` y
-- `user_permissions.tab_id` referencian por UUID, asi que las 31 tabs del modulo y todos los
-- permisos ya asignados (roles del sistema y permisos custom por usuario) quedan intactos.
-- Un rename por slug, en cambio, habria dejado los permisos colgando.
--
-- Idempotente: correrla dos veces deja la fila igual.
UPDATE modules
SET slug = 'configuracion',
    name = 'Configuración'
WHERE id = 'e0478383-1287-4b5e-a727-985baf867173';
