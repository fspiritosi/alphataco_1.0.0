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

proteger
👍Boton de editar en empresa
👍Quitar el de aprobar en el preparte si no puedes editar
👍Agregar permiso de borrar
👍Boton de editar al seleccionar la columna pparte
👍Heredar contratos en comercial clientes
👍No aparece el boton de editar preparte
👍El campo numero de remito es opcional en el form
👍no me funciona el boton de nuevo pedido
👍proteger boton de editar preparte, linea de select
👍En la tabla de usuarios mostrar todos los roles disponibles
👍Filtrar por role

## Herencia de Permisos - Documentación de Empleados

### Eliminación de tab documentacion-empleado (Herencia de permisos)

-- Migración: remove_documentacion_empleado_tab_inheritance
-- Eliminar permisos de usuario asociados a la tab documentacion-empleado
DELETE FROM user_permissions
WHERE tab_id = '20000000-0000-0000-0000-000000000064';

-- Eliminar permisos de roles asociados (si existen)
DELETE FROM role_permissions
WHERE tab_id = '20000000-0000-0000-0000-000000000064';

-- Eliminar la tab documentacion-empleado
DELETE FROM tabs
WHERE id = '20000000-0000-0000-0000-000000000064'
AND slug = 'documentacion-empleado';

### Agregar subtabs a documentos-de-empleados en módulo documentacion

-- Migración: add_subtabs_documentos_empleados_documentacion
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('60000000-0000-0000-0000-000000000003', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'docs-empleados-permanentes', 'Documentos Permanentes', 'Documentos permanentes de empleados', 1, '50000000-0000-0000-0000-000000000001', true),
('60000000-0000-0000-0000-000000000002', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'docs-empleados-mensuales', 'Documentos Mensuales', 'Documentos mensuales de empleados', 2, '50000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

### Corregir subtab de permanentes si falta

-- Migración: fix_subtabs_documentos_empleados_documentacion
-- Verificar si existe la subtab de permanentes y crearla si falta
DO $$
DECLARE
permanentes_exists BOOLEAN;
BEGIN
SELECT EXISTS (
SELECT 1 FROM tabs
WHERE parent_tab_id = '50000000-0000-0000-0000-000000000001'
AND slug = 'docs-empleados-permanentes'
) INTO permanentes_exists;

IF NOT permanentes_exists THEN
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('60000000-0000-0000-0000-000000000003', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'docs-empleados-permanentes', 'Documentos Permanentes', 'Documentos permanentes de empleados', 1, '50000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

-- Actualizar el order_index de mensuales para que sea 2
UPDATE tabs
SET order_index = 2
WHERE slug = 'docs-empleados-mensuales'
AND parent_tab_id = '50000000-0000-0000-0000-000000000001';

## Herencia de Permisos - Documentación de Equipos

### Eliminación de tab documentos-equipo (Herencia de permisos)

-- Migración: remove_documentos_equipo_tab_inheritance
-- Eliminar permisos de usuario asociados a la tab documentos-equipo
DELETE FROM user_permissions
WHERE tab_id = '30000000-0000-0000-0000-000000000053';

-- Eliminar permisos de roles asociados (si existen)
DELETE FROM role_permissions
WHERE tab_id = '30000000-0000-0000-0000-000000000053';

-- Eliminar la tab documentos-equipo
DELETE FROM tabs
WHERE id = '30000000-0000-0000-0000-000000000053'
AND slug = 'documentos-equipo';

### Agregar subtabs a documentos-de-equipos en módulo documentacion

-- Migración: add_subtabs_documentos_equipos_documentacion
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('60000000-0000-0000-0000-000000000004', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'docs-equipos-permanentes', 'Documentos Permanentes', 'Documentos permanentes de equipos', 1, '50000000-0000-0000-0000-000000000002', true),
('60000000-0000-0000-0000-000000000005', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'docs-equipos-mensuales', 'Documentos Mensuales', 'Documentos mensuales de equipos', 2, '50000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

## Herencia de Permisos - Reparaciones de Equipos

### Eliminación de tab reparaciones (Herencia de permisos)

-- Migración: remove_reparaciones_tab_inheritance
-- Eliminar permisos de usuario asociados a la tab reparaciones
DELETE FROM user_permissions
WHERE tab_id = '30000000-0000-0000-0000-000000000054';

-- Eliminar permisos de roles asociados (si existen)
DELETE FROM role_permissions
WHERE tab_id = '30000000-0000-0000-0000-000000000054';

-- Eliminar la tab reparaciones
DELETE FROM tabs
WHERE id = '30000000-0000-0000-0000-000000000054'
AND slug = 'reparaciones';

## Herencia de Permisos - Tipos de Documentos

### Agregar subtabs a tipos-de-documentos en módulo documentacion

-- Migración: add_subtabs_tipos_documentos_documentacion
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('60000000-0000-0000-0000-000000000006', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'tipos-docs-personas', 'Personas', 'Tipos de documentos de personas', 1, '50000000-0000-0000-0000-000000000004', true),
('60000000-0000-0000-0000-000000000007', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'tipos-docs-equipos', 'Equipos', 'Tipos de documentos de equipos', 2, '50000000-0000-0000-0000-000000000004', true)
ON CONFLICT (id) DO NOTHING;

### Eliminación de tabs tipos-de-documentos de empleados y equipos (Herencia de permisos)

-- Migración: remove_tipos_documentos_empleados_equipos_inheritance
-- Eliminar permisos y tabs de EMPLEADOS
DELETE FROM user_permissions
WHERE tab_id IN (
'20000000-0000-0000-0000-000000000004', -- tipos-de-documentos
'20000000-0000-0000-0000-000000000041' -- tipos-docs-personas (subtab)
);

DELETE FROM role_permissions
WHERE tab_id IN (
'20000000-0000-0000-0000-000000000004', -- tipos-de-documentos
'20000000-0000-0000-0000-000000000041' -- tipos-docs-personas (subtab)
);

DELETE FROM tabs
WHERE id = '20000000-0000-0000-0000-000000000041'; -- tipos-docs-personas

DELETE FROM tabs
WHERE id = '20000000-0000-0000-0000-000000000004' -- tipos-de-documentos
AND module_id = (SELECT id FROM modules WHERE slug = 'empleados');

-- Eliminar permisos y tabs de EQUIPOS
DELETE FROM user_permissions
WHERE tab_id IN (
'30000000-0000-0000-0000-000000000003', -- tipos-de-documentos
'30000000-0000-0000-0000-000000000032' -- tipos-docs-equipos (subtab)
);

DELETE FROM role_permissions
WHERE tab_id IN (
'30000000-0000-0000-0000-000000000003', -- tipos-de-documentos
'30000000-0000-0000-0000-000000000032' -- tipos-docs-equipos (subtab)
);

DELETE FROM tabs
WHERE id = '30000000-0000-0000-0000-000000000032'; -- tipos-docs-equipos

DELETE FROM tabs
WHERE id = '30000000-0000-0000-0000-000000000003' -- tipos-de-documentos
AND module_id = (SELECT id FROM modules WHERE slug = 'equipos');

## Herencia de Permisos - Contratos en Detalle del Cliente

### Eliminación de tab contratos-cliente (Herencia de permisos)

-- Migración: remove_contratos_cliente_tab_inheritance
-- Eliminar permisos de usuario asociados
DELETE FROM user_permissions
WHERE tab_id = '40000000-0000-0000-0000-000000000114';

-- Eliminar permisos de roles asociados
DELETE FROM role_permissions
WHERE tab_id = '40000000-0000-0000-0000-000000000114';

-- Eliminar la tab contratos-cliente
DELETE FROM tabs
WHERE id = '40000000-0000-0000-0000-000000000114'
AND slug = 'contratos-cliente'
AND parent_tab_id = (SELECT id FROM tabs WHERE slug = 'customers' AND module_id = (SELECT id FROM modules WHERE slug = 'comercial'));

## Protección de Vista de Gestión de Permisos de Usuario

### Agregar subtab detalle-usuario (Protección de vista)

-- Migración: add_detalle_usuario_tab
-- Agregar la tab detalle-usuario para proteger la vista de gestión de permisos
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('10000000-0000-0000-0000-000000000143', 'e0478383-1287-4b5e-a727-985baf867173', 'detalle-usuario', 'Detalle de Usuario', 'Vista de gestión de permisos del usuario', 3, '10000000-0000-0000-0000-000000000014', true)
ON CONFLICT (id) DO NOTHING;

**Notas de implementación:**

- La vista de gestión de permisos (`/dashboard/company/actualCompany/user/[id]`) está protegida por el permiso `empresa/detalle-usuario/view`
- El permiso `empresa/detalle-usuario/update` controla si el usuario puede editar (asignar roles o modificar permisos)
- Si solo tiene permiso `view`, puede ver la vista pero todos los controles (checkboxes, botones) están deshabilitados
- Si tiene permiso `update`, puede interactuar completamente con la vista
- Los componentes `RoleSelector` y `ModulePermissions` aceptan un prop `disabled` para deshabilitar todas las interacciones

## Protección de Vista de Detalle de Documento

### Agregar tab detalle-de-documento (Protección de vista)

-- Migración: add_detalle_de_documento_tab
-- Agregar la tab detalle-de-documento para proteger la vista de detalle de documento
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('50000000-0000-0000-0000-000000000005', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'detalle-de-documento', 'Detalle de Documento', 'Vista de detalle de documento', 4, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Subtabs
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, is_active) VALUES
('60000000-0000-0000-0000-000000000008', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'detalle-doc-empresa', 'Empresa', 'Tab de información de empresa en detalle de documento', 1, '50000000-0000-0000-0000-000000000005', true),
('60000000-0000-0000-0000-000000000009', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'detalle-doc-empleado', 'Empleado', 'Tab de información de empleado/equipo en detalle de documento', 2, '50000000-0000-0000-0000-000000000005', true),
('60000000-0000-0000-0000-000000000010', '4783f7df-3580-4f54-bf8f-6ef7f252d038', 'detalle-doc-documento', 'Documento', 'Tab de información del documento en detalle de documento', 3, '50000000-0000-0000-0000-000000000005', true)
ON CONFLICT (id) DO NOTHING;

**Notas de implementación:**

- La vista de detalle de documento (`/dashboard/document/[id]`) está protegida por el permiso `documentacion/detalle-de-documento/view`
- El permiso `documentacion/detalle-de-documento/update` controla si el usuario puede ver y usar la tab "Actualizar"
- Las tabs "Empresa", "Empleado" y "Documento" están protegidas por sus respectivas subtabs con permiso `view`
- La tab "Actualizar" solo se muestra si el usuario tiene permiso `update` en la tab principal
- La página usa `TabsManagerServer` para gestionar las tabs con filtrado por permisos
- Si el usuario no tiene permiso de `view`, se muestra un placeholder de "Sin acceso"

## Protección de Botones de Edición en Detalle de Equipo y Empleado

### Actualizar permisos de subtabs de detalle-equipo y detalle-empleado

-- Migración: update_detalle_subtabs_permissions
-- Eliminar permisos create, update, delete de las subtabs, dejando solo view

**Notas de implementación:**

- El botón "Editar" en el header de detalle de equipo (`vehicle-header.tsx`) está protegido con `PermissionGuard` para el permiso `equipos/detalle-equipo/update`
- El botón "Editar" en el header de detalle de empleado ya estaba protegido con `PermissionGuard` para el permiso `empleados/detalle-empleado/update`
- Las tabs principales `detalle-equipo` y `detalle-empleado` tienen permisos `view` y `update`
- Las subtabs de ambas tabs solo tienen permiso `view`:
  - **detalle-empleado subtabs**: datos-personales, datos-contacto, datos-laborales, diagramas-empleado
  - **detalle-equipo subtabs**: datos-basicos, asignacion, qr-equipo
- La migración SQL elimina cualquier permiso `create`, `update`, `delete` existente en estas subtabs
- El permiso `update` en la tab principal controla la visibilidad del botón "Editar" en el header
