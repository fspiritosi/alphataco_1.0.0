# Fetching con React Query

## Principio Fundamental

**TODOS los fetching del lado del cliente DEBEN usar `useQuery` de `@tanstack/react-query`.**

**NUNCA** usar `useEffect` + `useState` para fetching de datos.

## Patron Correcto

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllEmployees } from '@/app/server/GET/actions';

function EmployeesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getAllEmployees(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return <EmployeesTable data={data} />;
}

// ❌ INCORRECTO - useEffect + useState
function EmployeesList() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllEmployees()
      .then(setEmployees)
      .finally(() => setIsLoading(false));
  }, []);

  // ... resto del codigo
}
```

## Query con Parametros

```typescript
function EmployeesTable({ filters }: { filters: FilterState }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employees', filters], // ✅ Incluir filtros en queryKey
    queryFn: () => getFilteredEmployees(filters),
    staleTime: 5 * 60 * 1000,
  });

  // ... renderizado
}
```

## Query Dependiente

```typescript
function EmployeeDocuments({ employeeId }: { employeeId: string }) {
  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployeeById(employeeId),
  });

  // ✅ Query que depende de otra
  const { data: documents } = useQuery({
    queryKey: ['documents', employeeId, employee?.company_id],
    queryFn: () => getDocuments(employeeId, employee.company_id),
    enabled: !!employee?.company_id, // Solo ejecutar cuando employee este cargado
  });

  // ... renderizado
}
```

## Invalidacion de Queries

Siempre invalidar queries despues de mutaciones:

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee } from '@/app/server/POST/actions';

function EmployeeForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      // ✅ Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
    },
  });

  return <form onSubmit={(e) => mutation.mutate(formData)}>...</form>;
}
```

## Custom Hooks para Queries

```typescript
// hooks/useEmployees.ts
import { useQuery } from '@tanstack/react-query';
import { getAllEmployees } from '@/app/server/GET/actions';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => getAllEmployees(),
    staleTime: 5 * 60 * 1000,
  });
}

// Uso en componente
function EmployeesList() {
  const { data: employees, isLoading } = useEmployees();
  // ... renderizado
}
```

## Opciones Importantes de useQuery

```typescript
useQuery({
  queryKey: ['employees'],
  queryFn: getAllEmployees,
  staleTime: 5 * 60 * 1000, // Tiempo que los datos se consideran frescos
  enabled: !!id, // Controlar cuando se ejecuta la query
  refetchOnWindowFocus: false, // No refetchear al volver foco
});
```

## Server Actions como Query Functions

```typescript
// ✅ CORRECTO
useQuery({
  queryKey: ['employees'],
  queryFn: () => getAllEmployees(), // Server action
});

// ❌ INCORRECTO - No usar supabaseBrowser directamente
useQuery({
  queryKey: ['employees'],
  queryFn: async () => {
    const supabase = await supabaseBrowser();
    return supabase.from('employees').select('*'); // ❌ Debe ser server action
  },
});
```

## Checklist

- [ ] Usar `useQuery` para todo fetching del lado del cliente
- [ ] NO usar `useEffect` + `useState` para fetching
- [ ] Incluir todas las dependencias en `queryKey` (filtros, parametros, etc.)
- [ ] Invalidar queries despues de mutaciones
- [ ] Usar `enabled` para queries condicionales
- [ ] Configurar `staleTime` apropiado segun el caso
- [ ] Usar server actions en `queryFn`, no llamadas directas a Supabase
- [ ] Crear custom hooks para queries reutilizables
