# TabsManager Feature

## Descripción General

`TabsManager` es un sistema de gestión de pestañas (tabs) reutilizable que almacena el estado de las pestañas directamente en la URL mediante parámetros de búsqueda (query params). Esto permite:

- **URLs Compartibles**: Las URLs reflejan el estado exacto de las pestañas activas
- **Navegación Instantánea**: Cambios de pestaña sin recargas de servidor visible
- **Gestión de Historial**: Integración completa con los botones atrás/adelante del navegador
- **Tabs Anidadas**: Soporte para estructuras de pestañas multinivel con limpieza automática de dependencias
- **Limpieza Automática**: Al cambiar de pestaña padre, se limpian automáticamente las sub-pestañas dependientes

## Arquitectura

El feature está compuesto por dos componentes principales:

### 1. `TabsManagerServer` (Server Component)

Componente servidor que:

- Determina la pestaña activa desde `searchParams`
- Aplica filtrado de pestañas basado en roles (futuro)
- Pasa la configuración procesada al componente cliente

### 2. `TabsManagerClient` (Client Component)

Componente cliente que:

- Renderiza la UI de pestañas usando componentes de Radix UI
- Lee el estado desde `searchParams` de la URL
- Actualiza la URL silenciosamente usando `window.history.replaceState`
- Gestiona la navegación instantánea sin recargas del servidor

## Instalación y Setup

### 1. Importar el componente

```typescript
import { TabsManagerServer } from '@/features/TabsManager';
```

### 2. Configurar la página para aceptar `searchParams`

Tu página debe ser un Server Component que acepte `searchParams`:

```typescript
export default async function MiPagina({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="principal"
        tabs={[
          // configuración de tabs
        ]}
      />
    </div>
  );
}
```

## Uso Básico

### Ejemplo Simple

```typescript
import { TabsManagerServer } from '@/features/TabsManager';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="overview"
      tabs={[
        {
          value: 'overview',
          label: 'Vista General',
          content: <OverviewContent />,
        },
        {
          value: 'analytics',
          label: 'Analíticas',
          content: <AnalyticsContent />,
        },
        {
          value: 'settings',
          label: 'Configuración',
          content: <SettingsContent />,
        },
      ]}
    />
  );
}
```

**URL resultante**: `/dashboard?tab=overview`

## Tabs Anidadas

Para implementar pestañas anidadas (sub-tabs), usa múltiples `TabsManagerServer` y configura `dependentParams`:

```typescript
<TabsManagerServer
  paramName="tab"
  searchParams={searchParams}
  defaultTab="principal"
  dependentParams={['subtab']} // Limpia 'subtab' al cambiar 'tab'
  tabs={[
    {
      value: 'documentacion',
      label: 'Documentación',
      content: (
        <div>
          <h2>Documentación</h2>
          {/* Tabs anidadas */}
          <TabsManagerServer
            paramName="subtab"
            searchParams={searchParams}
            defaultTab="empleados"
            tabs={[
              {
                value: 'empleados',
                label: 'Empleados',
                content: <EmpleadosTable />,
              },
              {
                value: 'vehiculos',
                label: 'Vehículos',
                content: <VehiculosTable />,
              },
            ]}
          />
        </div>
      ),
    },
    {
      value: 'estadisticas',
      label: 'Estadísticas',
      content: <EstadisticasContent />,
    },
  ]}
/>
```

**URL resultante**: `/dashboard?tab=documentacion&subtab=empleados`

Cuando el usuario cambie de `documentacion` a `estadisticas`, el parámetro `subtab` se eliminará automáticamente.

## Gestión de Loaders y Suspense

### Problema Común

Si envuelves todo el componente en un `Suspense`, el loader bloqueará toda la UI al cargar datos.

❌ **Evitar**:

```typescript
export default async function MiPagina({ searchParams }) {
  // Esta carga bloquea TODA la página
  const data = await fetchData();

  return (
    <TabsManagerServer
      tabs={[
        {
          value: 'principal',
          content: <Chart data={data} />
        }
      ]}
    />
  );
}
```

### Solución Recomendada

Aísla la carga de datos dentro de cada pestaña usando componentes dedicados:

✅ **Recomendado**:

**Paso 1**: Crea un componente específico para el contenido de cada tab

```typescript
// src/components/MiPagina/PrincipalTabContent.tsx
export default async function PrincipalTabContent() {
  // La carga ocurre SOLO cuando esta pestaña está activa
  const data = await fetchData();

  return <Chart data={data} />;
}
```

**Paso 2**: Envuelve el contenido en `Suspense` con un fallback apropiado

```typescript
import { Suspense } from 'react';
import DashboardSkeleton from '@/components/Skeletons/DashboardSkeleton';
import PrincipalTabContent from '@/components/MiPagina/PrincipalTabContent';

export default function MiPagina({ searchParams }) {
  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="principal"
      tabs={[
        {
          value: 'principal',
          label: 'Principal',
          content: (
            <Suspense fallback={<DashboardSkeleton />}>
              <PrincipalTabContent />
            </Suspense>
          ),
        },
        {
          value: 'configuracion',
          label: 'Configuración',
          content: <ConfiguracionContent />, // Sin carga async, no necesita Suspense
        },
      ]}
    />
  );
}
```

**Beneficios**:

- La estructura de tabs se renderiza inmediatamente
- Solo el contenido de la tab activa muestra el loader
- Otras tabs se mantienen interactivas

## Props de TabsManagerServer

| Prop              | Tipo              | Requerido | Descripción                                                      |
| ----------------- | ----------------- | --------- | ---------------------------------------------------------------- |
| `paramName`       | `string`          | ✅        | Nombre del parámetro de URL (ej: `"tab"` → `?tab=value`)         |
| `searchParams`    | `object`          | ✅        | Objeto `searchParams` de la página (Next.js App Router)          |
| `defaultTab`      | `string`          | ✅        | Valor de la pestaña por defecto                                  |
| `tabs`            | `TabDefinition[]` | ✅        | Array de definiciones de pestañas                                |
| `dependentParams` | `string[]`        | ❌        | Parámetros de URL a limpiar al cambiar de tab (ej: `['subtab']`) |

## Interfaz TabDefinition

```typescript
interface TabDefinition {
  value: string; // Valor único que se guarda en la URL
  label: string; // Texto visible en la pestaña
  content: ReactNode; // Contenido a renderizar cuando la tab está activa
  roles?: string[]; // (Futuro) Roles permitidos para ver esta tab
}
```

## Casos de Uso Avanzados

### 1. Tabs con Contenido Dinámico basado en Datos del Servidor

```typescript
export default async function ProductosPage({ searchParams }) {
  // Obtener categorías desde la base de datos
  const categorias = await fetchCategorias();

  return (
    <TabsManagerServer
      paramName="categoria"
      searchParams={searchParams}
      defaultTab={categorias[0]?.id || 'todas'}
      tabs={categorias.map(cat => ({
        value: cat.id,
        label: cat.nombre,
        content: (
          <Suspense fallback={<ProductosSkeleton />}>
            <ProductosLista categoriaId={cat.id} />
          </Suspense>
        ),
      }))}
    />
  );
}
```

### 2. Múltiples Niveles de Anidamiento

```typescript
<TabsManagerServer
  paramName="seccion"
  defaultTab="ventas"
  dependentParams={['categoria', 'periodo']} // Limpia múltiples params
  tabs={[
    {
      value: 'ventas',
      label: 'Ventas',
      content: (
        <TabsManagerServer
          paramName="categoria"
          defaultTab="productos"
          dependentParams={['periodo']}
          tabs={[
            {
              value: 'productos',
              label: 'Productos',
              content: (
                <TabsManagerServer
                  paramName="periodo"
                  defaultTab="mensual"
                  tabs={[
                    { value: 'mensual', label: 'Mensual', content: <VentasMensuales /> },
                    { value: 'anual', label: 'Anual', content: <VentasAnuales /> },
                  ]}
                />
              ),
            },
            {
              value: 'servicios',
              label: 'Servicios',
              content: <VentasServicios />,
            },
          ]}
        />
      ),
    },
  ]}
/>
```

**URL resultante**: `/reportes?seccion=ventas&categoria=productos&periodo=mensual`

### 3. Integración con Feature Flags

```typescript
import FeatureFlagShow from '@/shared/components/posthug/FeatureFlagShow';
```

<TabsManagerServer
tabs={[
{
value: 'estadisticas',
label: 'Estadísticas',
content: (
<FeatureFlagShow featureFlagName="mostrar_estadisticas_avanzadas">
<EstadisticasAvanzadas />
</FeatureFlagShow>
),
},
]}
/>

````

## Mejores Prácticas

### 1. Nombres de Parámetros Descriptivos

✅ **Bueno**:
```typescript
paramName="tab"           // Tab principal
paramName="subtab"        // Sub-tab
paramName="categoria"     // Específico y claro
````

❌ **Evitar**:

```typescript
paramName = 't'; // Muy corto, no descriptivo
paramName = 'tabValue'; // Redundante con "tab"
```

### 2. Valores de Tab Consistentes

✅ **Bueno**:

```typescript
tabs={[
  { value: 'recursos-humanos', label: 'Recursos Humanos', ... },
  { value: 'operaciones', label: 'Operaciones', ... },
]}
```

❌ **Evitar**:

```typescript
tabs={[
  { value: 'RRHH', label: 'Recursos Humanos', ... },  // Abreviación poco clara
  { value: 'ops-123', label: 'Operaciones', ... },     // Incluye números sin razón
]}
```

### 3. Organización de Componentes de Contenido

Estructura recomendada:

```
src/
├── app/
│   └── productos/
│       └── page.tsx                    # Usa TabsManagerServer
├── components/
│   └── Productos/
│       ├── CatalogoTabContent.tsx      # Contenido de tab "catalogo"
│       ├── InventarioTabContent.tsx    # Contenido de tab "inventario"
│       └── ConfiguracionTabContent.tsx # Contenido de tab "configuracion"
```

### 4. Definir defaultTab Sensato

Elige el `defaultTab` más relevante para el usuario:

```typescript
// Si la mayoría de usuarios empieza por el resumen
defaultTab = 'resumen';

// Si hay un orden lógico de flujo
defaultTab = 'paso-1';
```

### 5. Usar dependentParams para Limpieza Automática

```typescript
// Siempre que una tab tenga sub-tabs, especifica dependentParams
<TabsManagerServer
  paramName="reporte"
  dependentParams={['tipoReporte', 'periodo']} // Limpia sub-parámetros
  tabs={...}
/>
```

## Migración desde Sistema de Cookies

Si estás migrando desde el sistema anterior basado en cookies:

### Antes (Cookies)

```typescript
// Server Component
import { getSubTabCookie } from '@/shared/actions/actions';

const activeTab = await getSubTabCookie('miPagina', 'mainTab');

// Client Component
import { setSubTabCookie } from '@/shared/actions/actions';

const handleChange = (tab) => {
  setSubTabCookie('miPagina', 'mainTab', tab);
};
```

### Después (TabsManager)

```typescript
// Solo necesitas esto en la página
export default function MiPagina({ searchParams }) {
  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="principal"
      tabs={[...]}
    />
  );
}
```

**Ventajas**:

- ✅ Sin Server Actions necesarias
- ✅ URLs compartibles
- ✅ Menos código
- ✅ Mejor rendimiento (sin writes a cookies en cada cambio)

## Troubleshooting

### URL no se actualiza al cambiar de tab

**Causa**: `searchParams` no se pasa correctamente al componente.

**Solución**: Verifica que tu página acepte `searchParams`:

```typescript
export default function MiPagina({ searchParams }) { // ✅ Incluir esto
  return <TabsManagerServer searchParams={searchParams} ... />
}
```

### Tabs anidadas muestran el valor incorrecto

**Causa**: Falta configurar `dependentParams` en el tab padre.

**Solución**: Agrega `dependentParams` para limpiar sub-tabs:

```typescript
<TabsManagerServer
  paramName="tab"
  dependentParams={['subtab']} // ✅ Agregar esto
  ...
/>
```

### Loader se muestra en toda la página

**Causa**: Datos se están cargando en el componente padre en lugar de dentro de cada tab.

**Solución**: Mueve la carga de datos a componentes específicos de cada tab y envuélvelos en `Suspense`. Ver sección [Gestión de Loaders y Suspense](#gestión-de-loaders-y-suspense).

### Componentes reciben Promises en lugar de datos

**Causa**: Estás pasando Promises sin resolver a componentes cliente que esperan datos.

**Solución**:

1. Si el componente usa `use()` de React, pasa la Promise directamente.
2. Si el componente espera datos resueltos, haz `await` en el Server Component padre antes de pasarlos.

```typescript
// Opción 1: Component usa use()
<MiComponente data={fetchData()} />

// Opción 2: Component espera datos resueltos
const data = await fetchData();
<MiComponente data={data} />
```

## Referencia de Archivos

- **Componente Servidor**: `src/features/TabsManager/TabsManagerServer.tsx`
- **Componente Cliente**: `src/features/TabsManager/TabsManagerClient.tsx`
- **Definiciones de Tipos**: `src/features/TabsManager/types.ts`
- **Exportaciones**: `src/features/TabsManager/index.ts`
- **Ejemplo de Uso**: `src/components/Dashboard/DashboardComponent.tsx`

## Próximas Funcionalidades (Roadmap)

- [ ] Filtrado de tabs basado en roles de usuario
- [ ] Soporte para tabs deshabilitadas dinámicamente
- [ ] Animaciones de transición configurables
- [ ] Modo de tabs verticales
- [ ] Persistencia opcional en localStorage para complementar URL
