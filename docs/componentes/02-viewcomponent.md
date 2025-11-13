# Documentación Técnica: ViewComponent y ViewComponentInternal

## ViewComponent

**Ubicación:** `src/components/ViewComponent.tsx`

### Propósito

`ViewComponent` es un componente de alto nivel para renderizar vistas con pestañas (tabs) y control de acceso por roles. Permite mostrar diferentes secciones de contenido según la pestaña seleccionada, restringiendo el acceso a ciertas pestañas según el rol del usuario autenticado.

### Props

- **viewData** (`ViewDataObj`): Objeto de configuración que define la estructura de las pestañas, el contenido de cada una, restricciones de acceso y acciones asociadas.

#### Estructura de `ViewDataObj`:

```typescript
interface ViewDataObj {
  defaultValue: string; // Valor inicial de la pestaña activa
  path: string; // Ruta base para los links de las pestañas
  tabsValues: Array<{
    value: string; // Valor identificador de la pestaña
    name: React.ReactNode | string; // Nombre o nodo a mostrar en la pestaña
    restricted: string[]; // Lista de roles restringidos para esta pestaña
    content: {
      title: string;
      description?: string;
      buttonActioRestricted: string[];
      buttonAction?: React.ReactNode;
      component: React.ReactNode; // Componente a renderizar en el contenido
    };
  }>;
}
```

### Funcionamiento

- Obtiene el usuario y su rol mediante Supabase y cookies.
- Renderiza pestañas dinámicamente, ocultando aquellas restringidas para el rol actual.
- Cada pestaña muestra un contenido personalizado, que puede incluir título, descripción, botones de acción (también restringidos por rol) y un componente arbitrario.

### Ejemplo de uso

```tsx
<ViewComponent
  viewData={{
    defaultValue: 'info',
    path: '/empleados',
    tabsValues: [
      {
        value: 'info',
        name: 'Información',
        restricted: [],
        content: {
          title: 'Datos del Empleado',
          component: <EmployeeInfo />,
          buttonActioRestricted: ['guest'],
          buttonAction: <EditButton />,
        },
      },
      // otras pestañas...
    ],
  }}
/>
```

---

## ViewComponentInternal

**Ubicación:** `src/components/ViewComponentInternal.tsx`

### Propósito

`ViewComponentInternal` es una variante más flexible de `ViewComponent`, permitiendo una estructura de tabs anidados o con mayor personalización (por ejemplo, soporte para subtabs y opciones adicionales en cada pestaña).

### Props

- **viewData** (`ViewDataObj`): Similar a la anterior, pero con campos adicionales para mayor granularidad.

#### Estructura de `ViewDataObj`:

```typescript
export interface ViewDataObj {
  defaultValue: string;
  path: string;
  tabsValues: Array<{
    value: string;
    name: React.ReactNode | string;
    restricted: string[];
    tab?: string; // Permite identificar la pestaña padre o subtab
    options?: { value: string; label: string }[]; // Opciones adicionales para la pestaña
    content: {
      title: string;
      description?: string;
      buttonActioRestricted: string[];
      buttonAction?: React.ReactNode;
      component: React.ReactNode;
    };
  }>;
}
```

### Funcionamiento

- Similar a `ViewComponent`, pero permite rutas de tabs más complejas (ej: `?tab=main&subtab=details`).
- Renderiza acciones y componentes de contenido con mayor flexibilidad.
- Permite opciones adicionales por pestaña.

### Ejemplo de uso

```tsx
<ViewComponentInternal
  viewData={{
    defaultValue: 'detalle',
    path: '/proyectos',
    tabsValues: [
      {
        value: 'detalle',
        name: 'Detalle',
        restricted: [],
        tab: 'main',
        content: {
          title: 'Detalle del Proyecto',
          component: <ProjectDetail />,
          buttonActioRestricted: ['viewer'],
          buttonAction: <EditProjectButton />,
        },
      },
      // otras pestañas o subtabs...
    ],
  }}
/>
```

---

### Notas

- Ambos componentes dependen de la obtención del rol vía Supabase y cookies.
- El control de acceso por rol es fundamental para la visibilidad de pestañas y acciones.
- Se recomienda definir los roles y la estructura de `viewData` en un archivo de configuración centralizado para facilitar el mantenimiento.

---
