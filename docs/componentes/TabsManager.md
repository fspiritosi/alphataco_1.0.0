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
- **Filtra pestañas según permisos del usuario en la base de datos**
- Verifica permisos usando `checkPermissionServer()` para cada tab
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

| Prop              | Tipo              | Requerido | Descripción                                                            |
| ----------------- | ----------------- | --------- | ---------------------------------------------------------------------- |
| `paramName`       | `string`          | ✅        | Nombre del parámetro de URL (ej: `"tab"` → `?tab=value`)               |
| `searchParams`    | `object`          | ✅        | Objeto `searchParams` de la página (Next.js App Router)                |
| `defaultTab`      | `string`          | ✅        | Valor de la pestaña por defecto (debe coincidir con algún `tab.value`) |
| `tabs`            | `TabDefinition[]` | ✅        | Array de definiciones de pestañas con tipado fuerte                    |
| `dependentParams` | `string[]`        | ❌        | Parámetros de URL a limpiar al cambiar de tab (ver explicación abajo)  |

### ¿Qué es `dependentParams`?

`dependentParams` es un array de nombres de parámetros de URL que deben limpiarse cuando el usuario cambia de tab principal. Esto evita estados inconsistentes en tabs anidadas.

**Ejemplo sin `dependentParams`:**

```
URL inicial: /dashboard?tab=documentacion&subtab=empleados
Usuario cambia a: tab="estadisticas"
URL resultante: /dashboard?tab=estadisticas&subtab=empleados ❌
Problema: "subtab=empleados" no existe en "estadisticas"
```

**Ejemplo con `dependentParams={['subtab']}`:**

```
URL inicial: /dashboard?tab=documentacion&subtab=empleados
Usuario cambia a: tab="estadisticas"
URL resultante: /dashboard?tab=estadisticas ✅
Solución: "subtab" se limpia automáticamente
```

**Cuándo usar:**

- ✅ Cuando tienes tabs anidadas (tabs dentro de tabs)
- ✅ Cuando un parámetro de URL solo tiene sentido en ciertos tabs
- ❌ No necesario si todas las tabs son del mismo nivel

## Interfaz TabDefinition

```typescript
interface TabDefinition<M extends ModuleSlug = ModuleSlug> {
  value: string; // Valor único que se guarda en la URL
  label: string | ReactNode; // Texto o componente visible en la pestaña
  content: ReactNode; // Contenido a renderizar cuando la tab está activa
  moduleSlug?: M; // Slug del módulo para verificación de permisos (con tipado fuerte)
  tabSlug?: TabSlug<M> | SubtabSlug<M, any> | string; // Slug del tab/subtab (con autocompletado)
}
```

### Tipado Fuerte

El `TabsManager` ahora usa tipado genérico que proporciona:

- ✅ **Autocompletado** de `moduleSlug` con todos los módulos disponibles
- ✅ **Autocompletado** de `tabSlug` con tabs Y subtabs del módulo seleccionado
- ✅ **Validación en tiempo de compilación** para evitar errores de tipeo
- ✅ **IntelliSense** completo en tu IDE

**Tipos exportados:**

```typescript
// Tipo para módulos
type ModuleSlug = 'dashboard' | 'empleados' | 'equipos' | ...

// Tipo para tabs de un módulo específico
type TabSlug<'dashboard'> = 'principal' | 'documentacion' | 'estadisticas'

// Tipo para subtabs de un tab específico
type SubtabSlug<'dashboard', 'documentacion'> = 'empleados' | 'vehiculos'

// Tipo que incluye tabs Y subtabs de un módulo
type AllTabSlugs<'dashboard'> =
  | 'principal'
  | 'documentacion'
  | 'estadisticas'
  | 'empleados'      // ← subtab de 'documentacion'
  | 'vehiculos'      // ← subtab de 'documentacion'
  | 'operaciones'    // ← subtab de 'estadisticas'
  | 'rrhh'           // ← subtab de 'estadisticas'
  | 'mantenimiento'  // ← subtab de 'estadisticas'
```

**Nota:** El tipo `AllTabSlugs` es el que usa `tabSlug` en `TabDefinition`, por eso autocompleta tanto tabs como subtabs.

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

### 6. Configurar Permisos Correctamente

✅ **Bueno**:

```typescript
{
  value: 'estadisticas',
  label: 'Estadísticas',
  moduleSlug: 'dashboard',      // Slug del módulo
  tabSlug: 'estadisticas',      // Slug del tab (debe existir en permissions-map.ts)
  content: <EstadisticasContent />,
}
```

❌ **Evitar**:

```typescript
{
  value: 'estadisticas',
  label: 'Estadísticas',
  moduleSlug: 'dashboard',
  tabSlug: 'stats',  // ❌ No coincide con permissions-map.ts
  content: <EstadisticasContent />,
}
```

**Regla**: Los valores de `moduleSlug` y `tabSlug` deben coincidir EXACTAMENTE con los definidos en `permissions-map.ts`

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

## Sistema de Permisos

### Configuración de Permisos por Tab

El `TabsManager` ahora soporta filtrado automático de tabs basado en permisos del usuario. Para habilitar esta funcionalidad, agrega `moduleSlug` y `tabSlug` a cada tab:

```typescript
<TabsManagerServer
  paramName="tab"
  searchParams={searchParams}
  defaultTab="principal"
  tabs={[
    {
      value: 'principal',
      label: 'Principal',
      moduleSlug: 'dashboard',  // ← Slug del módulo
      tabSlug: 'principal',      // ← Slug del tab
      content: <PrincipalContent />,
    },
    {
      value: 'documentacion',
      label: 'Documentación',
      moduleSlug: 'dashboard',
      tabSlug: 'documentacion',
      content: <DocumentacionContent />,
    },
  ]}
/>
```

### Cómo Funciona

1. **Verificación Server-Side**: `TabsManagerServer` verifica permisos en el servidor usando `checkPermissionServer(moduleSlug, tabSlug, 'view')`
2. **Filtrado Automático**: Solo las tabs con permiso de `view` se muestran al usuario
3. **Seguridad**: Si un usuario intenta acceder a una tab sin permisos (manipulando la URL), no verá el contenido
4. **Mensaje de Fallback**: Si no tiene permisos para ninguna tab, se muestra un mensaje informativo

### Tabs sin Restricción

Si una tab **NO** tiene `moduleSlug` y `tabSlug`, se mostrará siempre (sin verificación de permisos):

```typescript
{
  value: 'ayuda',
  label: 'Ayuda',
  // Sin moduleSlug/tabSlug = visible para todos
  content: <AyudaContent />,
}
```

### Permisos en Tabs Anidadas

El sistema funciona recursivamente para cualquier nivel de anidación:

```typescript
<TabsManagerServer
  paramName="tab"
  tabs={[
    {
      value: 'documentacion',
      label: 'Documentación',
      moduleSlug: 'dashboard',
      tabSlug: 'documentacion',  // ← Verifica permiso nivel 1
      content: (
        <TabsManagerServer
          paramName="subtab"
          tabs={[
            {
              value: 'empleados',
              label: 'Empleados',
              moduleSlug: 'dashboard',
              tabSlug: 'empleados',  // ← Verifica permiso nivel 2
              content: <EmpleadosTable />,
            },
            {
              value: 'vehiculos',
              label: 'Vehículos',
              moduleSlug: 'dashboard',
              tabSlug: 'vehiculos',  // ← Verifica permiso nivel 2
              content: <VehiculosTable />,
            },
          ]}
        />
      ),
    },
  ]}
/>
```

**Comportamiento en cascada:**

- Si el usuario NO tiene permiso para `documentacion`, no verá esa tab ni sus subtabs
- Si tiene permiso para `documentacion` pero NO para `empleados`, verá la tab principal pero no la subtab de empleados

### Cómo Obtener los Slugs Correctos

Los slugs se obtienen de `src/features/Permissions/permissions-map.ts`. Este archivo contiene la estructura completa de módulos, tabs y subtabs del sistema.

#### Paso 1: Abrir el archivo permissions-map.ts

```typescript
// src/features/Permissions/permissions-map.ts
export const PERMISSIONS = {
  dashboard: {
    // ← moduleSlug
    slug: 'dashboard',
    tabs: {
      principal: {
        // ← tabSlug (nivel 1)
        slug: 'principal',
        tabId: '90000000-0000-0000-0000-000000000001',
      },
      documentacion: {
        // ← tabSlug (nivel 1)
        slug: 'documentacion',
        tabId: '90000000-0000-0000-0000-000000000002',
        subtabs: {
          empleados: {
            // ← tabSlug (nivel 2 - subtab)
            slug: 'empleados',
            tabId: '90000000-0000-0000-0000-000000000021',
          },
          vehiculos: {
            // ← tabSlug (nivel 2 - subtab)
            slug: 'vehiculos',
            tabId: '90000000-0000-0000-0000-000000000022',
          },
        },
      },
    },
  },
  empleados: {
    // ← Otro módulo
    slug: 'empleados',
    tabs: {
      employees: {
        slug: 'employees',
        tabId: '20000000-0000-0000-0000-000000000001',
      },
    },
  },
};
```

#### Paso 2: Usar los slugs en tu componente

Con el tipado fuerte, tu IDE te mostrará autocompletado:

```typescript
<TabsManagerServer
  tabs={[
    {
      value: 'principal',
      label: 'Principal',
      moduleSlug: 'dashboard',  // ← Tu IDE autocompleta: 'dashboard', 'empleados', 'equipos', etc.
      tabSlug: 'principal',      // ← Tu IDE autocompleta solo tabs de 'dashboard'
      content: <PrincipalContent />,
    },
  ]}
/>
```

#### Paso 3: Verificar en la Base de Datos (Opcional)

Si necesitas verificar que los slugs existen en la BD:

```sql
-- Ver todos los módulos
SELECT id, slug, name FROM modules;

-- Ver tabs de un módulo específico
SELECT t.id, t.slug, t.name, t.parent_tab_id
FROM tabs t
JOIN modules m ON t.module_id = m.id
WHERE m.slug = 'dashboard'
ORDER BY t.order_index;
```

#### Helpers Disponibles

El `permissions-map.ts` también exporta funciones helper:

```typescript
import { getTabId, getSubtabId } from '@/features/Permissions/permissions-map';

// Obtener el ID de un tab
const tabId = getTabId('dashboard', 'principal');
// Retorna: '90000000-0000-0000-0000-000000000001'

// Obtener el ID de un subtab
const subtabId = getSubtabId('dashboard', 'documentacion', 'empleados');
// Retorna: '90000000-0000-0000-0000-000000000021'
```

### Gestión de Permisos

Para asignar permisos a usuarios:

1. **Via UI**: Ir a `Roles / Presets` → `Permisos por Módulo`
2. **Via Código**: Usar funciones de `@/features/Permissions`:

   ```typescript
   import { setUserPermission } from '@/features/Permissions';

   await setUserPermission(userId, tabId, actionId, true);
   ```

### Ejemplo Completo con Permisos y Tipado Fuerte

```typescript
import { TabsManagerServer } from '@/features/TabsManager';

export default async function Dashboard({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // ✅ Usa `as const` para habilitar autocompletado de defaultTab
  const mainTabs = [
    {
      value: 'principal',
      label: 'Principal',
      moduleSlug: 'dashboard',  // ← Tu IDE autocompleta: 'dashboard', 'empleados', 'equipos', etc.
      tabSlug: 'principal',      // ← Tu IDE autocompleta solo tabs de 'dashboard'
      content: <PrincipalTabContent />,
    },
    {
      value: 'estadisticas',
      label: 'Estadísticas',
      moduleSlug: 'dashboard',
      tabSlug: 'estadisticas',
      content: (
        <TabsManagerServer
          paramName="subtab"
          searchParams={searchParams}
          defaultTab="operaciones"  // ← Autocompletado: 'operaciones' | 'rrhh' | 'mantenimiento'
          tabs={[
            {
              value: 'operaciones',
              label: 'Operaciones',
              moduleSlug: 'dashboard',
              tabSlug: 'operaciones',
              content: <OperacionesContent />,
            },
            {
              value: 'rrhh',
              label: 'RRHH',
              moduleSlug: 'dashboard',
              tabSlug: 'rrhh',
              content: <RRHHContent />,
            },
            {
              value: 'mantenimiento',
              label: 'Mantenimiento',
              moduleSlug: 'dashboard',
              tabSlug: 'mantenimiento',
              content: <MantenimientoContent />,
            },
          ] as const}  // ← `as const` habilita autocompletado de defaultTab
        />
      ),
    },
  ] as const;  // ← `as const` habilita autocompletado de defaultTab

  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="principal"  // ← Autocompletado: 'principal' | 'estadisticas'
      dependentParams={['subtab']}
      tabs={mainTabs}
    />
  );
}
```

**Ventajas del tipado fuerte:**

- ✅ Si escribes mal un `moduleSlug`, TypeScript te alertará
- ✅ Si usas un `tabSlug` que no existe en ese módulo, TypeScript te alertará
- ✅ **Autocompletado de `defaultTab`** según los valores de `tabs` (usa `as const`)
- ✅ Autocompletado completo en tu IDE (VSCode, WebStorm, etc.)
- ✅ Refactoring seguro: si cambias un slug en `permissions-map.ts`, TypeScript te mostrará todos los lugares que necesitas actualizar

**Nota sobre `as const`:**

- Usa `as const` al final del array de tabs para habilitar el autocompletado de `defaultTab`
- Sin `as const`, `defaultTab` acepta cualquier string
- Con `as const`, `defaultTab` solo acepta los valores que existen en `tabs[].value`

### Troubleshooting de Permisos

#### Usuario no ve ninguna tab

**Causa**: El usuario no tiene permisos de `view` para ninguna tab.

**Solución**:

1. Verificar que el usuario tenga un rol asignado
2. Verificar que el rol tenga permisos para los tabs
3. Usar la UI de gestión de permisos para asignar permisos

#### Tab se muestra pero no debería

**Causa**: Falta agregar `moduleSlug` y `tabSlug` a la definición de la tab.

**Solución**: Agregar los slugs correspondientes:

```typescript
{
  value: 'mi-tab',
  label: 'Mi Tab',
  moduleSlug: 'dashboard',  // ← Agregar
  tabSlug: 'mi-tab',        // ← Agregar
  content: <MiTabContent />,
}
```

#### Error: "Permission denied"

**Causa**: El slug no existe en `permissions-map.ts` o en la base de datos.

**Solución**:

1. Verificar que el slug esté definido en `permissions-map.ts`
2. Verificar que exista en la tabla `tabs` de la base de datos
3. Ejecutar las migraciones si es necesario

## Próximas Funcionalidades (Roadmap)

- [x] ✅ Filtrado de tabs basado en permisos de usuario
- [ ] Soporte para tabs deshabilitadas dinámicamente
- [ ] Animaciones de transición configurables
- [ ] Modo de tabs verticales
- [ ] Persistencia opcional en localStorage para complementar URL
- [ ] Caché de permisos para optimizar performance
