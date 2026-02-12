# TabContent y Componentes de Tabs

## Principio Fundamental

**Los componentes `TabContent` NO deben tener `'use client'` si solo sirven como wrapper. El `'use client'` debe estar en el componente interno que realmente necesita interactividad.**

## Reglas de TabContent

### 1. TabContent como Server Component

```typescript
// ✅ CORRECTO - TabContent es Server Component
// SolicitudesMantenimientoTabContent.tsx
import { getMaintenanceRequests } from './actions/actionsServer';
import { SolicitudesTableClient } from './components/SolicitudesTableClient';

export async function SolicitudesMantenimientoTabContent() {
  // ✅ Fetching en el servidor
  const initialData = await getMaintenanceRequests();

  return <SolicitudesTableClient initialData={initialData} />;
}

// ❌ INCORRECTO - TabContent con 'use client' innecesario
'use client';

export function SolicitudesMantenimientoTabContent() {
  return <SolicitudesTable />; // ❌ Solo es un wrapper, no necesita 'use client'
}
```

### 2. Fetching SIEMPRE en el Server (cuando sea posible)

**REGLA CRITICA**: Si el fetching de datos NO depende de interaccion del usuario (clicks, filtros dinamicos), DEBE hacerse en el servidor.

```typescript
// ✅ CORRECTO - Datos cargados en Server Component
export async function MyTabContent() {
  const data = await getMyData(); // Server-side fetch
  return <MyTableClient initialData={data} />;
}

// ❌ INCORRECTO - Fetching en cliente sin necesidad
'use client';

export function MyTabContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-data'],
    queryFn: getMyData, // ❌ Esto podria estar en el servidor
  });

  if (isLoading) return <Skeleton />;
  return <MyTable data={data} />;
}
```

### 3. Cliente Solo para Interactividad

El Client Component interno debe:

- Recibir `initialData` del servidor
- Usar `useQuery` con `initialData` para refetching/invalidacion
- Manejar estado local (seleccion, dialogos, etc.)

```typescript
// ✅ Client Component que recibe datos iniciales
'use client';

export function MyTableClient({ initialData }: { initialData: MyData[] }) {
  const [selectedItem, setSelectedItem] = useState<MyData | null>(null);

  // ✅ useQuery con initialData para refetching
  const { data } = useQuery({
    queryKey: ['my-data'],
    queryFn: getMyData,
    initialData, // ✅ Datos del servidor
  });

  return (
    <>
      <DataTable data={data || []} onSelect={setSelectedItem} />
      {selectedItem && <DetailDialog item={selectedItem} />}
    </>
  );
}
```

## Componentes Fallback para Suspense

### Regla: Crear Componentes Fallback Dedicados

**NUNCA** usar `<div>Cargando...</div>` como fallback en `Suspense`. SIEMPRE crear un componente Skeleton dedicado.

```typescript
// ❌ INCORRECTO - Fallback generico
<Suspense fallback={<div>Cargando solicitudes...</div>}>
  <SolicitudesTabContent />
</Suspense>

// ✅ CORRECTO - Componente Skeleton dedicado
<Suspense fallback={<SolicitudesTableSkeleton />}>
  <SolicitudesTabContent />
</Suspense>
```

### Ubicacion de Fallbacks

Los componentes Skeleton/Fallback deben ubicarse en:

```
src/features/{Feature}/
├── fallback/
│   ├── {ComponentName}Skeleton.tsx
│
```

### Ejemplo de Componente Skeleton

```typescript
// src/features/Mantenimiento/SolicitudesMantenimiento/fallback/SolicitudesTableSkeleton.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SolicitudesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de Mantenimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
```

## Checklist: Crear Nueva Tab

- [ ] Crear `{Tab}TabContent.tsx` como **Server Component** (sin `'use client'`)
- [ ] Hacer fetching de datos iniciales en el Server Component
- [ ] Crear `{Component}Client.tsx` con `'use client'` para interactividad
- [ ] Pasar `initialData` como prop al componente cliente
- [ ] Crear `fallback/{Component}Skeleton.tsx` para el Suspense
- [ ] Usar el Skeleton en el `Suspense fallback` donde se renderiza la tab
