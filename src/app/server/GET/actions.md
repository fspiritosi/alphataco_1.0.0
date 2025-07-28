# Documentación de acciones: `GET/actions.ts`

Este archivo contiene funciones relacionadas con la obtención y consulta de información de empleados, equipos, documentos y datos de la empresa. Las funciones están agrupadas por temática para facilitar la consulta.

---

## Acciones sobre empleados

| Función                                     | Descripción                                                   | Firma                                                           |
| ------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| fetchAllEmployeesWithRelations              | Obtiene todos los empleados con sus relaciones asociadas.     | fetchAllEmployeesWithRelations()                                |
| fetchAllEmployeesWithRelationsById          | Obtiene un empleado (por ID) con todas sus relaciones.        | fetchAllEmployeesWithRelationsById(id: string)                  |
| fetchAllEmployees                           | Obtiene todos los empleados, opcionalmente filtrando por rol. | fetchAllEmployees(role?: string)                                |
| fetchAllActivesEmployees                    | Obtiene todos los empleados activos.                          | fetchAllActivesEmployees()                                      |
| fetchSingEmployee                           | Obtiene un empleado por ID.                                   | fetchSingEmployee(employeesId: string)                          |
| findEmployeeByFullName                      | Busca un empleado por nombre completo.                        | findEmployeeByFullName(fullName: string)                        |
| fetchEmployeeMonthlyDocuments               | Obtiene documentos mensuales de todos los empleados.          | fetchEmployeeMonthlyDocuments()                                 |
| fetchEmployeeMonthlyDocumentsByEmployeeId   | Obtiene documentos mensuales de un empleado.                  | fetchEmployeeMonthlyDocumentsByEmployeeId(employeeId: string)   |
| fetchEmployeePermanentDocumentsByEmployeeId | Obtiene documentos permanentes de un empleado.                | fetchEmployeePermanentDocumentsByEmployeeId(employeeId: string) |
| fetchEmployeePermanentDocuments             | Obtiene documentos permanentes de todos los empleados.        | fetchEmployeePermanentDocuments()                               |
| getDiagramEmployee                          | Obtiene el diagrama de trabajo de un empleado.                | getDiagramEmployee({ employee_id }: { employee_id: string })    |
| fetchEmployeesByCompany                     | Obtiene empleados de una compañía.                            | fetchEmployeesByCompany()                                       |
| fetchEmployeeDiagrams                       | Obtiene diagramas de empleados (uno o todos).                 | fetchEmployeeDiagrams(employeeId?: string)                      |

---

## Acciones sobre equipos/vehículos

| Función                              | Descripción                                                        | Firma                                                     |
| ------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------- |
| fetchAllEquipmentWithRelations       | Obtiene todos los equipos con sus relaciones asociadas.            | fetchAllEquipmentWithRelations()                          |
| fetchAllEquipmentWithRelationsById   | Obtiene un equipo (por ID) con todas sus relaciones.               | fetchAllEquipmentWithRelationsById(id: string)            |
| fetchAllEquipmentWithBrand           | Obtiene todos los equipos con información de marca.                | fetchAllEquipmentWithBrand()                              |
| fetchAllEquipmentBasicData           | Obtiene datos básicos de todos los equipos.                        | fetchAllEquipmentBasicData()                              |
| fetchAllEquipment                    | Obtiene todos los equipos, opcionalmente por ID de equipo empresa. | fetchAllEquipment(company_equipment_id?: string)          |
| fetchMonthlyDocumentsByEquipmentId   | Obtiene documentos mensuales de un equipo.                         | fetchMonthlyDocumentsByEquipmentId(equipmentId: string)   |
| fetchMonthlyDocumentsEquipment       | Obtiene documentos mensuales de todos los equipos.                 | fetchMonthlyDocumentsEquipment()                          |
| fetchSimpleMonthlyDocumentsEquipment | Obtiene documentos mensuales simples de equipos.                   | fetchSimpleMonthlyDocumentsEquipment()                    |
| fetchPermanentDocumentsByEquipmentId | Obtiene documentos permanentes de un equipo.                       | fetchPermanentDocumentsByEquipmentId(equipmentId: string) |

---

## Acciones sobre documentos

| Función                                | Descripción                                                | Firma                                                  |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| fetchAllDocumentTypes                  | Obtiene todos los tipos de documentos.                     | fetchAllDocumentTypes()                                |
| fetchDocumentsByDocumentTypeId         | Obtiene documentos por tipo de documento.                  | fetchDocumentsByDocumentTypeId(documentTypeId: string) |
| getNextMonthExpiringDocumentsEmployees | Obtiene documentos de empleados que vencen el próximo mes. | getNextMonthExpiringDocumentsEmployees()               |
| getNextMonthExpiringDocumentsVehicles  | Obtiene documentos de vehículos que vencen el próximo mes. | getNextMonthExpiringDocumentsVehicles()                |
| getDocumentEmployeesById               | Obtiene un documento de empleado por ID.                   | getDocumentEmployeesById(id: string)                   |
| getDocumentEquipmentById               | Obtiene un documento de equipo por ID.                     | getDocumentEquipmentById(id: string)                   |

---

## Acciones sobre empresa/compañía

| Función                   | Descripción                               | Firma                                         |
| ------------------------- | ----------------------------------------- | --------------------------------------------- |
| setNewCompanyUserMetadata | Asigna metadata de compañía a un usuario. | setNewCompanyUserMetadata(company_id: string) |
| fetchCurrentCompany       | Obtiene la compañía actual seleccionada.  | fetchCurrentCompany()                         |
| getCompanyDetails         | Obtiene detalles de una compañía por ID.  | getCompanyDetails(companyId: string)          |
| fetchCompanyDocuments     | Obtiene documentos de la compañía.        | fetchCompanyDocuments()                       |
| fetchCompanyPositions     | Obtiene los puestos de la compañía.       | fetchCompanyPositions()                       |

---

## Utilidades y otras acciones

| Función                     | Descripción                                           | Firma                                                                               |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| fetchTypeVehicles           | Obtiene los tipos de vehículos.                       | fetchTypeVehicles()                                                                 |
| fetchProvinces              | Obtiene todas las provincias.                         | fetchProvinces()                                                                    |
| fetchHierrarchicalPositions | Obtiene posiciones jerárquicas.                       | fetchHierrarchicalPositions()                                                       |
| fetchAllCategories          | Obtiene todas las categorías.                         | fetchAllCategories()                                                                |
| fetchCovenants              | Obtiene todos los convenios.                          | fetchCovenants()                                                                    |
| setEmployeeDataOptions      | Configura opciones de datos de empleados.             | setEmployeeDataOptions()                                                            |
| setVehicleDataOptions       | Configura opciones de datos de vehículos.             | setVehicleDataOptions()                                                             |
| fetchGuilds                 | Obtiene todos los gremios.                            | fetchGuilds()                                                                       |
| fetchWorkDiagrams           | Obtiene todos los diagramas de trabajo.               | fetchWorkDiagrams()                                                                 |
| fetchCustomers              | Obtiene todos los clientes.                           | fetchCustomers()                                                                    |
| fetchTypesOfVehicles        | Obtiene todos los tipos de vehículos.                 | fetchTypesOfVehicles()                                                              |
| fetchVehicleModels          | Obtiene todos los modelos de vehículos.               | fetchVehicleModels()                                                                |
| fetchVehicleBrands          | Obtiene todas las marcas de vehículos.                | fetchVehicleBrands()                                                                |
| fetchDiagramsTypes          | Obtiene todos los tipos de diagramas.                 | fetchDiagramsTypes()                                                                |
| fetchAllProvinces           | Obtiene todas las provincias (alternativa).           | fetchAllProvinces()                                                                 |
| fetchServiceItems           | Obtiene ítems de servicio para un cliente y servicio. | fetchServiceItems(company_id: string, user_id: string, customer_service_id: string) |

---

**Notas:**

- Todas las funciones son asíncronas y utilizan Supabase como backend.
- Muchas requieren contexto de sesión y cookies para determinar la compañía activa.
- Si necesitas detalles de implementación de alguna función específica, avísame.
