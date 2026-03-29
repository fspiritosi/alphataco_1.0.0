# Dashboard Diagram Links — Design Spec

## Objetivo

Hacer que cada item de la leyenda "Novedades cargadas" (gráfico de Recursos Humanos en el dashboard) sea un link que abre en pestaña nueva la página de diagramas (`/dashboard/employee?tab=diagrams&subtab=old`) con filtros pre-aplicados por URL. Refactorizar `EmployesDiagramWrapper` para leer/escribir filtros en URL params con `paramNamespace`, ejecutar búsqueda automática cuando llegan filtros por URL, y migrar cualquier código Supabase restante a Prisma.

## Decisiones de diseño

- **Filtro por ID** del diagram_type (no por nombre) — más robusto ante renombramientos.
- **paramNamespace `diagOld_`** — evita colisión con params de otras tabs.
- **Auto-ejecución** cuando hay filtros en URL al montar.
- **`router.replace`** (no push) para no llenar historial al filtrar.
- **"Sin diagrama"** usa valor especial `__none__` en el param.
- **Grilla calendario (`DiagramEmployeeViewCOPI`) no se modifica** — solo cambia el panel de filtros y su fuente de estado.
- **Realtime de Supabase** (`postgres_changes`) se mantiene — Prisma no tiene equivalente.

---

## Sección 1: Leyenda del Dashboard (origen del link)

**Componente:** `src/features/Dashboard/Principal/components/RrhhSectionClient.tsx`

### Cambios

1. Eliminar `.slice(0, 6)` y el texto `+N más` — se renderizan todos los items.
2. Mantener `max-h-[80px] overflow-y-auto` existente para scroll autocontenido.
3. Cada item se convierte en `<Link>` de Next.js con `target="_blank"`:
   - URL: `/dashboard/employee?tab=diagrams&subtab=old&diagOld_diagramType=DIAGRAM_TYPE_ID&diagOld_position=POS_ID_1,POS_ID_2`
   - Para "Sin diagrama": `diagOld_diagramType=__none__`
   - Los `position` IDs se leen de la cookie `position-filter` que gestiona `CookieFilter`.
4. Estilo: mantener bolita de color + nombre + count, agregar cursor pointer y hover sutil.

### Datos necesarios

`getDiagramIndicators()` actualmente retorna `{ diagram_type_name, diagram_type_color, cantidad_empleados }`. Debe retornar también el `diagram_type_id` (UUID) para construir el link. Para "Sin diagrama" retornar `id: '__none__'`.

---

## Sección 2: URL Params con paramNamespace

**Namespace:** `diagOld_`

| Param (sin prefijo) | Tipo                     | Origen                        |
| ------------------- | ------------------------ | ----------------------------- |
| `diagramType`       | UUID o `__none__`        | Link dashboard / filtro local |
| `position`          | UUIDs separados por coma | Link dashboard / filtro local |
| `firstname`         | string                   | Filtro local                  |
| `lastname`          | string                   | Filtro local                  |
| `workflow`          | UUIDs separados por coma | Filtro local                  |
| `costCenter`        | UUIDs separados por coma | Filtro local                  |
| `covenant`          | UUIDs separados por coma | Filtro local                  |
| `guild`             | UUIDs separados por coma | Filtro local                  |
| `category`          | UUIDs separados por coma | Filtro local                  |
| `contractor`        | UUIDs separados por coma | Filtro local                  |

### Comportamiento

- Al montar: leer `searchParams` con prefijo `diagOld_`.
- Si hay filtros en URL → ejecutar búsqueda automáticamente.
- Si no hay filtros → comportamiento actual (esperar "Buscar").
- Al hacer "Buscar" manualmente → `router.replace` con filtros actuales.
- Al limpiar filtros → eliminar params `diagOld_*` de la URL.
- Al cambiar de tab → params dejan de leerse (componente se desmonta).

---

## Sección 3: Manejo de "Sin diagrama"

**`diagOld_diagramType=__none__`:**

- En `searchEmployeeDiagrams`: filtrar empleados activos que NO tienen registro en `employees_diagram` para hoy.
- Prisma: `employees_diagram: { none: { <date filters for today> } }`.
- Panel de filtros: selector de diagrama muestra "Sin diagrama" seleccionado.
- Grilla: celdas vacías (sin color).

**UUID válido:**

- Filtrar empleados con `employees_diagram` de ese `diagram_type_id` para hoy.
- Comportamiento normal de la grilla.

---

## Sección 4: Refactorización de EmployesDiagramWrapper

### Hook `useDiagramFilters`

Ubicación: `src/features/Employees/Diagrams/hooks/useDiagramFilters.ts`

API:

```typescript
function useDiagramFilters(
  namespace: string,
  searchParams: Record<string, string | string[] | undefined>
): {
  filters: DiagramFilterState;
  setFilter: (key: string, value: string | string[] | undefined) => void;
  syncToUrl: () => void; // router.replace con filtros actuales
  clearFilters: () => void; // elimina todos los params con prefijo
  hasUrlFilters: boolean; // indica si había filtros en URL al montar
};
```

### Cambios en EmployesDiagramWrapper

1. Reemplazar múltiples `useState` por `useDiagramFilters('diagOld_', searchParams)`.
2. Submit → llama `syncToUrl()` + ejecuta búsqueda.
3. "Limpiar filtros" → llama `clearFilters()`.
4. Auto-ejecución: `useEffect` legítimo — si `hasUrlFilters === true`, ejecutar búsqueda al montar (sincronización con estado externo: la URL).
5. Los filtros se renderizan visualmente igual.

### Migración Supabase → Prisma

- Verificar `searchEmployeeDiagrams` y `getDiagramFilterOptions` — ya usan Prisma. Confirmar que no quede Supabase.
- Realtime de Supabase (`postgres_changes` en `DiagramEmployeeViewCOPI`) se mantiene.

### Estructura de archivos

```
src/features/Employees/Diagrams/
├── EmployesDiagram.tsx                    # Sin cambios
├── EmployesDiagramWrapper.tsx             # Refactorizar filtros a URL params
├── DiagramEmployeeViewCOPI.tsx            # Sin cambios
├── hooks/
│   └── useDiagramFilters.ts              # Nuevo hook
├── actions/
│   └── diagram-search-actions.ts         # Agregar soporte __none__, verificar Prisma
```

---

## Fuera de alcance

- No se modifica `DiagramEmployeeViewCOPI` (grilla calendario).
- No se modifica el donut chart (solo la leyenda).
- No se crean DataTables nuevas.
- No se migra el realtime de Supabase.
