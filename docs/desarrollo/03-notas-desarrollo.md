<!-- el sectores form no precarga el cliente al editar
No trae los diagramas en la vista de diagramas (empleados,diagramas,diagramascargados)
Horario de los diagramas cargados no coincide
algunas tabs de emplesa desentonan en la manera, y en la de clientes el ver cliente debe estar en la row
clientes,equipos y empleados de la empresa en operaciones

✅solo no operativos no se muestran
✅empleados laboralmente activo
-project-id "vvrckjjyrwqzpbaatemz"

✅npx supabase gen types typescript --project-id "vvrckjjyrwqzpbaatemz" --schema public > database.types.ts -->

✅luego de eidtar un registro mantener el orden de los campos y refrescar la tabla

✅Error deleting daily report row:, no deja eliminar los partes vacioss

✅revisar el descargar documentos

✅el modal de documentos no carga bien las cosas

✅mover tablas y filtros a los demas

✅revisar el completar diurno o nocturno

Recargar los documentos al cargarlo

el ver va de la mano con los demas acciones

mostra en roles la cantidad de personas con el rol
poder clonar roles
el logo comercial se ve mal
validar mismo nombre en el role
El boton general de crear, ver o editar no esta funcionando
al editar un role deben editarse los permisos de los empleados
Error al crear roles (key duplicada)
revisar el guardado de indicadores que se esta duplicando

👍si la row no tiene recursos no debe poder cambiarse de sin recursos
👍Si estoy en la pagina 2 me regresa a la 1, creo que hace el refresh
👍sector y aaera no son opcionales y el equipos de cliente si
👍indicar que el esta de baja el tipo al elegirlo en el parte, un badge rojo
👍la fecha del comercial es de ayer hacia atras
👍eliminar el compeleto dia y noche

👍En comercial solo se deben poder editar las lineas que tienen el parte cerrado, solo desde comercial
👍Agregar un campo fecha
👍controlar el cliente, es decir solo filtrar remitos del mismo cliente
👍Agrear boton de crear empleado
👍Manera de borrar todos los filtros
👍El componente de tabs no hay veces que dice son roles

👍Agregar los filtros a la tabla de usuarios
👍La tabla de usuarios tiene pegados los mismos usuarios siempre
👍Mostrar un mejor mensaje al poner el mismo nombre en el role
👍Mostrar un mejor mensaje al elimiar un role con usuarios asignados
👍Serarar roles de sistemas por roles personalizados

👍-Los roles de sistemas solo se pueden asignar, mantener a los botones en los roles personaliados
👍-En los roles personalizados poner disbaled el de borrar si hay usuarios, y en rojo si se puede borrar
👍Arreglar padding de las vistas
👍Agregar boton de equipos, crar equipo
👍Empleados /diagramas / diagramas cargados el componente le falta el fondo
👍arreglar el label de la linea

Usar el componente de tabs en el detalle del empleado y equipo, argregarlo al tema de roles

INSERT INTO public.tabs
(id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES
('20000000-0000-0000-0000-000000000041',
'3c54a757-162c-4afc-8ea5-dca462f92e0c',
'tipos-docs-personas',
'Personas',
'Sub‑tab de tipos de documentos para personas',
1,
'20000000-0000-0000-0000-000000000004'),

    ('20000000-0000-0000-0000-000000000042',
     '3c54a757-162c-4afc-8ea5-dca462f92e0c',
     'tipos-docs-equipos',
     'Equipos',
     'Sub‑tab de tipos de documentos para equipos',
     2,
     '20000000-0000-0000-0000-000000000004'),

    ('20000000-0000-0000-0000-000000000043',
     '3c54a757-162c-4afc-8ea5-dca462f92e0c',
     'tipos-docs-empresa',
     'Empresa',
     'Sub‑tab de tipos de documentos para la empresa',
     3,
     '20000000-0000-0000-0000-000000000004')

ON CONFLICT (module_id, slug) DO NOTHING;

-- Eliminar las subtabs de equipos y empresa del módulo empleados
DELETE FROM tabs
WHERE id IN (
'20000000-0000-0000-0000-000000000042', -- tipos-docs-equipos
'20000000-0000-0000-0000-000000000043' -- tipos-docs-empresa
);

-- Subtabs para Clientes (4 subtabs)
INSERT INTO public.tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('40000000-0000-0000-0000-000000000111', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'detalle-cliente', 'Detalle', 'Detalle del cliente', 1, '40000000-0000-0000-0000-000000000011'),
('40000000-0000-0000-0000-000000000112', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'empleados-cliente', 'Empleados', 'Empleados del cliente', 2, '40000000-0000-0000-0000-000000000011'),
('40000000-0000-0000-0000-000000000113', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'equipos-cliente', 'Equipos', 'Equipos del cliente', 3, '40000000-0000-0000-0000-000000000011'),
('40000000-0000-0000-0000-000000000114', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'contratos-cliente', 'Contratos', 'Contratos del cliente', 4, '40000000-0000-0000-0000-000000000011')
ON CONFLICT (id) DO NOTHING;

-- Subtabs para Contratos/Servicios (3 subtabs)
INSERT INTO public.tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('40000000-0000-0000-0000-000000000151', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'detalle-contrato', 'Detalle', 'Detalle del contrato', 1, '40000000-0000-0000-0000-000000000015'),
('40000000-0000-0000-0000-000000000152', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'documentos-contrato', 'Documentos', 'Documentos del contrato', 2, '40000000-0000-0000-0000-000000000015'),
('40000000-0000-0000-0000-000000000153', '92bfac14-dc5b-41be-b366-740bfbeaea13', 'items-contrato', 'Items del Servicio', 'Items del servicio/contrato', 3, '40000000-0000-0000-0000-000000000015')
ON CONFLICT (id) DO NOTHING;

-- Agregar subtabs para tipos-de-documentos en el módulo Documentación
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('50000000-0000-0000-0000-000000000041', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'tipos-docs-personas', 'Personas', 'Tipos de documentos de personas', 1, '50000000-0000-0000-0000-000000000004'),
('50000000-0000-0000-0000-000000000042', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'tipos-docs-equipos', 'Equipos', 'Tipos de documentos de equipos', 2, '50000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- Eliminar todas las subtabs del módulo Documentación
DELETE FROM tabs WHERE id IN (
-- Empleados
'50000000-0000-0000-0000-000000000011',
'50000000-0000-0000-0000-000000000012',
-- Equipos
'50000000-0000-0000-0000-000000000021',
'50000000-0000-0000-0000-000000000022',
-- Empresa
'50000000-0000-0000-0000-000000000031',
'50000000-0000-0000-0000-000000000032',
-- Tipos de documentos
'50000000-0000-0000-0000-000000000041',
'50000000-0000-0000-0000-000000000042'
);
