# Informe del Gestor de Pedidos (COD-370)

## Contexto

El usuario necesita un reporte automático que muestre estadísticas sobre los pedidos del Gestor de Pedidos (tabla `preparte`): porcentaje de corrimiento de fechas, pedidos perdidos (rechazados/vencidos), y distribución por estado.

## Ubicación

Botón "Generar Informe" en la toolbar del Gestor de Pedidos (`/dashboard/operations?tab=preparte`). **Sin protección de permisos** — cualquier usuario con acceso al tab puede generar el informe.

## Modal de Filtros

| Campo       | Tipo                             | Validación          | Default |
| ----------- | -------------------------------- | ------------------- | ------- |
| Desde       | DatePicker (escritura directa)   | Requerido           | -       |
| Hasta       | DatePicker (escritura directa)   | Requerido, >= Desde | -       |
| Cliente     | Combobox multiselect (on-demand) | Opcional            | Todos   |
| Estados     | Multiselect con chips            | Opcional            | TODOS   |
| Agrupar por | Radio group                      | Requerido           | Línea   |

Opciones de estado: pendiente, confirmado, reprogramado, cancelado, rechazado, vencido.

Opciones de agrupar por: "Línea" (cada fila de preparte) o "Pedido" (agrupado por `numero_pedido`).

## Lógica de Cálculo

### Query base

Todos los prepartes cuya `executionDate` caiga entre Desde-Hasta. Si `executionDate` es null (sujeto a disponibilidad), usar `requestDate` como fallback. Filtrado adicional por cliente(s) y estado(s) si se seleccionaron.

### Métricas

- **TOTAL**: Count de registros que cumplen los filtros de fecha y cliente
- **% por estado**: `COUNT(status) / TOTAL * 100` para cada estado presente
- **% corrimiento de fecha**: `COUNT(status = 'reprogramado') / TOTAL * 100`
- **% perdidos**: `COUNT(status IN ('rechazado', 'vencido')) / TOTAL * 100`

## Salida: Excel (.xlsx) con 2 hojas

### Hoja 1 — Resumen

Tabla con una fila de resumen:

| Campo           | Descripción                                            |
| --------------- | ------------------------------------------------------ |
| Desde           | Fecha inicio del filtro                                |
| Hasta           | Fecha fin del filtro                                   |
| Cliente(s)      | Nombres de clientes filtrados o "Todos"                |
| Total           | Cantidad total de registros                            |
| % Confirmados   | Porcentaje de confirmados                              |
| % Pendientes    | Porcentaje de pendientes                               |
| % Reprogramados | Porcentaje de reprogramados                            |
| % Cancelados    | Porcentaje de cancelados                               |
| % Rechazados    | Porcentaje de rechazados                               |
| % Vencidos      | Porcentaje de vencidos                                 |
| % Corrimiento   | Porcentaje de reprogramados (indicador de corrimiento) |
| % Perdidos      | Porcentaje de rechazados + vencidos                    |

### Hoja 2 — Detalle

Todas las líneas que entraron en el cálculo, agrupadas por estado.

**Modo Línea** (cada fila = un preparte):

| Columna         | Campo                            |
| --------------- | -------------------------------- |
| Nro Pedido      | `numero_pedido`                  |
| Cliente         | `customers.name`                 |
| Contrato        | `customer_services.service_name` |
| Ítem            | `service_items.item_name`        |
| Fecha Solicitud | `requestDate` (DD/MM/YYYY)       |
| Fecha Ejecución | `executionDate` (DD/MM/YYYY)     |
| Estado          | `status` (label en español)      |
| Solicitante     | `solicitante`                    |
| Observaciones   | `observaciones`                  |

**Modo Pedido** (agrupado por `numero_pedido`):

| Columna         | Campo                               |
| --------------- | ----------------------------------- |
| Nro Pedido      | `numero_pedido`                     |
| Cliente         | `customers.name`                    |
| Contrato        | `customer_services.service_name`    |
| Cant. Líneas    | Count de líneas del pedido          |
| Fecha Solicitud | `requestDate` de la primera línea   |
| Fecha Ejecución | `executionDate` de la primera línea |
| Estado          | Estado predominante o listado       |
| Solicitante     | `solicitante`                       |

Ordenamiento: agrupado por estado, dentro de cada grupo ordenado por `executionDate` ASC.

## Archivos a Crear/Modificar

| Archivo                                                                | Acción                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/features/Operaciones/Preparte/components/PreparteReportModal.tsx` | **Crear** — Modal con form (zod + RHF), lógica de descarga         |
| `src/features/Operaciones/Preparte/actions/preparte.ts`                | **Modificar** — Agregar server action `generatePreparteReport()`   |
| `src/features/Operaciones/Preparte/components/PreparteManager.tsx`     | **Modificar** — Agregar botón "Generar Informe" y estado del modal |

## Dependencias

- ExcelJS via `src/shared/lib/excel-export.ts` (ya existe, soporta múltiples hojas y branding)
- Prisma para queries de agregación
- zod + react-hook-form para el modal
- moment.js para formato de fechas

## Stack técnico

- Server action con Prisma (`generatePreparteReport`) retorna los datos calculados
- La generación del Excel se hace en el **cliente** con ExcelJS (para poder triggear la descarga)
- El server action retorna `{ summary, details }` y el cliente construye el archivo
