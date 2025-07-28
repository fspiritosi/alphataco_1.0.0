# Documentación de acciones: `actions.ts`

Este archivo contiene todas las acciones relacionadas con la gestión de partes diarios, sus filas, relaciones y entidades asociadas en el módulo de Operaciones. Aquí se listan todas las funciones exportadas, su propósito y la firma correspondiente.

## Funciones de obtención y consulta automática

Estas funciones se utilizan para obtener, listar o consultar información de manera automática por el sistema o para mostrar datos al usuario:

| Función                           | Descripción                                               | Firma                                                         |
| --------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| fetchDailyReportsWithFilters      | Obtiene partes diarios filtrando por fechas y estado.     | fetchDailyReportsWithFilters({ fromDate?, toDate?, status? }) |
| getDailyReports                   | Obtiene todos los partes diarios de la empresa.           | getDailyReports()                                             |
| getDailyReportsForCurrentMonth    | Obtiene partes diarios del mes actual.                    | getDailyReportsForCurrentMonth()                              |
| getDailyReportRowHistory          | Trae el historial de cambios de una fila de parte diario. | getDailyReportRowHistory(dailyReportId: string)               |
| getDailyReportById                | Trae un parte diario por su ID.                           | getDailyReportById(id: string)                                |
| checkDailyReportExists            | Verifica si existe un parte diario para una fecha dada.   | checkDailyReportExists(date: string[])                        |
| getCustomers                      | Obtiene todos los clientes.                               | getCustomers()                                                |
| getCustomersServices              | Obtiene todos los servicios de los clientes.              | getCustomersServices()                                        |
| getServiceItems                   | Obtiene los ítems de servicio.                            | getServiceItems()                                             |
| getActiveEmployeesForDailyReport  | Obtiene empleados activos para asignar a partes diarios.  | getActiveEmployeesForDailyReport()                            |
| getActiveEquipmentsForDailyReport | Obtiene equipos activos para asignar a partes diarios.    | getActiveEquipmentsForDailyReport()                           |
| getCustomersAreas                 | Obtiene las áreas de los clientes.                        | getCustomersAreas(customerIds: string[])                      |
| getCustomersSectors               | Obtiene los sectores de los clientes.                     | getCustomersSectors(customerIds: string[])                    |

## Funciones de acción del usuario

Estas funciones representan acciones explícitas que el usuario puede realizar sobre los partes diarios y sus relaciones:

| Función                                     | Descripción                                                                | Firma                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------ | ---------------- |
| createDailyReport                           | Crea un parte diario para una fecha dada.                                  | createDailyReport(date: string[])                                                             |
| createDailyReportRow                        | Crea una o varias filas de parte diario.                                   | createDailyReportRow(data: Omit<DailyReportRowData, 'id'                                      | 'created_at' | 'updated_at'>[]) |
| updateDailyReportRow                        | Actualiza una fila de parte diario, relaciones y reasignaciones.           | updateDailyReportRow(id, data, employeeIds, equipmentIds, equipos_clienteIds, opciones)       |
| updateDailyReportRowStatus                  | Actualiza el estado de una o varias filas de parte diario.                 | updateDailyReportRowStatus(id: string[], status: DailyReportRowStatus)                        |
| updateEmployeeRelations                     | Actualiza relaciones de empleados para una fila de parte diario.           | updateEmployeeRelations(rowId: string, employeeIds: string[])                                 |
| updateEquipmentRelations                    | Actualiza relaciones de equipos para una fila de parte diario.             | updateEquipmentRelations(rowId: string, equipmentIds: string[])                               |
| updateEquiposClienteRelations               | Actualiza relaciones de equipos del cliente para una fila de parte diario. | updateEquiposClienteRelations(dailyReportRowId: string, equiposClienteIds: string[])          |
| createDailyReportEmployeeRelations          | Crea relaciones de empleados para una fila de parte diario.                | createDailyReportEmployeeRelations(dailyReportRowId: string, employeeIds: string[])           |
| createDailyReportEquipmentRelations         | Crea relaciones de equipos para una fila de parte diario.                  | createDailyReportEquipmentRelations(dailyReportRowId: string, equipmentIds: string[])         |
| createDailyReportCustomerEquipmentRelations | Crea relaciones de equipos del cliente para una fila de parte diario.      | createDailyReportCustomerEquipmentRelations(dailyReportRowId: string, equipmentIds: string[]) |
| deleteDailyReportRow                        | Elimina una fila de parte diario.                                          | deleteDailyReportRow(id: string)                                                              |
| deleteDailyReport                           | Elimina un parte diario si está vacío (sin filas asociadas).               | deleteDailyReport(reportId: string)                                                           |

---

**Notas:**

- Muchas funciones requieren conexión y autenticación con Supabase.
- Las funciones que gestionan relaciones (empleados, equipos, etc.) trabajan sobre tablas intermedias.
- Las funciones de borrado verifican restricciones antes de eliminar registros.

Si necesitas detalles de implementación de alguna función específica, avísame.
