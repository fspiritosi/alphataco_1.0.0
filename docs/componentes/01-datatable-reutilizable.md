# Tabla Reutilizable (`BaseDataTable`)

Este sistema permite crear tablas altamente reutilizables y personalizables en React, con soporte para filtros, búsqueda, exportación a Excel, paginación y control de visibilidad de columnas.

## Componentes principales

### 1. `BaseDataTable`

Componente principal que renderiza la tabla y orquesta las funcionalidades:

- **Props clave:**
  - `columns`: Definición de columnas (usa `@tanstack/react-table`).
  - `data`: Datos a mostrar.
  - `onRowClick`: Acción al hacer clic en una fila (opcional).
  - `toolbarOptions`: Configuración de la toolbar (filtros, búsqueda, acciones extra).
  - `paginationComponent`: Componente de paginación personalizado (opcional).
  - `className`, `tableId`, `initialColumnVisibility`, `savedVisibility`: Personalización y persistencia de visibilidad de columnas.

### 2. `DataTableToolbarBase`

Toolbar flexible que permite:

- Búsqueda por columnas.
- Filtros facetados (multiselección).
- Acciones extra (botones personalizados).
- Control de visibilidad de columnas.

**Props clave:**

- `filterableColumns`: Columnas con filtros facetados.
- `searchableColumns`: Columnas con búsqueda.
- `showViewOptions`: Mostrar/ocultar selector de columnas.
- `extraActions`: ReactNode o función para acciones adicionales.
- `tableId`: Persistencia de visibilidad.

### 3. `DataTableFacetedFilter`

Filtro facetado para una columna específica. Permite seleccionar múltiples valores y limpiar filtros fácilmente.

### 4. `DataTableExportExcel`

Botón para exportar la tabla (solo columnas visibles y filas filtradas) a Excel. Permite elegir el nombre del archivo.

### 5. `DataTablePagination`

Componente de paginación. Permite seleccionar cantidad de filas por página y navegar entre páginas.

### 6. `DataTableViewOptions`

Permite mostrar/ocultar columnas y guardar la preferencia en cookies/localStorage.

### 7. `DataTableColumnHeader`

Encabezado de columna con soporte para ordenamiento (ascendente/descendente).

---

## Ejemplo de uso básico

```tsx
import { BaseDataTable } from 'src/shared/components/data-table/base/data-table';

const columns = [
  // Definición de columnas usando @tanstack/react-table
];

const data = [
  // Tus datos
];

<BaseDataTable
  columns={columns}
  data={data}
  toolbarOptions={{
    filterableColumns: [
      {
        columnId: 'estado',
        title: 'Estado',
        options: [
          { label: 'Activo', value: 'activo' },
          { label: 'Inactivo', value: 'inactivo' },
        ],
      },
    ],
    searchableColumns: [{ columnId: 'nombre', placeholder: 'Buscar por nombre...' }],
    showViewOptions: true,
    extraActions: <DataTableExportExcel table={table} />,
  }}
  tableId="clientes-table"
  ks
  savedVisibility={{ nombre: true, estado: true }}
/>;
```

---

## Personalización y recomendaciones

- **Persistencia de columnas:** Usa `tableId` para que cada tabla recuerde las columnas visibles.
- **Filtros y búsqueda:** Define `filterableColumns` y `searchableColumns` según tus necesidades.
- **Acciones extra:** Puedes añadir botones personalizados (ejemplo: exportar a Excel).
- **Paginación:** Usa el componente por defecto o personaliza con tu propio paginador.

---

## Archivos y estructura

- `base/`
  - `data-table.tsx`: Componente principal.
  - `data-table-pagination.tsx`: Paginación.
  - `data-table-export-excel.tsx`: Exportar a Excel.
  - `data-table-view-options.tsx`: Mostrar/ocultar columnas.
  - `data-table-column-header.tsx`: Encabezados con ordenamiento.
- `filters/`
  - `data-table-faceted-filter.tsx`: Filtros facetados.
- `toolbars/`
  - `data-table-toolbar-base.tsx`: Toolbar configurable.

---

## Requisitos

- React
- @tanstack/react-table
- js-cookie (para persistencia de columnas)
- xlsx (para exportar a Excel)

---

Este sistema de tabla es flexible, extensible y pensado para reutilizar en diferentes módulos del sistema, permitiendo una experiencia consistente y configurable para el usuario final.
