# Numero de Legajo en Listas de Empleados

**SIEMPRE** incluir el numero de legajo (`file_number`) en TODA superficie donde se muestre informacion de un empleado. Los usuarios identifican a los empleados por su legajo, NO por su nombre. El nombre puede repetirse entre personas; el legajo es unico.

## Superficies obligatorias

| Superficie                                     | Regla                                                           |
| ---------------------------------------------- | --------------------------------------------------------------- |
| DataTable de empleados                         | Columna `file_number` visible + filtro de texto por legajo      |
| DataTable de otras entidades con FK a empleado | Mostrar legajo junto al nombre en la celda (ej: `[1234] Perez`) |
| Selector / Combobox de empleado                | Label con formato `[legajo] Apellido Nombre`                    |
| Filtro facetado con empleados como opciones    | Label con formato `[legajo] Apellido Nombre`                    |
| Modal / Drawer de detalle                      | Legajo visible en el header o datos principales                 |
| Badges / chips que referencian un empleado     | Incluir legajo o tooltip con legajo                             |
| Breadcrumb / titulo de pagina de detalle       | Incluir legajo en la identificacion del empleado                |
| Exportacion Excel                              | Columna de legajo incluida                                      |
| Buscadores de empleado (SearchInput)           | Placeholder debe decir "Buscar por legajo o nombre"             |

## Regla de Query — `file_number` DEBE viajar en los datos

Cuando una query trae empleados (directa o via JOIN), SIEMPRE incluir `file_number` en el `select`. Si el dato no llega al componente, no se puede mostrar.

```typescript
// ✅ CORRECTO — select incluye file_number
const employees = await prisma.employees.findMany({
  select: { id: true, firstname: true, lastname: true, file_number: true },
});

// ❌ INCORRECTO — file_number ausente
const employees = await prisma.employees.findMany({
  select: { id: true, firstname: true, lastname: true },
});
```

## Ejemplos de presentacion

```typescript
// ✅ CORRECTO - Legajo visible en selector
<SelectItem value={employee.id}>
  [{employee.file_number}] {employee.lastname} {employee.firstname}
</SelectItem>

// ✅ CORRECTO - Legajo en tabla propia de empleados
{ accessorKey: 'file_number', header: 'Legajo', meta: { title: 'Legajo' } }

// ✅ CORRECTO - Legajo en celda de tabla de otra entidad (ej: solicitudes)
cell: ({ row }) => (
  <span>[{row.original.employee?.file_number}] {row.original.employee?.lastname}</span>
)

// ✅ CORRECTO - Label de filtro facetado con empleados
label: `[${emp.file_number}] ${emp.lastname} ${emp.firstname}`

// ❌ INCORRECTO - Lista de empleados sin legajo
<SelectItem value={employee.id}>
  {employee.lastname} {employee.firstname}
</SelectItem>
```

## Deteccion automatica y correccion incremental

Al leer cualquier archivo que muestre o filtre empleados, verificar si `file_number` esta presente en los datos y visible en la UI.

**Si se detecta una implementacion incorrecta** (empleados sin legajo en cualquier superficie): **PREGUNTAR al usuario si desea corregirlo antes de continuar** con la tarea principal.

Formato de pregunta sugerido:

> "Encontre que [componente/tabla/selector] muestra empleados sin el numero de legajo. ¿Queres que lo corrija ahora?"
