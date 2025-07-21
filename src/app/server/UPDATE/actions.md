# Documentación de acciones: `UPDATE/actions.ts`

Este archivo contiene funciones para actualizar, crear o modificar información en la base de datos, principalmente relacionada a formularios, vehículos, usuarios y diagramas de empleados. Todas las funciones son asíncronas y utilizan Supabase.

---

## Acciones sobre formularios

| Función             | Descripción                                  | Firma                                                |
| ------------------- | -------------------------------------------- | ---------------------------------------------------- |
| CreateNewFormAnswer | Crea una nueva respuesta para un formulario. | CreateNewFormAnswer(formId: string, formAnswer: any) |

---

## Acciones sobre vehículos

| Función       | Descripción                         | Firma                                              |
| ------------- | ----------------------------------- | -------------------------------------------------- |
| UpdateVehicle | Actualiza los datos de un vehículo. | UpdateVehicle(vehicleId: string, vehicleData: any) |

---

## Acciones sobre usuarios

| Función                 | Descripción                                             | Firma                                                           |
| ----------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| updateModulesSharedUser | Actualiza los módulos compartidos para un usuario dado. | updateModulesSharedUser({ id: string; modules: ModulosEnum[] }) |

---

## Acciones sobre diagramas de empleados

| Función            | Descripción                                              | Firma                                                                          |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| UpdateDiagramsById | Actualiza el tipo de diagrama de uno o varios empleados. | UpdateDiagramsById(diagramData: { diagram_type: string; diagramId: string }[]) |
| CreateDiagrams     | Crea uno o varios diagramas de empleados.                | CreateDiagrams(diagramData: EmployeeDiagramInsert[])                           |

---

**Notas:**

- Todas las funciones requieren contexto de sesión y utilizan la cookie de compañía activa.
- Se recomienda validar los datos antes de llamar a las funciones para evitar errores de integridad.
- Si necesitas ejemplos de uso o detalles de implementación de alguna función, avísame.
