# Restaurar Desvíos y Columnas de Rol en Detalle de Parte Diario

**Fecha**: 2026-04-09
**Branch**: `refactor-operations-detail-prisma`

## Contexto

La refactorización del detalle de partes diarios (Supabase → Prisma) perdió funcionalidad crítica:

- 4 columnas individuales por rol de empleado (chofer_dia, ayudante_dia, chofer_noche, ayudante_noche)
- Sistema completo de desvíos para empleados y equipos

## Objetivo

Restaurar paridad funcional completa con la versión de producción (`main`).

## Columnas — Orden Original (a restaurar)

| #   | Column ID            | Título           | Notas                                  |
| --- | -------------------- | ---------------- | -------------------------------------- |
| 1   | `select`             | (checkbox)       | Sin cambios                            |
| 2   | `customer`           | Cliente          | Sin cambios                            |
| 3   | `service`            | Servicio         | Sin cambios                            |
| 4   | `item`               | Ítem             | Sin cambios                            |
| 5   | `sector`             | Sector           | NUEVO (no existía antes)               |
| 6   | `area`               | Área             | NUEVO (no existía antes)               |
| 7   | `type_service`       | Tipo de servicio | Sin cambios                            |
| 8   | `customer_equipment` | Equipo cliente   | Reposicionar (estaba aquí en el viejo) |
| 9   | `chofer_dia`         | Chofer Día       | **RESTAURAR**                          |
| 10  | `ayudante_dia`       | Ayudante Día     | **RESTAURAR**                          |
| 11  | `chofer_noche`       | Chofer Noche     | **RESTAURAR**                          |
| 12  | `ayudante_noche`     | Ayudante Noche   | **RESTAURAR**                          |
| 13  | `employees`          | Empleados        | **RESTAURAR desvíos**                  |
| 14  | `equipment`          | Equipo           | **RESTAURAR desvíos**                  |
| 15  | `working_day`        | Jornada          | Sin cambios                            |
| 16  | `start_time`         | Hora de inicio   | Sin cambios (oculta por defecto)       |
| 17  | `end_time`           | Hora de fin      | Sin cambios (oculta por defecto)       |
| 18  | `status`             | Estado           | Sin cambios                            |
| 19  | `description`        | Descripción      | NUEVO                                  |
| 20  | `remit_number`       | Nro Remito       | NUEVO                                  |
| 21  | `completed_day`      | Completado Día   | NUEVO                                  |
| 22  | `completed_night`    | Completado Noche | NUEVO                                  |
| 23  | `actions`            | Acciones         | Sin cambios                            |

## Desvíos de Empleados — Sistema Completo

### Fuente de datos

- RPC existente: `get_daily_report_deviations(p_daily_report_id, p_report_date)`
- Ya existe en la BD, no requiere migración

### Tipos de desvío

| Desvío                                | Flag                                        | Color Badge | Mensaje Tooltip                        |
| ------------------------------------- | ------------------------------------------- | ----------- | -------------------------------------- |
| Duplicado en múltiples filas          | `is_duplicated`                             | Naranja     | "Empleado asignado en múltiples filas" |
| No asignado al cliente + sin diagrama | `is_unassigned_to_client && has_no_diagram` | Púrpura     | Ambos mensajes                         |
| No asignado al cliente                | `is_unassigned_to_client`                   | Azul        | "No asignado al cliente de esta fila"  |
| Sin diagrama para el día              | `has_no_diagram`                            | Rojo        | "Sin diagrama cargado para este día"   |
| Día no laboral (franco)               | `is_non_work_day`                           | Amarillo    | "Día no laboral: {diagram_type_name}"  |
| Sin desvíos                           | ninguno                                     | Default     | "Empleado asignado correctamente"      |
| Cargando                              | —                                           | Gris        | "Validando asignaciones..."            |

### Prioridad visual (de mayor a menor)

1. `is_duplicated` → naranja
2. `is_unassigned_to_client && has_no_diagram` → púrpura
3. `is_unassigned_to_client` → azul
4. `has_no_diagram` → rojo
5. `is_non_work_day` → amarillo
6. Sin desvíos → default

## Desvíos de Equipos — Sistema Completo

### Tipos de desvío

| Desvío                 | Condición                                | Color Badge  | Mensaje Tooltip                                |
| ---------------------- | ---------------------------------------- | ------------ | ---------------------------------------------- |
| Duplicado              | `is_duplicated`                          | Naranja      | "Asignado en múltiples filas del parte diario" |
| No operativo           | `condition === 'no operativo'`           | Rojo         | "Condición: No operativo"                      |
| En reparación          | `condition === 'en reparacion'`          | Amarillo     | "Condición: En reparación"                     |
| No asignado al cliente | `is_unassigned_to_client`                | Azul         | "No asignado al cliente de esta fila"          |
| Operativo condicionado | `condition === 'operativo condicionado'` | Sky          | "Condición: Condicionado"                      |
| En preparación         | `condition === 'en preparacion'`         | Gris         | "Condición: En preparación"                    |
| Sin desvíos            | ninguno                                  | Default      | "Equipo asignado correctamente"                |
| Otro equipo operativo  | siempre                                  | Azul outline | "Otro Equipo Operativo" + tipo                 |

### Prioridad visual (de mayor a menor)

1. `is_duplicated` → naranja
2. `condition === 'no operativo'` → rojo
3. `condition === 'en reparacion'` → amarillo
4. `is_unassigned_to_client` → azul
5. `condition === 'operativo condicionado'` → sky
6. `condition === 'en preparacion'` → gris
7. Sin desvíos → default

## Columnas de Rol — Reglas de Visibilidad

| Columna        | Jornada 12h | Jornada 24h | Otras jornadas | Vacío                 |
| -------------- | ----------- | ----------- | -------------- | --------------------- |
| Chofer Día     | Visible     | Visible     | `-`            | "Sin asignar"         |
| Ayudante Día   | Visible     | Visible     | `-`            | _"Opcional"_ (italic) |
| Chofer Noche   | `-`         | Visible     | `-`            | "Sin asignar"         |
| Ayudante Noche | `-`         | Visible     | `-`            | _"Opcional"_ (italic) |

Cada columna:

- Filtra `dailyreportemployeerelations` por `role === '<nombre>'`
- Renderiza el empleado usando `renderEmployeeBadge` (con desvíos completos)
- Tiene sorting y export formatter

## Archivos a Modificar

1. **`detail/columns.tsx`** — Agregar 4 columnas de rol, restaurar desvíos en badges, reordenar columnas
2. **`detail/components/_DailyReportDetailDataTable.tsx`** — Integrar `useValidationData`, pasar funciones a `getColumns`
3. **`detail/actions.server.ts`** — Agregar `getDailyReportDeviations` (llama al RPC via Supabase)
4. **Nuevo: `detail/hooks/useValidationData.ts`** — Hook que consume el RPC y expone getters

## Lo que NO cambia

- No se modifica el RPC SQL
- No se crean migraciones
- No se modifica `buildRowSelect`
- La lógica de formularios y selectores no se toca
- Las columnas nuevas (sector, área, descripción, remito, completado día/noche) se mantienen
