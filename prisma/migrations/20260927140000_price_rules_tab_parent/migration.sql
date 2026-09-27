-- La tab de reglas de precio se habia colgado de Contratos, pero una regla puede aplicar a
-- TODA la empresa y no solo a un contrato. Sube a hermana de Contratos para que el arbol del
-- editor de permisos refleje donde vive la pantalla. Los permisos no se tocan: el chequeo es
-- por `comercial:reglas-precio:<accion>` y no depende del padre.
UPDATE tabs
SET parent_tab_id = '40000000-0000-0000-0000-000000000001',
    order_index = 7
WHERE id = '40000000-0000-0000-0000-000000000154';
