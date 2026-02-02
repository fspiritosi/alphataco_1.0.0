```sql
--- Insertar subtabs para Pedidos de Mantenimiento
-- Subtab 1: Pendientes (pending_scheduling + scheduled)
INSERT INTO tabs (id, slug, name, description, order_index, parent_tab_id, module_id)
VALUES (
  '60000000-0000-0000-0000-000000000211',
  'pedidos_pendientes',
  'Pendientes',
  'Pedidos pendientes de planificar y pendientes de aprobación',
  1,
  '60000000-0000-0000-0000-000000000021',
  '421e96da-5235-4857-bf81-e63336447f13'
)
ON CONFLICT (id) DO NOTHING;

-- Subtab 2: Confirmados (date_confirmed)
INSERT INTO tabs (id, slug, name, description, order_index, parent_tab_id, module_id)
VALUES (
  '60000000-0000-0000-0000-000000000212',
  'pedidos_confirmados',
  'Confirmados',
  'Pedidos con fecha confirmada listos para entrada a taller',
  2,
  '60000000-0000-0000-0000-000000000021',
  '421e96da-5235-4857-bf81-e63336447f13'
)
ON CONFLICT (id) DO NOTHING;

-- Permisos para admin (role_id = 2)
-- action view = 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'
-- action update = '8b70189a-cea5-4e3b-98f4-a76d6447003f'
INSERT INTO role_permissions (role_id, tab_id, action_id)
VALUES
  -- Admin - pedidos_pendientes
  (2, '60000000-0000-0000-0000-000000000211', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'), -- view
  (2, '60000000-0000-0000-0000-000000000211', '8b70189a-cea5-4e3b-98f4-a76d6447003f'), -- update
  -- Admin - pedidos_confirmados
  (2, '60000000-0000-0000-0000-000000000212', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'), -- view
  (2, '60000000-0000-0000-0000-000000000212', '8b70189a-cea5-4e3b-98f4-a76d6447003f')  -- update
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- Agregar nueva subtab "Nuevo Pedido" dentro de maint_operaciones
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000024', '421e96da-5235-4857-bf81-e63336447f13', 'nuevo_pedido', 'Nuevo Pedido', 'Crear pedidos de mantenimiento directamente', 4, '60000000-0000-0000-0000-000000000030')
ON CONFLICT (id) DO NOTHING;

-- Agregar permisos para el rol admin
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000024', a.id
FROM roles r, actions a
WHERE r.slug = 'Administrador' AND a.slug IN ('view', 'create')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
-- Insertar la nueva tab "Órdenes de Trabajo" bajo "Taller"
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '60000000-0000-0000-0000-000000000042',
  '421e96da-5235-4857-bf81-e63336447f13',
  'ordenes_trabajo',
  'Órdenes de Trabajo',
  'Gestión de órdenes de trabajo para taller',
  3,
  '60000000-0000-0000-0000-000000000040'
)
ON CONFLICT (id) DO NOTHING;

-- Permisos para los roles admin (1=super-admin, 2=admin, 9=administrador)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000042'::uuid, a.id
FROM (VALUES (1), (2), (9)) AS r(id)
CROSS JOIN actions a
WHERE a.slug IN ('view', 'create', 'update', 'delete')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
-- Insertar la nueva tab 'Para Taller' en el módulo de Mantenimiento (dentro de maint_operaciones)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000025', '421e96da-5235-4857-bf81-e63336447f13', 'para_taller', 'Para Taller', 'Pedidos con fecha confirmada listos para entrada a taller', 5, '60000000-0000-0000-0000-000000000030')
ON CONFLICT (id) DO NOTHING;

-- Agregar permisos para para_taller (view y update) a roles relevantes
-- Roles: Super Admin (1), Admin (2), Administrador (9), Admin Mantenimiento (16), Usuario Mantenimiento (18)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000025'::uuid, a.id
FROM roles r
CROSS JOIN actions a
WHERE r.id IN (1, 2, 9, 16, 18)
AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- Agregar permisos de maint_operaciones (tab padre) para los mismos roles
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000030'::uuid, a.id
FROM roles r
CROSS JOIN actions a
WHERE r.id IN (1, 2, 9, 16, 18)
AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

-------------------------------------------

✅En el modal Registrar Desvíos el campo de descripcion debe ser opcional, se habilitaran un un boton que indica dejar comentario

✅El redireccionamiento debe ser a https://dev.gh-gestion.com/dashboard/forms/01bcdb07-3340-4868-8df5-7c0289a6c46c en lugar de la respuesta

✅en el modal
Validar Solicitud de Mantenimiento se debe poder ampliar el comentario del chofer (editar el comentario)

✅Se agregó campo validator_comment para comentarios del validador en maintenance_request_items

✅Cuando genero la Orden de trabajo debemos pedir la propiedad (Alta, Media, Baja, Urgente)
✅En el paso "En proceso" debemos dar la opcion de "Pausar"

✅en el modal Detalle de la orden de trabajo los TIPOS DE REPARACION seran los items a completar, es decir cada item es un tipo de reparacion, no es por tipo de reparacion


-✅la vista http://localhost:3000/dashboard/maintenance?subtab=maintenance_requests&tab=maint_taller no se refresca, tenemos que revalidar la query

-✅en la tabla "Órdenes de Trabajo
Gestión de órdenes de trabajo asignadas a talleres" mostrar la prioridad

-✅en el modal "Detalle de la orden de trabajo" primero poder marcarlas y luego completarlas, para evitar missclick

-✅dejar guardado quien pausa la oorden de trabajo en el modal "Detalle de la orden de trabajo"

-si todas las tareas estan completas ocultar el boton TAMBIEN EL DE CANCELAR, solo el de completar la orden

-✅Si al menos una de las tareas fue completada debemos reemplazar el boton Cancelar orden por "Finalizar con pendientes" que debe permitir cerrar la orden con tareas pendiente (para poder volver a tener operativo el equipo)

-✅en el modal Detalle de la orden de trabajo En las completadas tenemos que contabilizar el tiempo total real (descontando el tiempo pausado) y mostrarlo de manera legible

-✅en la tab PARA TALLER mostrar los registros de las que tienen fecha a probada es decir que ya estan en el taller

-✅Arreglar el modal Configure la asignación para este desvío (muestras las OT al lado de la seccino)

-✅Mostrar la disponibilidad del sector cuando se intente asignar al taller, debe permitir asignar, incluso se si supera el cupo, solamente es a modo AVISO, indicar visualmente si superamos el limite o no. debe permitir si esta lleno el cupo, solo avisar que esta lleno (Asignar Taller y Período)

------Dudas 27/01/2026------

DUDAS:
TALLER: En en detalle "Detalle de la orden de trabajo" Completamos la orden automaticamente cuando todas las tareas estan completas?

TALLER: Las ordenes de trabajo canceladas en cada paso donde la mostramos?

GLOBAL: El historial de la solicitud donde lo mostramos?

OPERACIONES: las rechazadas en el modal "Validar Solicitud de Mantenimiento" donde las mostramos?

TALLER: En el modal "Detalle de la orden de trabajo" cuando finalizo con pendientes que deberia hacer con las tareas pendientes?

Porpuesta de mejora: Configuracion/tipos de reparacion -> Dejarla como lista de tareas posibles a ejecutar, asignar la tarea a sectores de talleres, luego crear arlbol de tarea, una tarea puede tener tareas hijas

------Ajustes 28/01/2026------

-✅Filtras las solicitudes segun supervisor (los supervisores pueden ver solo sus asignadas, tenemos que crear el nuevo role, se llama "Supervisor de Operaciones" esta creado en DEV(USAR el MCP de supabase para mirarlo y recrearlo en local y guardar la query en el archivo notas de los insert para replicarlo en PROD luego)) este es el role que tiene que aparecer al momento de seleccionar un supervisor en el modal de crear desvios justo despues de responder un checklist con errores, la idea es que durante TODA LA TAB Y SUBTABS debemos mostrar solamente las solicitudes asignadas al supervisor que esta logueado, es decir, que si las solicitudes o registros dentro de TODAS LAS TABS EN OPERACIONES en el modulo manteneimento deben estar asignados al usuario logueado si no estan asignadas a el no deben mostrarse

### SQL para replicar rol "Supervisor de Operaciones" en PROD:
```sql
-- Rol "Supervisor de Operaciones"
INSERT INTO roles (id, name, is_active, intern, color, description, is_system, slug)
VALUES (20, 'Supervisor de Operaciones', true, false, '#386a80', '', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Permisos del rol (74 permisos - consultar DEV si se necesitan más detalles)
-- Los permisos incluyen acceso a: Empleados, Documentos, Diagramas, Equipos,
-- Mantenimiento (Operaciones, Solicitudes, Pedidos, Para Taller), Partes Diarios, Formularios
``` 

-✅El guardado de fechas a veces me muestra un dia antes, aparece un dia antes en el modal, es decir si en el modal de generar la OT guardo el registro pero sin generar la OT al volver a abrirlo me aparece un dia antes, formatea las fechas con momentjs para arreglar esto

En la tab para taller mostrar el detalle, tambien la fecha en la que entro al taller aparece un dia antes

-✅El el flujo de manteniemiento debemos proteger los siguientes botones con nuestro sistema de permisos y roles, tambien tenemos que agregar estas acciones a los permisos y roles para poder permitir esas acciones:
botones a proteger por permisos:
Boton de iniicar la orden de trabajo en el modal, el de la tabla tambien
Boton de check, pausar, cancelar orden
boton de entrada al taller tambien 
Boton de planificar la fecha
Boton de asignar a taller
Boton de aprobar fecha propuesta

------Ajustes 28/01/2026------

-✅Modificacion en los modales del flujo de mantenimiento: En los modales de detalle mostrar QUIEN hizo la accion, es decir nosotros tenemos un flujo de mantenimiento que tienes que analziar, en ese flujo que empieza con una solicitud de manteniemtio y va navegando por el flujo (tabs), cada accion debe tener un usuario que la hizo, mostrar ese usuario en el modal de detalle, por ejemplo, el aprobar una solicitud, el aprobar una fecha propuesta, el asignar a taller, el iniciar la orden de trabajo, pausar, cancelar orden, entrada al taller,quien puso el comentario, etc. Alguna de estas cosas ya las tenemos, otras faltan, haz una lista para saber que rastrearemos porque solo lo relevante tenemos que rastrear, como esas cosas que mencione, o si ya tenemos un historial o tabla de historial que actualmente no se muestra y ahi se guarda todo podemos integar esa tabla al flujo de la solicitud y ahi poder ver todos estos detalles, analiza ambas cosas para que sepas cual es lo mas conveniente

-✅Revisar y si es necesario corregir esta validacion: Cuando una solicitud de mantenimiento va a entrar el equipo al taller el modal de ingreso al taller pide un Kilometraje, que por defecto tiene el valor que se envio en el checklist, y el checklist por defecto tiene el valor de kilometer que tiene el equipo, es decir se mantiene el valor del kilometraje, la idea es que en esos pasos NO se pueda asigar un valor inferir al actual del equipo, (algunos estan en 0 porque el dato aun no se ha actualizado) pero si tiene 100km en esos pasos de checklist y de entrada al taller no se le puede asignar uno menor a 100km, entiendes?

-✅Ajuste en el modulo mantenimiento tab de operaciones: En esa tab tenemos un filtro de TODAS las solicitudes, las cuales se filtran segun el supervisor, para solo ver las que tiene asignada cada uno, pero hay una exepcion para los usuarios con roles de sistema, los cuales deberian ver todas sin el filtro de supervisor, la idea es migrar esta exepcion de un role a un permiso, es decir asi como en las tabs tenemos acciones tenemos que agregar una (si el sistema actual lo permite) accion que permita "ver todas las solicitudes" y los usuarios con es permiso puedan ver todas las solicitudes, tienes que actualizar la tabla de permisos en el backend y el mappeo de permisos, tambienr evisa la implementacion de CRUD de roles y permisos para revisar que todo quede funcionando y compatible, pero la idea es que ya no aplique a los usuarios con rol de sistema sino que el permiso defina que vera el usuario


-✅Modificacion al funcionamiento de la TAB Nuevo Pedido en el modulo de mantenimiento, El objetivo de esa tab es poder crear un pedido de mantenimiento, el cual debe aparecer diracamente en la tab MODULO MANTENIMIENTO/Taller/Pedidos de Mantenimiento/Pendientes 
salteandose el proceso de aprobacion deberia generarse directamente el pedido en esa tab (para continuar el flujo normal)
Entonces la idea es que desde esta tab se pidan todos los datos necesarios para poder lograrlo (actualmente todo este flujo esta automatizado desde el checklist, pero tenemos que poder generar el pedido desde fuera del checklist como en esta tab) la idea es que nos pida elegir el equipo, ese equipo tiene cheklist asginados, tenemos que traerlos las secciones/items del chelist y mappearlos para que el usuario cuales de los items tienen desvios y poder asignarles un comentario y supervisor como en el modal que se abre al intentar resolver los devios, y que salteen el paso de aprobacion estando directamente todos aprobados o generados, analiza el flujo para que entiendas a lo que me refiero, pero la idea es esa, que desde ahi se puead hacer todo esto que indico, recuerda proteger los botones de acciones, con el permiso create en esa tab

✅skills en lugar de claude.md referenciando en el archivo skills.md



✅En la tab Nuevo Pedido en el paso de supervisor tenemos que dar la opcion de elegir si la persona actual es el supervisor, para crear el registro a nombre de ese usuario como supervisor, en caso de no ser supervisor el registro solamente debe viajar a la tab PENDIENTES DE VALIDAR


revisar flujo desde /maintenance para ver si se guarda correctamente el empleado como chofer, 
MODULO de ayuda, subir videos y mappeo de modulos y tabs
