# Project Memory - Standards Enforcer

## Módulo de Mantenimiento - Estructura clave

### Queries de actionsServer en MaintenanceOrders

- `getMaintenanceOrders` y `getMaintenanceOrderDetail` deben tener las mismas columnas en el select de `maintenance_requests`
- Siempre incluir `supervisor_id` en el select de `maintenance_requests` para que `OrderDetailDialog` pueda pre-cargar el supervisor

### fetchSupervisorsForChecklist (Checklist/actions/actionsServer.ts)

- El profile incluye `employee_id` (columna real en tabla `profile`)
- `employees_diagram` tiene: `employee_id`, `day`, `month`, `year`, `is_active`
- Patrón de filtro: una query IN para employees_diagram en lugar de N queries individuales
- Supervisores sin `employee_id` = siempre incluidos (sin restricción de diagrama)

### workshopChiefValidateOrder (MaintenanceOrders/actions/actionsServer.ts)

- Firma actualizada: `(orderId, notes?, operationsSupervisorId?)`
- Si se pasa `operationsSupervisorId`, hace SELECT de `maintenance_request_id` y UPDATE de `maintenance_requests.supervisor_id`

### Patrones de Dialog en Mantenimiento

- Los dialogs de acción reciben `request` o `order` + `open` + `onOpenChange`/`onClose`
- Pre-cargar selects con valor actual del objeto: `request.supervisor?.id ?? request.supervisor_id`
- Query de supervisores con `enabled: open` para no cargar innecesariamente
- Usar `invalidateAllMaintenanceQueries(queryClient)` siempre después de mutations

### Rol de "Administrador Operaciones" = id 20 (tabla user_roles)

### Permisos en SolicitudesMantenimiento

- Module: `mantenimiento`, tab: `maintenance_requests`, action: `update` para Aprobar/Rechazar/Reasignar
- Botón Reasignar envuelto en el mismo `PermissionGuard` que Aprobar/Rechazar

## Estructura de archivos - Módulo Mantenimiento

```
src/features/Mantenimiento/
├── SolicitudesMantenimiento/
│   ├── actions/actionsServer.ts      # Server actions de solicitudes
│   ├── components/
│   │   ├── columns.tsx               # Columnas de la tabla
│   │   ├── SolicitudesTableClient.tsx
│   │   ├── ReassignSupervisorDialog.tsx  # NUEVO
│   │   ├── SolicitudApprovalDialog.tsx
│   │   ├── SolicitudRejectDialog.tsx
│   │   └── SolicitudDetailDialog.tsx
│   └── hooks/useMaintenanceRequests.ts   # MAINTENANCE_REQUESTS_QUERY_KEY
├── MaintenanceOrders/
│   ├── actions/actionsServer.ts      # workshopChiefValidateOrder y más
│   └── components/
│       └── OrderDetailDialog.tsx     # Dialog principal con select de supervisor
└── utils/
    └── queryInvalidation.ts          # invalidateAllMaintenanceQueries(queryClient)
```

## Módulo de Equipos - Tabs de Otros (other_equipment)

### IDs de tabs: detalle-otro-equipo

- `detalle-otro-equipo` (tab principal): `e8604848-24d4-4f23-a466-700b43b24202`
- `datos-basicos-otro`: `e59f78dc-269c-4280-b5a6-d16076e304a9`
- `asignacion-otro`: `5f038bbf-8547-4a4a-b1c7-0e3b1c08ff63`
- `certificaciones-otro`: `b635efcb-e558-4709-8037-f5d3f3761c84`
- `qr-otro-equipo`: `aecb923c-460f-4009-83df-667da0518a82`

### Permisos de subtab `others`

- En BD ya existía `create` para Administrador, Full Access, Patrimoniales, Control Documental
- En permissions-map.ts se actualizó a `['view', 'create']` (antes solo tenía `['view']`)
- PermissionGuard para crear otros: `module="equipos" tab="others" action="create"`
- PermissionGuard para editar detalle: `module="equipos" tab="detalle-otro-equipo" action="update"`

## Checklist antes de modificar Mantenimiento

- [ ] `invalidateAllMaintenanceQueries(queryClient)` en TODAS las mutations
- [ ] Tipos inferidos con `Awaited<ReturnType<typeof fn>>`
- [ ] Logger con `new Logger('ComponentName')` - no console.\*
- [ ] Select de supervisores: query con `enabled: open` y `staleTime: 5 * 60 * 1000`

## Módulo Partes Diarios / ServiceItems - Patrones clave

### Flujo de items en parte diario

- `getCustomersClient` (actionsClient.ts) hace `service_items(*, measure_units(*))` — incluye todos los campos del item
- `serviceItems` en `useCustomerData.ts` = items del servicio seleccionado ya con needs_personnel/needs_equipment
- Para acceder a los flags del item en `useFormSubmit`, se pasa `serviceItems` como 6to parámetro opcional
- `DailyReportRowFormRefactored.tsx` pasa `serviceItems` al hook: `useFormSubmit(..., serviceItems)`

### Lógica de estado sin_recursos_asignados con flags de item

- Estado determinado por: `(itemNeedsPersonnel && !hasEmployees) || (itemNeedsEquipment && !hasEquipment)`
- Si `needs_personnel=false`, nunca cuenta como falta de personal
- Si `needs_equipment=false`, nunca cuenta como falta de equipos
- El `useEffect` watch en el form también respeta los flags al cambiar employees/equipment/item

### Regenerar tipos después de agregar columnas a BD

- `npm run genlocaltypes` — regenera desde BD LOCAL (cuando se usa supabase-LOCAL MCP)
- Los tipos `database.types.ts` en raíz del proyecto son los auto-generados
- Verificar con `npm run check-types` que los nuevos campos aparecen antes de usarlos

### itemsService.ts - Advertencias de tipos

- `item_description` en BD es `string` no nullable — usar `?? undefined` o `?? ''` al pasar null
- `editService?.company_id` puede ser `string | null` — usar `?? undefined` para Update de Supabase
- El parámetro `editService` es el customer_service (contrato) cuyo `id` = `customer_service_id` del item
