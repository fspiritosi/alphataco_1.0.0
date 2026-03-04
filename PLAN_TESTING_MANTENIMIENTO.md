# Plan de Testing Exhaustivo - Flujo de Mantenimiento/Checklist

**Fecha**: 2026-02-12
**Estado**: EN PROGRESO
**Usuario de prueba**: yordanpz@hotmail.com
**Taller**: Taller Añelo (interno)
**Sectores**: Mecánica General (cap:5), Electricidad (cap:3), Chapa y Pintura (cap:4)

---

## RESUMEN DEL FLUJO COMPLETO

```
1. DESVÍOS DE CHECKLIST → equipments_with_pending_deviations
   ↓
2. SOLICITUD DE MANTENIMIENTO → maintenance_requests (pending_approval)
   ↓ [Admin aprueba/rechaza items]
3. PEDIDO DE MANTENIMIENTO → maintenance_orders (pending_scheduling)
   ↓ [Planificador asigna fecha, tipos de reparación, sectores]
4. PEDIDO PROGRAMADO → maintenance_orders (scheduled)
   ↓ [Operaciones aprueba fecha]
5. PEDIDO CONFIRMADO → maintenance_orders (date_confirmed)
   ↓ [Ingreso al taller]
6. EN TALLER → maintenance_orders (in_workshop) + work_orders creadas
   ↓ [Operarios trabajan las OTs]
7. OPERARIO EJECUTA → work_orders (in_progress) → repairs completados
   ↓ [Operario cierra OT]
8. OT CERRADA → work_orders (completed/completed_partial)
   ↓ [Todas las OTs cerradas → pedido listo]
9. VALIDACIÓN → maintenance_orders (pending_workshop_validation)
   ↓ [Jefe de taller valida]
10. COMPLETADO → maintenance_orders (completed)
```

---

## SECCIÓN A: VISTA ADMIN - OPERACIONES

### A1. TAB "Equipos con Desvíos"

| #    | Test Case                           | Pasos                                                       | Esperado                                                                                                                   | Status |
| ---- | ----------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1.1 | Ver equipos con desvíos pendientes  | Navegar a Mantenimiento > Operaciones > Equipos con Desvíos | Lista de equipos con checklist_deviations status='pending'. Columnas: Dominio/Serie, Tipo, Cantidad Desvíos, Último Desvío | ⬜     |
| A1.2 | Botón "Resolver Desvíos" abre modal | Click en "Resolver Desvíos" en un equipo                    | Se abre CriticalDeviationsRepairModal con lista de desvíos del equipo                                                      | ⬜     |
| A1.3 | Modal requiere supervisor           | Intentar enviar sin seleccionar supervisor                  | Validación: supervisor obligatorio                                                                                         | ⬜     |
| A1.4 | Crear solicitud desde desvíos       | Seleccionar supervisor, agregar comentarios, enviar         | Se crea maintenance_request con status='pending_approval' y maintenance_request_items                                      | ⬜     |
| A1.5 | Equipo desaparece de la lista       | Después de crear solicitud                                  | El equipo ya no aparece en "Equipos con Desvíos" (desvíos ya no están pending)                                             | ⬜     |
| A1.6 | Solicitud aparece en siguiente tab  | Verificar tab "Solicitudes"                                 | La solicitud recién creada aparece con status "Pendiente de Aprobación"                                                    | ⬜     |

### A2. TAB "Solicitudes de Mantenimiento"

| #     | Test Case                            | Pasos                                                        | Esperado                                                                                                                   | Status |
| ----- | ------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| A2.1  | Ver solicitudes pendientes           | Navegar a tab Solicitudes                                    | Lista con solicitudes status='pending_approval' y 'rejected'. Columnas: Equipo, Fecha, Items, Chofer, Estado               | ⬜     |
| A2.2  | Ver detalle de solicitud             | Click en botón "Ver" (ojo)                                   | SolicitudDetailDialog: Info general (equipo, estado, chofer, km), lista de desvíos con código, label, sección, comentarios | ⬜     |
| A2.3  | Aprobar TODOS los items              | Click "Aprobar", marcar todos como "Aprobar", enviar         | Solicitud → approved. Se crea maintenance_order con status='pending_scheduling'. Items → approved                          | ⬜     |
| A2.4  | Rechazar TODOS los items             | Click "Rechazar", seleccionar todos, escribir motivo, enviar | Solicitud → rejected. Items → rejected. Motivo guardado en cada item. Desvíos vuelven a "Equipos con Desvíos"              | ⬜     |
| A2.5  | Aprobar ALGUNOS, rechazar OTROS      | Click "Aprobar", aprobar 2 items, rechazar 1 con motivo      | Solicitud → approved. Se crea maintenance_order solo con items aprobados. Item rechazado queda en 'rejected'               | ⬜     |
| A2.6  | Rechazar sin motivo falla            | Marcar item como "Rechazar" sin escribir motivo              | Validación: motivo obligatorio para items rechazados                                                                       | ⬜     |
| A2.7  | Todos los items deben tener decisión | Dejar algún item sin decisión                                | Validación: todos los items deben tener decisión (aprobar/rechazar)                                                        | ⬜     |
| A2.8  | Comentario del validador             | Agregar comentario del validador a un item                   | Comentario guardado. Visible en detalle posterior                                                                          | ⬜     |
| A2.9  | Items críticos separados visualmente | Verificar UI de aprobación                                   | Items con is_critical=true aparecen separados con border-destructive                                                       | ⬜     |
| A2.10 | Historial de actividad               | Click botón "Historial"                                      | ActivityHistoryModal con timeline de cambios                                                                               | ⬜     |
| A2.11 | Filtro de supervisor                 | Verificar que solo vea solicitudes asignadas (según rol)     | Si no tiene rol de sistema, solo ve solicitudes donde supervisor_id = su user_id                                           | ⬜     |
| A2.12 | Solicitud rechazada parcialmente     | Rechazar solo 1 de 3 items                                   | Solicitud sigue en 'pending_approval'. Item rechazado en 'rejected'. Los 2 restantes siguen 'pending'                      | ⬜     |
| A2.13 | Invalidación de queries              | Después de aprobar/rechazar                                  | Se refrescan: maintenance-requests, maintenance-orders, equipments-with-deviations                                         | ⬜     |

### A3. TAB "Pendientes de Ejecutar"

| #    | Test Case                                       | Pasos                                       | Esperado                                                                                                             | Status |
| ---- | ----------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| A3.1 | Ver pedidos pendientes                          | Navegar a tab                               | Pedidos con status 'scheduled' y 'date_confirmed'. Columnas: Equipo, Fecha Planificada, Items, Estado, Condición, Km | ⬜     |
| A3.2 | Indicadores de fecha                            | Verificar badges de fecha                   | Hoy: verde, Mañana: amarillo, Vencido: rojo                                                                          | ⬜     |
| A3.3 | Aprobar fecha (scheduled → date_confirmed)      | Click "Aprobar Fecha" en pedido 'scheduled' | Dialog con info del equipo y fecha. Confirmar → status='date_confirmed'. Guarda date_approved_by/at                  | ⬜     |
| A3.4 | Rechazar fecha (scheduled → pending_scheduling) | Click "Rechazar Fecha", escribir motivo     | Status → 'pending_scheduling'. Borra scheduled_date/by/at. Guarda rejection info. Pedido vuelve a Planificación      | ⬜     |
| A3.5 | Rechazar sin motivo falla                       | Intentar rechazar sin motivo                | Validación: motivo obligatorio                                                                                       | ⬜     |
| A3.6 | Solo 'scheduled' tiene botones aprobar/rechazar | Verificar pedido 'date_confirmed'           | No debe tener botones de aprobar/rechazar fecha                                                                      | ⬜     |
| A3.7 | Permisos PermissionGuard                        | Verificar que botones estén protegidos      | PermissionGuard module="mantenimiento" tab="pendientes_ejecutar" action="update"                                     | ⬜     |
| A3.8 | Ver detalle del pedido                          | Click "Ver"                                 | PendienteDetailDialog con info del pedido, equipo, items con tipos de reparación                                     | ⬜     |
| A3.9 | Ordenamiento                                    | Verificar orden de la tabla                 | 'scheduled' primero, luego 'date_confirmed', por fecha ascendente                                                    | ⬜     |

---

## SECCIÓN B: VISTA ADMIN - TALLER

### B1. TAB "Planificación" / "Pedidos Pendientes"

| #    | Test Case                                  | Pasos                                         | Esperado                                                                   | Status |
| ---- | ------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| B1.1 | Ver pedidos pending_scheduling             | Navegar a Taller > Pedidos Pendientes         | Pedidos con status='pending_scheduling'                                    | ⬜     |
| B1.2 | Asignar tipos de reparación                | Seleccionar tipo de reparación para cada item | Tipos de reparación asignados a maintenance_order_items                    | ⬜     |
| B1.3 | Asignar sectores del taller                | Asignar sector a cada item                    | maintenance_order_items.assigned_sector_id actualizado                     | ⬜     |
| B1.4 | Programar fecha                            | Seleccionar fecha planificada, confirmar      | Status → 'scheduled'. scheduled_date, scheduled_by, scheduled_at guardados | ⬜     |
| B1.5 | Pedido aparece en "Pendientes de Ejecutar" | Después de programar                          | Pedido visible en tab de operaciones con status 'scheduled'                | ⬜     |
| B1.6 | Pedido rechazado vuelve aquí               | Rechazar fecha desde Pendientes de Ejecutar   | Pedido reaparece con status='pending_scheduling', sin fecha                | ⬜     |

### B2. TAB "Para Taller" / Ingreso al Taller

| #    | Test Case                        | Pasos                                 | Esperado                                                                                        | Status |
| ---- | -------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| B2.1 | Ver pedidos listos para ingresar | Navegar a Para Taller                 | Pedidos con status='date_confirmed'                                                             | ⬜     |
| B2.2 | Confirmar ingreso al taller      | Aprobar ingreso, ingresar kilometraje | Status → 'in_workshop'. workshop_entry_date, workshop_approved_by, kilometer_at_entry guardados | ⬜     |
| B2.3 | Creación de Work Orders          | Verificar después del ingreso         | Se crean work_orders por sector (1 WO por sector con items asignados). Status='pending'         | ⬜     |
| B2.4 | Work Order Items creados         | Verificar en DB                       | work_order_items creados con referencia a maintenance_order_items                               | ⬜     |
| B2.5 | Work Order Item Repairs creados  | Verificar en DB                       | work_order_item_repairs con tipos de reparación asignados                                       | ⬜     |

### B3. TAB "Seguimiento en Taller"

| #    | Test Case                       | Pasos                                    | Esperado                                      | Status |
| ---- | ------------------------------- | ---------------------------------------- | --------------------------------------------- | ------ |
| B3.1 | Ver estado de pedidos en taller | Navegar a Seguimiento                    | Pedidos in_workshop con progreso de WOs       | ⬜     |
| B3.2 | Progreso actualizado            | Después de que operario complete repairs | Progreso refleja repairs completados vs total | ⬜     |

### B4. TAB "Gestión de Órdenes"

| #    | Test Case                      | Pasos                            | Esperado                                                         | Status |
| ---- | ------------------------------ | -------------------------------- | ---------------------------------------------------------------- | ------ |
| B4.1 | Ver órdenes de trabajo activas | Navegar a Gestión de Órdenes     | Lista de work_orders con sus estados                             | ⬜     |
| B4.2 | Pausar OT                      | Click "Pausar" en OT in_progress | Status → 'paused'. paused_by/at y pause_reason guardados         | ⬜     |
| B4.3 | Reanudar OT                    | Click "Reanudar" en OT pausada   | Status → 'in_progress'. total_paused_time acumulado              | ⬜     |
| B4.4 | Cancelar OT                    | Click "Cancelar" con motivo      | Status → 'cancelled'. Items desvinculados (work_order_id = NULL) | ⬜     |

### B5. TAB "Bandeja de Aprobaciones"

| #    | Test Case                           | Pasos                                                 | Esperado                                                                   | Status |
| ---- | ----------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| B5.1 | Ver tareas pendientes de aprobación | Navegar a Bandeja                                     | Repairs con status='pending_approval' (tipos autorizables)                 | ⬜     |
| B5.2 | Aprobar tarea autorizable           | Click "Aprobar"                                       | Status → 'pending'. approved_by/at guardados. Operario puede trabajarla    | ⬜     |
| B5.3 | Rechazar tarea autorizable          | Click "Rechazar" con motivo                           | Status → 'rejected'. rejection_reason guardado                             | ⬜     |
| B5.4 | Ver tareas devueltas                | Verificar repairs con status='reassignment_requested' | Visible con motivo de devolución del operario                              | ⬜     |
| B5.5 | Reasignar tarea devuelta            | Seleccionar nuevo sector, confirmar                   | Status → 'pending'. maintenance_order_items.assigned_sector_id actualizado | ⬜     |

---

## SECCIÓN C: PANEL DE OPERARIOS

### C0. Login y Autenticación

| #    | Test Case                      | Pasos                                                          | Esperado                                                   | Status |
| ---- | ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| C0.1 | Login correcto                 | Ir a /operator/login, ingresar yordanpz@hotmail.com + password | Redirect a /operator/dashboard                             | ⬜     |
| C0.2 | Login con usuario sin empleado | (Preparar usuario sin employee_id)                             | Error: "Tu usuario no tiene un empleado vinculado"         | ⬜     |
| C0.3 | Login con empleado sin sector  | (Preparar empleado sin workshop_sector_id)                     | Error: "Tu empleado no tiene un sector de taller asignado" | ⬜     |
| C0.4 | Cookie de empresa seteada      | Verificar después del login                                    | Cookie 'actualComp' con company_id del empleado            | ⬜     |
| C0.5 | Protección de rutas            | Acceder a /operator/dashboard sin login                        | Redirect a /operator/login                                 | ⬜     |

### C1. Dashboard - Lista de OTs

| #     | Test Case                                   | Pasos                                       | Esperado                                                                 | Status |
| ----- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| C1.1  | Ver solo OTs de mi sector                   | Verificar lista                             | Solo work_orders donde sector_id = mi workshop_sector_id                 | ⬜     |
| C1.2  | OTs bloqueadas visibles pero no clickeables | Verificar OT con sector anterior incompleto | Overlay con lock icon + "Esperando {sector anterior}". No se puede abrir | ⬜     |
| C1.3  | OTs no bloqueadas clickeables               | Click en OT activa (no bloqueada)           | Navega a detalle /operator/work-order/[id]                               | ⬜     |
| C1.4  | Filtro "Todas"                              | Seleccionar filtro "all"                    | Muestra todas las OTs (activas + bloqueadas)                             | ⬜     |
| C1.5  | Filtro "Activas"                            | Seleccionar filtro "active"                 | Solo OTs no bloqueadas y no completadas                                  | ⬜     |
| C1.6  | Filtro "Bloqueadas"                         | Seleccionar filtro "blocked"                | Solo OTs bloqueadas por secuencia de sector                              | ⬜     |
| C1.7  | Filtro "Completadas"                        | Seleccionar filtro "completed"              | Solo OTs completed/completed_partial                                     | ⬜     |
| C1.8  | Búsqueda por número de orden                | Escribir número de OT                       | Filtra por order_number                                                  | ⬜     |
| C1.9  | Búsqueda por dominio                        | Escribir dominio del equipo                 | Filtra por domain del vehículo                                           | ⬜     |
| C1.10 | Badge de diagnóstico                        | Verificar OT con diagnóstico pendiente      | Badge amarillo con ícono de estetoscopio                                 | ⬜     |
| C1.11 | Progreso en card                            | Verificar barra de progreso                 | Muestra X/Y repairs completados como porcentaje                          | ⬜     |
| C1.12 | Prioridad visual                            | Verificar ordenamiento                      | Ordenadas por prioridad (urgent > high > medium > low), luego por fecha  | ⬜     |
| C1.13 | Cambiar sector del empleado y verificar     | Cambiar workshop_sector_id en DB, re-login  | Ve OTs del NUEVO sector, no del anterior                                 | ⬜     |

### C2. Detalle de OT - Iniciar Trabajo

| #    | Test Case                        | Pasos                                        | Esperado                                                                | Status |
| ---- | -------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| C2.1 | Ver detalle de OT pending        | Click en OT con status='pending'             | Header con orden#, estado, prioridad. Botón "Iniciar OT" visible        | ⬜     |
| C2.2 | Iniciar OT exitosamente          | Click "Iniciar OT"                           | Status → 'in_progress'. started_at guardado. UI se actualiza            | ⬜     |
| C2.3 | Iniciar OT bloqueada falla       | Intentar iniciar OT bloqueada por secuencia  | Error: "No se puede iniciar: el sector {X} no ha completado sus tareas" | ⬜     |
| C2.4 | No puede editar antes de iniciar | Verificar OT pending                         | Checkboxes de repairs deshabilitados o no visibles antes de iniciar     | ⬜     |
| C2.5 | Seguridad: solo mi sector        | Intentar acceder a OT de otro sector vía URL | Redirect a dashboard (query filtra por sector_id)                       | ⬜     |

### C3. Detalle de OT - Diagnóstico

| #    | Test Case                        | Pasos                                              | Esperado                                                                                                                  | Status |
| ---- | -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| C3.1 | Diagnóstico bloquea otras tareas | Verificar OT con is_diagnostico=true no completado | Banner amarillo: "Complete el DIAGNÓSTICO antes de continuar". Resto de tareas con opacity reducida y pointer-events-none | ⬜     |
| C3.2 | Completar diagnóstico desbloquea | Marcar checkbox del diagnóstico                    | Banner desaparece. Resto de tareas habilitadas                                                                            | ⬜     |
| C3.3 | Diagnóstico aparece primero      | Verificar orden                                    | DiagnosticoCard siempre arriba, antes de las tareas regulares                                                             | ⬜     |
| C3.4 | Notas en diagnóstico             | Agregar notas técnicas al diagnóstico              | Notas guardadas correctamente                                                                                             | ⬜     |

### C4. Detalle de OT - Completar Repairs

| #    | Test Case                                 | Pasos                                             | Esperado                                                               | Status |
| ---- | ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| C4.1 | Marcar repair como completado             | Click checkbox de un repair                       | Status → 'completed'. completed_at/by guardados                        | ⬜     |
| C4.2 | Desmarcar repair completado               | Click checkbox de repair completado               | Status → 'in_progress'. completed_at/by borrados                       | ⬜     |
| C4.3 | Progreso se actualiza                     | Completar un repair                               | Counter X/Y se actualiza. Barra de progreso cambia                     | ⬜     |
| C4.4 | Notas de técnico                          | Expandir sección notas, escribir, salir del campo | Notas guardadas al blur. Indicador "Guardando..." visible              | ⬜     |
| C4.5 | Badges de criticidad                      | Verificar repairs con diferentes criticidades     | Badges: crítica (rojo), alta (naranja), media (amarillo), baja (verde) | ⬜     |
| C4.6 | Badge "Autorizable"                       | Verificar repair con tipo autorizable             | Badge especial "Autorizable" visible                                   | ⬜     |
| C4.7 | Badge "Agregado por operario"             | Verificar repair con is_operator_added=true       | Badge "Agregado por operario" visible                                  | ⬜     |
| C4.8 | Repair pending_approval no editable       | Verificar repair esperando aprobación             | Checkbox deshabilitado. Badge "Pendiente de aprobación"                | ⬜     |
| C4.9 | Repair reassignment_requested no editable | Verificar repair devuelto                         | Checkbox deshabilitado. Badge "Devolución solicitada"                  | ⬜     |

### C5. Detalle de OT - Devolver Tarea

| #    | Test Case                               | Pasos                                                    | Esperado                                                                           | Status |
| ---- | --------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| C5.1 | Botón devolver visible                  | Verificar repair no completado ni devuelto ni bloqueado  | Botón "Devolver tarea" visible con ícono RotateCcw                                 | ⬜     |
| C5.2 | Devolver con motivo válido              | Click "Devolver", escribir motivo (≥10 chars), confirmar | Status → 'reassignment_requested'. return_reason guardado. Toast: "Tarea devuelta" | ⬜     |
| C5.3 | Devolver con motivo corto falla         | Escribir motivo <10 caracteres                           | Error: "El motivo debe tener al menos 10 caracteres"                               | ⬜     |
| C5.4 | Repair devuelto aparece con badge       | Verificar UI después de devolver                         | Badge rojo "Devolución solicitada". Checkbox deshabilitado                         | ⬜     |
| C5.5 | No se puede devolver repair completado  | Verificar repair completado                              | Botón "Devolver" no visible                                                        | ⬜     |
| C5.6 | Tarea devuelta aparece en Bandeja Admin | Verificar en vista admin                                 | Repair visible en Bandeja de Aprobaciones para reasignar                           | ⬜     |

### C6. Detalle de OT - Agregar Tarea

| #    | Test Case                                  | Pasos                                                     | Esperado                                                                                    | Status |
| ---- | ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| C6.1 | Abrir diálogo agregar tarea                | Click "Agregar Tarea"                                     | AddTaskDialog con 2 pestañas: "Mi Sector" y "Otro Sector"                                   | ⬜     |
| C6.2 | Agregar tarea Mi Sector (no autorizable)   | Seleccionar tipo no autorizable, describir, confirmar     | Nuevo work_order_item + work_order_item_repair con status='pending'. is_operator_added=true | ⬜     |
| C6.3 | Agregar tarea Mi Sector (autorizable)      | Seleccionar tipo autorizable, describir, confirmar        | Repair con status='pending_approval'. Toast indica que requiere aprobación                  | ⬜     |
| C6.4 | Solo tipos del sector disponibles          | Verificar dropdown en "Mi Sector"                         | Solo tipos de reparación de sector_repair_types del sector actual. Sin "Diagnóstico"        | ⬜     |
| C6.5 | Agregar tarea Otro Sector                  | Tab "Otro Sector", seleccionar tipo, describir, confirmar | Crea maintenance_order_item SIN assigned_sector_id. Jefe debe asignar                       | ⬜     |
| C6.6 | Todos los tipos disponibles en Otro Sector | Verificar dropdown                                        | Todos los tipos de reparación disponibles (sin filtro de sector)                            | ⬜     |
| C6.7 | Tarea agregada visible en lista            | Después de agregar                                        | Nuevo repair aparece en la lista de tareas de la OT                                         | ⬜     |

### C7. Cerrar Orden de Trabajo

| #    | Test Case                              | Pasos                                         | Esperado                                                                      | Status |
| ---- | -------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| C7.1 | Abrir diálogo cerrar OT                | Click "Cerrar OT"                             | CloseWorkOrderDialog con resumen: completadas, pendientes, devueltas          | ⬜     |
| C7.2 | Cerrar OT con todo completado          | Todas las repairs completed, confirmar cierre | Status → 'completed'. completed_at/by guardados                               | ⬜     |
| C7.3 | Cerrar OT con pendientes (parcial)     | Algunas repairs pending, confirmar cierre     | Status → 'completed_partial'. Advertencia amarilla visible antes de confirmar | ⬜     |
| C7.4 | Advertencia de pendientes              | Verificar UI con pendientes                   | Banner: "Esta OT se cerrará con X tarea(s) pendiente(s)"                      | ⬜     |
| C7.5 | Notas de cierre opcionales             | Agregar notas de cierre                       | Notas guardadas en work_orders.notes                                          | ⬜     |
| C7.6 | Redirect a dashboard después de cerrar | Después de confirmar cierre                   | Navegación a /operator/dashboard. OT aparece en "Completadas"                 | ⬜     |
| C7.7 | Última OT cierra la OM                 | Cerrar la última WO de una maintenance_order  | maintenance_order.status → 'pending_workshop_validation' (o 'completed')      | ⬜     |
| C7.8 | No es la última OT                     | Cerrar una WO cuando hay otras pendientes     | maintenance_order sigue en 'in_workshop'. Solo la WO cerrada cambia           | ⬜     |

---

## SECCIÓN D: FLUJOS DE DESVIACIÓN

### D1. Rechazo en cada etapa

| #    | Test Case                     | Pasos                                     | Esperado                                                                                | Status |
| ---- | ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| D1.1 | Rechazar solicitud completa   | Rechazar todos los items de una solicitud | Solicitud → 'rejected'. Desvíos vuelven a "Equipos con Desvíos"                         | ⬜     |
| D1.2 | Rechazar parcial de solicitud | Rechazar 1 de 3 items                     | Item rechazado → 'rejected'. Solicitud sigue 'pending_approval'. Otros items sin cambio | ⬜     |
| D1.3 | Rechazar fecha programada     | Rechazar desde "Pendientes de Ejecutar"   | Pedido → 'pending_scheduling'. Vuelve a Planificación sin fecha                         | ⬜     |
| D1.4 | Cancelar OT                   | Cancelar work_order                       | OT → 'cancelled'. Items desvinculados. ¿Qué pasa con el pedido?                         | ⬜     |
| D1.5 | Rechazar tarea autorizable    | Rechazar desde Bandeja                    | Repair → 'rejected'. No aparece más en la OT del operario                               | ⬜     |
| D1.6 | Devolver tarea (operario)     | Operario devuelve repair                  | Repair → 'reassignment_requested'. Admin debe reasignar                                 | ⬜     |
| D1.7 | Reasignar tarea devuelta      | Admin reasigna a otro sector              | Repair → 'pending'. Nuevo sector asignado. ¿Aparece en nueva OT?                        | ⬜     |

### D2. Cancelaciones

| #    | Test Case                            | Pasos                               | Esperado                                                           | Status |
| ---- | ------------------------------------ | ----------------------------------- | ------------------------------------------------------------------ | ------ |
| D2.1 | Cancelar OT con repairs en progreso  | OT in_progress, cancelar            | OT → 'cancelled'. Repairs quedan en estado actual? Se desvinculan? | ⬜     |
| D2.2 | Cancelar repair individual           | Cancelar un repair específico       | Repair → 'cancelled'. Se recalcula estado del WO item              | ⬜     |
| D2.3 | Efecto de cancelar en progreso total | Cancelar repair, verificar progreso | Progreso X/(Y-1) (repair cancelado no cuenta) o X/Y?               | ⬜     |

### D3. Flujo de Diagnóstico

| #    | Test Case                                         | Pasos                             | Esperado                                            | Status |
| ---- | ------------------------------------------------- | --------------------------------- | --------------------------------------------------- | ------ |
| D3.1 | OT con diagnóstico: completar diag primero        | Intentar completar tarea regular  | Bloqueado por diagnóstico pendiente                 | ⬜     |
| D3.2 | OT con diagnóstico: completar diag y luego tareas | Completar diag, luego tareas      | Flujo normal después de completar diagnóstico       | ⬜     |
| D3.3 | OT sin diagnóstico                                | Verificar OT sin is_diagnostico   | Sin banner de bloqueo. Todas las tareas disponibles | ⬜     |
| D3.4 | Desmarcar diagnóstico re-bloquea                  | Desmarcar checkbox de diagnóstico | Resto de tareas se bloquean de nuevo                | ⬜     |

### D4. Secuencia de Sectores

| #    | Test Case                               | Pasos                                      | Esperado                                                    | Status |
| ---- | --------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- | ------ |
| D4.1 | Sector 1 (seq=1) no bloqueado           | Verificar OT del primer sector             | No bloqueada, puede iniciar                                 | ⬜     |
| D4.2 | Sector 2 (seq=2) bloqueado por sector 1 | Verificar OT del segundo sector            | Bloqueada: "Esperando Mecánica General" (o sector anterior) | ⬜     |
| D4.3 | Completar sector 1 desbloquea sector 2  | Cerrar OT del sector 1, verificar sector 2 | OT del sector 2 ya no bloqueada                             | ⬜     |
| D4.4 | Sector 3 (seq=3) bloqueado              | Verificar con sector 1 incompleto          | Bloqueada por sector 1                                      | ⬜     |
| D4.5 | Completed_partial desbloquea            | Cerrar sector 1 como partial               | ¿Sector 2 se desbloquea con completed_partial? Verificar    | ⬜     |

---

## SECCIÓN E: VERIFICACIONES DE UI

### E1. Actualización en Tiempo Real

| #    | Test Case                                  | Pasos                                              | Esperado                                                        | Status |
| ---- | ------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------- | ------ |
| E1.1 | Admin ve cambio después de acción operario | Operario completa repair, admin refresca           | Progreso actualizado en vista admin                             | ⬜     |
| E1.2 | Operario ve tarea aprobada                 | Admin aprueba tarea autorizable, operario refresca | Repair pasa de pending_approval a pending (checkbox habilitado) | ⬜     |
| E1.3 | Invalidación de queries funciona           | Realizar acción, verificar que datos se refrescan  | Sin necesidad de F5 manual                                      | ⬜     |

### E2. Diseño y UX

| #    | Test Case                     | Verificar                                 | Status |
| ---- | ----------------------------- | ----------------------------------------- | ------ |
| E2.1 | Responsive del panel operario | Vista en móvil y desktop                  | ⬜     |
| E2.2 | Badges de estado consistentes | Colores y textos correctos en toda la app | ⬜     |
| E2.3 | Loading states                | Skeletons y spinners durante carga        | ⬜     |
| E2.4 | Toasts de confirmación        | Después de cada acción exitosa            | ⬜     |
| E2.5 | Mensajes de error claros      | Después de cada acción fallida            | ⬜     |
| E2.6 | Navegación intuitiva          | Back button, breadcrumbs, etc.            | ⬜     |

---

## SECCIÓN F: DATOS DE PRUEBA NECESARIOS

### F1. Escenarios de datos a crear

| #     | Escenario                      | Datos necesarios                                                                                                              | Status |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| F1.1  | Flujo completo simple          | 1 equipo → 1 solicitud → 3 items → aprobar todos → planificar → aprobar fecha → ingresar → operario completa todo → cerrar OT | ⬜     |
| F1.2  | Flujo con rechazo parcial      | 1 equipo → 1 solicitud → 3 items → aprobar 2, rechazar 1 → verificar que rechazado vuelve                                     | ⬜     |
| F1.3  | Flujo con múltiples sectores   | 1 equipo → items para 3 sectores → verificar secuencia de bloqueo                                                             | ⬜     |
| F1.4  | Flujo con diagnóstico          | 1 equipo → OT con diagnóstico → verificar bloqueo → completar diag → completar tareas                                         | ⬜     |
| F1.5  | Flujo con tarea autorizable    | Operario agrega tarea autorizable → admin aprueba → operario completa                                                         | ⬜     |
| F1.6  | Flujo con devolución           | Operario devuelve tarea → admin reasigna → verificar nuevo sector                                                             | ⬜     |
| F1.7  | Flujo con cierre parcial       | OT con 5 repairs → completar 3, cerrar → completed_partial                                                                    | ⬜     |
| F1.8  | Múltiples OTs simultáneas      | Varias OTs asignadas al operario → verificar que puede manejar todas                                                          | ⬜     |
| F1.9  | OT de otro sector (no visible) | OT asignada a sector diferente → operario NO la ve                                                                            | ⬜     |
| F1.10 | Cambio de sector del operario  | Cambiar workshop_sector_id → re-login → ve OTs del nuevo sector                                                               | ⬜     |

### F2. Configuración del usuario de prueba

```
Email: yordanpz@hotmail.com
Empleado vinculado: (verificar employee_id en profile)
Sector actual: (verificar workshop_sector_id en employees)
Taller: Taller Añelo

Sectores disponibles para testing:
- Mecánica General (aa00...0001) - cap: 5
- Electricidad (aa00...0002) - cap: 3
- Chapa y Pintura (aa00...0003) - cap: 4
```

---

## SECCIÓN G: PROBLEMAS DETECTADOS (HALLAZGOS)

### G1. Problemas de Base de Datos

| #    | Problema                                     | Severidad | Detalle                                          |
| ---- | -------------------------------------------- | --------- | ------------------------------------------------ |
| G1.1 | maintenance_requests.status es TEXT, no ENUM | Media     | Riesgo de typos. Debería ser ENUM                |
| G1.2 | maintenance_orders.status es TEXT, no ENUM   | Media     | Riesgo de typos. Debería ser ENUM                |
| G1.3 | Falta validación de transiciones en DB       | Media     | No hay constraints para transiciones válidas     |
| G1.4 | work_order_items sin trigger de auditoría    | Baja      | Cambios de items no se registran en activity_log |

### G2. Problemas de UI/UX (por descubrir durante testing)

| #   | Problema                         | Ubicación | Severidad | Detalle |
| --- | -------------------------------- | --------- | --------- | ------- |
|     | (Se llenará durante las pruebas) |           |           |         |

### G3. Problemas de Lógica (por descubrir durante testing)

| #   | Problema                         | Ubicación | Severidad | Detalle |
| --- | -------------------------------- | --------- | --------- | ------- |
|     | (Se llenará durante las pruebas) |           |           |         |

### G4. Datos perdidos en el camino (por verificar)

| #    | Dato                     | Origen                              | Destino                                  | ¿Se pierde? | Detalle                        |
| ---- | ------------------------ | ----------------------------------- | ---------------------------------------- | ----------- | ------------------------------ |
| G4.1 | Comentario del chofer    | checklist_deviations.driver_comment | maintenance_request_items                | Verificar   | ¿Se conserva en todo el flujo? |
| G4.2 | Comentario del validador | Aprobación de solicitud             | maintenance_order_items                  | Verificar   | ¿Llega hasta la OT?            |
| G4.3 | Kilometraje              | maintenance_requests.kilometer      | maintenance_orders.kilometer_at_entry    | Verificar   | ¿Se mantiene consistente?      |
| G4.4 | Tipo de reparación       | Planificación                       | work_order_item_repairs                  | Verificar   | ¿Se propaga correctamente?     |
| G4.5 | Criticidad del item      | checklist_deviations.is_critical    | work_order_item_repairs                  | Verificar   | ¿Se mantiene la marca?         |
| G4.6 | Notas del técnico        | Operario guarda notas               | work_order_item_repairs.technician_notes | Verificar   | ¿Persisten al cerrar OT?       |

---

## SECCIÓN H: MEJORAS PROPUESTAS

### H1. UI del Panel de Operarios

| #    | Mejora                                    | Prioridad | Detalle |
| ---- | ----------------------------------------- | --------- | ------- |
| H1.1 | (Se llenará durante las pruebas visuales) |           |         |

### H2. Lógica de Negocio

| #    | Mejora                           | Prioridad | Detalle                                   |
| ---- | -------------------------------- | --------- | ----------------------------------------- |
| H2.1 | Migrar status de TEXT a ENUM     | Media     | maintenance_requests y maintenance_orders |
| H2.2 | Validación de transiciones en DB | Media     | Trigger que valide transiciones válidas   |
| H2.3 | Auditoría de work_order_items    | Baja      | Agregar trigger de activity_log           |

---

## PROGRESO GENERAL

| Sección               | Total Tests | Completados | Pendientes | %      |
| --------------------- | ----------- | ----------- | ---------- | ------ |
| A - Admin Operaciones | 28          | 0           | 28         | 0%     |
| B - Admin Taller      | 16          | 0           | 16         | 0%     |
| C - Panel Operarios   | 43          | 0           | 43         | 0%     |
| D - Desviaciones      | 17          | 0           | 17         | 0%     |
| E - UI/UX             | 6           | 0           | 6          | 0%     |
| F - Datos de Prueba   | 10          | 0           | 10         | 0%     |
| **TOTAL**             | **120**     | **0**       | **120**    | **0%** |

---

## ORDEN DE EJECUCIÓN RECOMENDADO

1. **F: Preparar datos de prueba** (crear registros en DB vía MCP)
2. **A1-A2: Equipos con desvíos → Solicitudes** (crear solicitud desde UI)
3. **A2: Aprobar/Rechazar solicitudes** (probar todas las variantes)
4. **B1: Planificación** (asignar tipos, sectores, fecha)
5. **A3: Pendientes de Ejecutar** (aprobar/rechazar fecha)
6. **B2: Ingreso al Taller** (confirmar ingreso)
7. **C0: Login de operario** (cerrar sesión admin, login como operario)
8. **C1: Dashboard operario** (verificar OTs visibles)
9. **C2-C4: Trabajar OTs** (iniciar, completar repairs, notas)
10. **C3: Diagnóstico** (si aplica)
11. **C5: Devolver tarea** (probar devolución)
12. **C6: Agregar tarea** (mi sector y otro sector)
13. **C7: Cerrar OT** (completa y parcial)
14. **D: Desviaciones** (probar todos los flujos alternos)
15. **B3-B5: Seguimiento y Bandeja** (verificar desde admin)
16. **E: Verificaciones UI** (responsive, diseño, UX)
