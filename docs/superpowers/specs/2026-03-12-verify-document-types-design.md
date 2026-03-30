# Verificacion de Consistencia de Tipos de Documento

**Fecha**: 2026-03-12
**Estado**: Aprobado por usuario
**Tarea Linear**: COD-312 (continuacion)

## Problema

Cuando se crea o edita un tipo de documento con condiciones (`special=true`), los triggers de BD generan alertas automaticamente. Sin embargo, pueden surgir inconsistencias:

- Empleados/equipos que cumplen condiciones pero no tienen alerta (faltantes)
- Empleados/equipos con alertas vacias que ya no cumplen condiciones (sobrantes)

Estas inconsistencias pueden ocurrir por: edicion de condiciones sin re-trigger, cambios en datos del empleado/equipo que no dispararon el trigger, o bugs en la logica de triggers.

Actualmente no hay forma de detectar ni corregir estas inconsistencias desde la UI.

## Solucion

Boton "Verificar documentos" en el modal de edicion de tipos de documento que:

1. Analiza que recursos deberian tener la alerta vs cuales la tienen
2. Muestra un Dialog con los resultados (faltantes y sobrantes)
3. Permite corregir las inconsistencias con un clic (con confirmacion)

## Alcance

### Incluido

- Boton en modal de edicion (solo para `mandatory=true`, no para `applies='Empresa'`, no para `is_it_montlhy=true`)
- Dialog de verificacion con resultados
- Server actions para verificar y corregir
- Testing E2E via chrome-devtools del sistema de condiciones existente
- Skeleton loading state (no spinners)

### Excluido

- Indicador visual en la fila de la tabla (se implementara aparte)
- Verificacion automatica en cada carga de pagina
- Verificacion de documentos de empresa (no tienen recursos individuales)
- Verificacion de documentos no obligatorios (`mandatory=false`)
- Verificacion de documentos mensuales (`is_it_montlhy=true`) — tienen logica de periodos diferente que requiere tratamiento especial

## Arquitectura

### Componentes

```
_DocumentTypeFormModal.tsx (existente, modificar)
  └── Footer: + Boton "Verificar documentos" (izquierda)
        └── _VerifyDocumentsDialog.tsx (NUEVO)
              ├── _VerifyDocumentsSkeleton.tsx (loading state)
              ├── _VerifyResultsEmpty.tsx (sin inconsistencias)
              ├── _VerifyResultsContent.tsx (con inconsistencias)
              │     ├── Seccion faltantes (Card amber/dashed + tabla)
              │     └── Seccion sobrantes (Card red/dashed + tabla)
              └── AlertDialog de confirmacion para correccion
```

### React Query

- `queryKey: ['verify-document-consistency', documentTypeId]` — incluye el ID para evitar cache entre tipos distintos
- `staleTime: 0` — siempre refetchear al abrir el Dialog
- `enabled: dialogOpen && !!documentTypeId` — solo ejecutar cuando el dialog esta abierto

### Server Actions (en actions.server.ts)

#### `verifyDocumentTypeConsistency(documentTypeId: string)`

**Validacion server-side obligatoria**: Al inicio, cargar el document_type y lanzar error si `mandatory === false`, `is_it_montlhy === true`, o `applies === 'Empresa'`. Esto protege la API aunque el boton no sea visible para estos tipos.

Retorna un tipo discriminado segun `applies`:

```typescript
// Campos base compartidos
interface VerifyStats {
  totalResources: number; // total de recursos que deberian tener alerta
  totalWithAlert: number; // total que ya tienen registro
  totalMissing: number;
  totalOrphan: number;
}

// Campos de empleado
interface EmployeeResource {
  id: string;
  firstname: string;
  lastname: string;
  file_number: string | null; // NOTA: campo Prisma es `employees.file`, mapeado a file_number
}

// Campos de equipo
interface EquipmentResource {
  id: string;
  domain: string | null;
  intern_number: string | null;
  brand: string | null; // resuelto desde brand_vehicles.name
  type: string | null; // resuelto desde types_of_vehicles.name
}

// Retorno para empleados
interface EmployeeVerifyResult {
  applies: 'Persona';
  missing: EmployeeResource[];
  orphan: (EmployeeResource & { alertId: string })[];
  stats: VerifyStats;
}

// Retorno para equipos
interface EquipmentVerifyResult {
  applies: 'Equipos';
  missing: EquipmentResource[];
  orphan: (EquipmentResource & { alertId: string })[];
  stats: VerifyStats;
}

type VerifyResult = EmployeeVerifyResult | EquipmentVerifyResult;
```

Logica:

1. Cargar document_type con conditions via `getServerCompanyId()`. **Validar precondiciones**: si `mandatory === false`, `is_it_montlhy === true`, o `applies === 'Empresa'` → throw error.
2. Base WHERE para todos los recursos: `{ company_id: companyId, is_active: true }`
3. Si `special=true`: construir WHERE adicional reutilizando `buildConditionsWhereClause()` (helper extraido de `countMatchingResources`)
4. Si `special=false`: solo el base WHERE (todos los activos de la empresa)
5. Obtener IDs de recursos que ya tienen registro en `documents_employees`/`documents_equipment` para este `id_document_types`
6. Faltantes = recursos que matchean WHERE − los que ya tienen registro (filtrar con `{ id: { notIn: existingResourceIds } }`)
7. **Sobrantes** (algoritmo de dos queries):
   a. Query 1: Obtener todos los registros con `document_path IS NULL` para este `id_document_types` → `emptyAlerts[]` con `{ id, applies }`
   b. Query 2: De esos `applies` IDs, buscar cuales SI matchean el WHERE de condiciones → `matchingIds Set`
   c. Sobrantes = `emptyAlerts` donde `applies NOT IN matchingIds` (diferencia de conjuntos en JS, no N+1)
   d. Para cada sobrante, cargar datos del recurso (nombre, legajo, etc.) con una query `findMany({ where: { id: { in: orphanResourceIds } } })`

**Nota campo `file`**: El campo Prisma para legajo es `employees.file`, NO `file_number`. La server action debe mapearlo: `file_number: employee.file || null`.

#### `fixDocumentTypeConsistency(documentTypeId: string, actions: { createAlerts: string[], removeAlerts: string[] })`

**Parametros**:

- `createAlerts: string[]` — IDs de recursos (employees/vehicles) que necesitan alerta nueva
- `removeAlerts: string[]` — **`alertId` values** (PKs de registros en `documents_employees`/`documents_equipment`), **NO IDs de recursos**. Corresponden al campo `alertId` del tipo `orphan` retornado por `verifyDocumentTypeConsistency`.

Retorna:

```typescript
{
  created: number;
  removed: number;
}
```

Logica — **todo dentro de `prisma.$transaction()`**:

1. **Re-verificar antes de INSERT** (previene duplicados sin depender de UNIQUE constraint):

   ```typescript
   // Obtener IDs de recursos que YA tienen registro para este tipo
   const existingIds = await tx.documents_employees.findMany({
     where: { id_document_types: documentTypeId, applies: { in: createAlerts } },
     select: { applies: true },
   });
   const existingSet = new Set(existingIds.map((r) => r.applies));
   // Filtrar solo los que realmente no tienen registro
   const toCreate = createAlerts.filter((id) => !existingSet.has(id));
   ```

   Luego INSERT solo los `toCreate`:

   ```typescript
   // Payload minimo por registro
   {
     id_document_types: documentTypeId,
     applies: resourceId,   // employee.id o vehicle.id
     // state: 'pendiente' — default de la BD
     // document_path: null — default
   }
   ```

   Usar `createMany()` (sin `skipDuplicates`, ya que la re-verificacion elimina duplicados).

   **Nota**: NO se usa `skipDuplicates` porque la BD no tiene constraint UNIQUE sobre `(applies, id_document_types)`. Solo la PK `id` es unica, por lo que `skipDuplicates` no previene duplicados de alerta.

2. Batch DELETE de registros para `removeAlerts` (**son `alertId`, PKs de documents_employees/equipment**):

   ```sql
   DELETE FROM documents_employees/equipment
   WHERE id IN (removeAlerts)
     AND document_path IS NULL           -- salvaguarda: nunca borrar docs subidos
     AND id_document_types = documentTypeId  -- salvaguarda: no borrar alertas de otros tipos
   ```

3. Retornar conteos

## Reglas de Negocio

| Caso                                                         | Es inconsistencia? | Accion           |
| ------------------------------------------------------------ | ------------------ | ---------------- |
| Matchea condiciones + NO tiene registro                      | Si (faltante)      | Crear alerta     |
| Matchea + tiene registro (pendiente o subido)                | No                 | Ninguna          |
| NO matchea + tiene doc subido (document_path != null)        | No                 | Se respeta       |
| NO matchea + alerta vacia (document_path = NULL)             | Si (sobrante)      | Eliminar alerta  |
| mandatory=true, special=false + empleado activo sin registro | Si (faltante)      | Crear alerta     |
| mandatory=false                                              | No se verifica     | Boton no visible |
| applies='Empresa'                                            | No se verifica     | Boton no visible |
| is_it_montlhy=true                                           | Fuera de scope     | Boton no visible |

**Regla critica**: Documentos ya subidos NUNCA se eliminan, aunque el recurso ya no cumpla las condiciones. Solo se eliminan alertas vacias (sin documento subido).

## Logica de Matching en Prisma

La server action debe replicar la logica del trigger `build_employee_where_alias` en Prisma.

### Reutilizacion de codigo existente

La funcion `countMatchingResources` en `actions.server.ts` ya implementa esta logica. **Extraer un helper privado `buildConditionsWhereClause()`** con la siguiente firma:

```typescript
/**
 * Construye SOLO la parte de condiciones del WHERE de Prisma.
 * NO incluye company_id ni is_active — eso lo agrega el llamador.
 * Retorna {} si no hay condiciones validas (para componer con AND).
 */
function buildConditionsWhereClause(
  applies: 'Persona' | 'Equipos',
  conditionsJson: string | null // JSON string del campo conditions del document_type
): Record<string, unknown>;
```

- Retorna `{}` si `conditionsJson` es null, vacio, o no parseable
- El llamador compone: `{ ...baseWhere, ...buildConditionsWhereClause(applies, conditions) }`
- Maneja internamente la conversion BigInt para columnas afectadas
- Tanto `countMatchingResources` como `verifyDocumentTypeConsistency` deben usar este helper

### Tipos de condiciones

#### Tipo `direct` (columna directa en la tabla)

```typescript
// Ej: gender IN ('Masculino', 'Femenino')
where: { gender: { in: condition.ids } }
```

#### Tipo `one_to_many` (FK a otra tabla)

```typescript
// Ej: hierarchical_position IN ('uuid1', 'uuid2')
where: { hierarchical_position: { in: condition.ids } }
```

#### Tipo `many_to_many` (tabla pivot)

```typescript
// Ej: empleado tiene aptitudes tecnicas con IDs especificos
where: {
  empleado_aptitudes: {
    some: {
      aptitudes_id: { in: condition.ids }
    }
  }
}
```

Se combinan TODAS las condiciones con AND (mismo comportamiento que el trigger).

### Columnas BigInt FK

**CRITICO**: Algunas columnas FK usan BigInt como PK. Los `condition.ids` son strings, deben convertirse:

```typescript
ids.map(Number).filter((n) => !isNaN(n));
```

Columnas afectadas:

- **Empleados**: `province`
- **Vehiculos**: `brand`, `model`, `type_of_vehicle`

Ver constantes `BIGINT_COLUMNS_EMPLOYEES` y `BIGINT_COLUMNS_VEHICLES` ya definidas en `actions.server.ts`.

## Permisos

El boton "Verificar documentos" solo aparece si el usuario tiene permiso `update` en la subtab correspondiente:

- `documentType.applies === 'Persona'` → `hasPermission('documentacion', 'tipos-docs-personas', 'update')`
- `documentType.applies === 'Equipos'` → `hasPermission('documentacion', 'tipos-docs-equipos', 'update')`

### Threading de permisos

1. **`_DocumentTypeFormModal.tsx`** — agregar prop `permissionsMap?: Record<string, boolean>` a `DocumentTypeFormModalProps`
2. **Componente que abre el modal** — en cada subtab (`PersonasList`, `EquiposList`, `EmpresaList`), el modal de edicion ya recibe datos del Server Component padre. Agregar `permissionsMap` como prop pasada desde el Server Component (que ya carga permisos via `getUserPermissionsMapServer()` o `getModulePermissions()`)
3. **Dentro del modal** — construir helper local:
   ```typescript
   const canVerify =
     permissionsMap?.[
       `documentacion:${documentType?.applies === 'Persona' ? 'tipos-docs-personas' : 'tipos-docs-equipos'}:update`
     ] === true;
   ```
4. El boton "Verificar documentos" se renderiza solo si `canVerify && mandatory && !isMonthly && applies !== 'Empresa'`

**Nunca re-fetchear permisos en el cliente** — siempre recibirlos como prop del Server Component.

## UI del Dialog

### Layout

- `DialogContent` con `sm:max-w-[700px]`
- Header con titulo "Verificacion de Documentos" y nombre del tipo
- Cuerpo con scroll para listas largas

### Estado: Loading

Skeleton que simula la UI final:

- Skeleton de badges de resumen (2 rectangulos inline)
- Skeleton de texto descriptivo (2 lineas)
- Skeleton de Card con tabla (header + 4 filas con celdas simuladas)
- Skeleton de boton al pie

### Estado: Sin inconsistencias

- Icono `CheckCircle2` verde (h-12 w-12) centrado
- Titulo: "Todo en orden"
- Descripcion contextual:
  - Si special: "Los X [empleados/equipos] que cumplen las condiciones tienen su alerta asignada correctamente."
  - Si no special: "Los X [empleados/equipos] activos tienen su alerta asignada correctamente."
- Boton "Cerrar"

### Estado: Con inconsistencias

- **Resumen**: Badges inline
  - Faltantes: Badge amber con icono `UserPlus` (Persona) o `Plus` (Equipos) — "X faltantes"
  - Sobrantes: Badge red con icono `UserMinus` (Persona) o `Minus` (Equipos) — "X sobrantes"
- **Descripcion**: Texto explicativo segun tipo de documento

- **Card Faltantes** (si hay):

  - Borde izquierdo amber, border-dashed
  - Titulo: "Alertas faltantes"
  - Descripcion: "Estos [empleados/equipos] cumplen las condiciones pero no tienen la alerta de documento asignada."
  - Tabla simple:
    - Empleados: Legajo | Apellido | Nombre
    - Equipos: Dominio | N. Interno | Marca | Tipo
  - Si >20 filas: mostrar las primeras 20 + texto "y X mas..."

- **Card Sobrantes** (si hay):

  - Borde izquierdo red, border-dashed
  - Titulo: "Alertas sobrantes"
  - Descripcion: "Estos [empleados/equipos] ya no cumplen las condiciones y tienen una alerta vacia (sin documento subido) que puede eliminarse de forma segura."
  - Misma estructura de tabla

- **Footer**:
  - Boton "Cerrar" (outline, izquierda)
  - Boton "Corregir inconsistencias" (default, derecha)
    - Al clic: AlertDialog de confirmacion
    - Titulo: "Confirmar correccion"
    - Descripcion: "Se crearan X alertas nuevas y se eliminaran Y alertas vacias. Esta accion no elimina documentos ya subidos."
    - Botones: "Cancelar" / "Confirmar"

### Estado: Error

- Icono `AlertTriangle` rojo centrado
- Titulo: "Error al verificar"
- Mensaje de error
- Boton "Reintentar"

### Estado: Correccion exitosa

- Toast success: "Se corrigieron X inconsistencias (Y creadas, Z eliminadas)"
- Dialog se cierra
- Invalidar queries: `queryClient.invalidateQueries({ queryKey: ['doc-types'] })` (queryKey usado por las DataTables de tipos de documento)

## Testing E2E

### Plan de testing con chrome-devtools

Verificar el sistema de condiciones existente creando tipos de documento y validando en BD:

1. **Columna directa**: Crear tipo para empleados con condicion `gender = Masculino`, verificar que solo empleados masculinos reciban alerta
2. **FK (one_to_many)**: Crear tipo con condicion de posicion jerarquica especifica, verificar match
3. **Tabla pivot (many_to_many)**: Crear tipo con condicion de aptitud tecnica, verificar match
4. **Combinacion de filtros**: Crear tipo con 2+ condiciones simultaneas, verificar AND logic
5. **Equipos - FK**: Crear tipo para equipos con condicion de marca, verificar match
6. **Equipos - Enum**: Crear tipo para equipos con condicion de condition/estado
7. **Verificar sobrantes**: Editar condiciones de un tipo existente y verificar que alertas vacias de recursos que ya no matchean se detecten

Cada test:

1. Crear tipo de documento via chrome-devtools (modal en navegador)
2. Consultar BD via MCP Supabase LOCAL para verificar registros creados
3. Validar que SOLO los recursos correctos tienen alerta

## Archivos a Crear/Modificar

### Nuevos

- `src/features/Documentacion/TiposDocumentos/components/_VerifyDocumentsDialog.tsx`
- `src/features/Documentacion/TiposDocumentos/components/_VerifyDocumentsSkeleton.tsx`

### Modificar

- `src/features/Documentacion/TiposDocumentos/components/_DocumentTypeFormModal.tsx` — agregar boton en footer
- `src/features/Documentacion/TiposDocumentos/actions/actions.server.ts` — extraer `buildConditionsWhereClause()`, agregar `verifyDocumentTypeConsistency` y `fixDocumentTypeConsistency`

## Consideraciones

- **Performance**: La verificacion puede ser pesada si hay miles de empleados. Usar queries eficientes con Prisma (no traer todos y filtrar en memoria). El helper `buildConditionsWhereClause` genera WHERE que Prisma ejecuta server-side.
- **Permisos**: Ver seccion "Permisos" arriba para el mapeo exacto de subtab slugs.
- **Concurrencia**: INSERT con re-verificacion dentro de `$transaction` (no `skipDuplicates` — la BD no tiene UNIQUE constraint sobre `(applies, id_document_types)`) y DELETE con WHERE condicionado (`document_path IS NULL AND id_document_types = documentTypeId`) evitan duplicados y borrados accidentales.
- **Skeleton loading**: SIEMPRE usar Skeleton que simule la UI real, NUNCA spinners.
- **Campo `file` de Prisma**: El legajo en la BD es `employees.file`, no `file_number`. Mapear en la server action para consistencia con el resto de la app.
- **BigInt FKs**: Las columnas `province` (empleados) y `brand`, `model`, `type_of_vehicle` (vehiculos) usan BigInt. Los IDs del JSON de conditions son strings y deben convertirse con `map(Number).filter(n => !isNaN(n))`.
