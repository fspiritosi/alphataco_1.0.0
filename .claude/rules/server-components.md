# Server Components First (Prioridad)

## Principio Fundamental

**SIEMPRE priorizar Server Components. El fetching DEBE estar del lado del servidor cuando sea posible.**

Solo usar Client Components (`'use client'`) para:

- Interactividad (onClick, onChange, etc.)
- Hooks de React (useState, useEffect, etc.)
- Context API
- React Query en el cliente (cuando no se puede hacer en servidor)

## Server Component por Defecto

```typescript
// ✅ Server Component (NO necesita 'use client')
import { getAllEmployees } from '@/app/server/GET/actions';

export default async function EmployeesPage() {
  // ✅ Fetching en el servidor
  const employees = await getAllEmployees();

  return (
    <div>
      <h1>Empleados</h1>
      <EmployeesTable data={employees} />
    </div>
  );
}

// ❌ INCORRECTO - Client Component innecesario
'use client';

import { useEffect, useState } from 'react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getAllEmployees().then(setEmployees); // ❌ Fetching en cliente innecesario
  }, []);

  return <EmployeesTable data={employees} />;
}
```

## Datos Iniciales del Servidor

```typescript
// Server Component
export default async function EmployeesPage({ searchParams }) {
  // ✅ Cargar datos iniciales en servidor
  const initialData = await getAllEmployees();

  return <EmployeesTableClient initialData={initialData} />;
}

// Client Component (solo para interactividad)
'use client';

export function EmployeesTableClient({ initialData }) {
  const { data } = useQuery({
    queryKey: ['employees'],
    queryFn: getAllEmployees,
    initialData, // ✅ Datos iniciales del servidor
  });

  return <EmployeesTable data={data} />;
}
```

## Cuando Usar Client Components

### 1. Interactividad

```typescript
'use client';

export function ButtonWithAction() {
  const handleClick = () => {
    // ✅ Interactividad requiere 'use client'
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### 2. Estado Local (useState)

```typescript
'use client';

export function FormComponent() {
  const [value, setValue] = useState(''); // ✅ Estado local requiere 'use client'

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### 3. React Query para Refetching/Invalidacion

```typescript
'use client';

export function EmployeesTableClient({ initialData }) {
  // ✅ React Query para refetching y invalidacion
  const { data } = useQuery({
    queryKey: ['employees'],
    queryFn: getAllEmployees,
    initialData,
  });

  // ✅ Mutaciones requieren 'use client'
  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  return <EmployeesTable data={data} onAdd={mutation.mutate} />;
}
```

### 4. Context API

```typescript
'use client';

const ThemeContext = createContext(); // ✅ Context requiere 'use client'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## Patron Hibrido Recomendado

```typescript
// ✅ Server Component - Fetching y estructura
export default async function EmployeesPage({ searchParams }) {
  // ✅ Fetching en servidor
  const initialEmployees = await getAllEmployees();
  const filters = parseSearchParams(searchParams);

  return (
    <div>
      <h1>Empleados</h1>
      {/* ✅ Client Component solo para interactividad */}
      <EmployeesTableClient
        initialData={initialEmployees}
        filters={filters}
      />
    </div>
  );
}

// ✅ Client Component - Solo interactividad
'use client';

export function EmployeesTableClient({ initialData, filters }) {
  // ✅ React Query para refetching con filtros
  const { data } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => getFilteredEmployees(filters),
    initialData,
  });

  const [selectedRows, setSelectedRows] = useState([]); // ✅ Estado local

  return (
    <EmployeesTable
      data={data}
      selectedRows={selectedRows}
      onSelectRows={setSelectedRows} // ✅ Interactividad
    />
  );
}
```

## Suspense y Loading States

### Principio

**Usar `Suspense` para Server Components y `isLoading` de `useQuery` para Client Components.**

| Tipo de Componente | Solucion de Loading                  |
| ------------------ | ------------------------------------ |
| Server Component   | `<Suspense fallback={<Skeleton />}>` |
| Client Component   | `isLoading` from `useQuery`          |

### Server Components - Usar Suspense

```typescript
import { Suspense } from 'react';

export default async function DocumentPage({ searchParams }) {
  return (
    <TabsManagerServer
      tabs={[
        {
          value: 'tipos',
          label: 'Tipos',
          content: (
            <Suspense fallback={<div>Cargando tipos de documentos...</div>}>
              <TiposDocumentosTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
```

### Aislar Suspense por Componente

```typescript
// ❌ INCORRECTO - Bloquea toda la UI
export default async function Page() {
  const data = await fetchAllData(); // ❌ Bloquea toda la pagina

  return (
    <Suspense fallback={<Loader />}>
      <Component1 data={data} />
      <Component2 data={data} />
    </Suspense>
  );
}

// ✅ CORRECTO - Carga aislada por componente
export default async function Page() {
  return (
    <div>
      <Suspense fallback={<Component1Skeleton />}>
        <Component1Content /> {/* Carga sus propios datos */}
      </Suspense>
      <Suspense fallback={<Component2Skeleton />}>
        <Component2Content /> {/* Carga sus propios datos */}
      </Suspense>
    </div>
  );
}
```

### Client Components - Usar isLoading de useQuery

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export function EmployeesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getAllEmployees(),
  });

  // ✅ Usar isLoading de useQuery
  if (isLoading) {
    return <EmployeesTableSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <EmployeesTable data={data} />;
}
```

## Checklist

- [ ] Server Components: Usar `Suspense` con fallback
- [ ] Client Components: Usar `isLoading` de `useQuery`
- [ ] NO usar `Suspense` en Client Components
- [ ] Aislar carga de datos por componente/tab
- [ ] Crear componentes Skeleton especificos
- [ ] Manejar multiples loading states apropiadamente
- [ ] Pasar `initialData` cuando hay datos del servidor
