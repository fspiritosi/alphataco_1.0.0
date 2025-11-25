# Migración de ViewComponent a TabsManagerServer

## 📋 Descripción General

Este documento describe el proceso completo para migrar páginas que usan el componente legacy `ViewComponent` al nuevo sistema `TabsManagerServer`.

**Objetivo:** Migrar `/dashboard/document` y todos sus componentes anidados al nuevo sistema de tabs.

---

## 🎯 Componentes a Migrar

### Archivo Principal

- `src/app/dashboard/document/page.tsx` - Usa `ViewComponent` (legacy)

### Componentes Anidados que También Usan ViewComponent

1. `src/features/Employees/Empleados/Documents/EmployeeDocumentsTabs.tsx` - Usa `ViewComponentInternal`
2. `src/app/dashboard/document/documentComponents/CompanyTabs.tsx` - Usa `ViewComponentInternal`

### Componente Ya Migrado (Ejemplo a Seguir)

- `src/app/dashboard/document/documentComponents/EquipmentTabs.tsx` - ✅ Ya usa `TabsManagerServer`

---

## 📚 Referencias de Implementación Correcta

### Ejemplo 1: DashboardComponent (Tabs Principales)

**Archivo:** `src/features/Dashboard/DashboardComponent.tsx`

**Características:**

- ✅ Usa `TabsManagerServer` con `paramName="tab"`
- ✅ Incluye iconos en los labels
- ✅ Configura `dependentParams={['subtab']}`
- ✅ Usa `moduleSlug` y `tabSlug` para permisos
- ✅ Envuelve contenido async en `Suspense`

### Ejemplo 2: EstadisticasTabComponent (Tabs Anidadas)

**Archivo:** `src/features/Dashboard/Estadisticas/EstadisticasTabComponent.tsx`

**Características:**

- ✅ Usa `TabsManagerServer` con `paramName="subtab"`
- ✅ Tabs anidadas dentro de un tab principal
- ✅ Iconos descriptivos para cada subtab
- ✅ Configuración de permisos correcta

---

## 🗺️ Mapeo de Slugs (permissions-map.ts)

### Módulo: documentacion

```typescript
documentacion: {
  slug: 'documentacion',
  moduleId: '60000000-0000-0000-0000-000000000001',
  tabs: {
    'docs-empleados': {
      slug: 'docs-empleados',
      tabId: '60000000-0000-0000-0000-000000000011',
      subtabs: {
        'docs-empleados-permanentes': {
          slug: 'docs-empleados-permanentes',
          tabId: '60000000-0000-0000-0000-000000000111',
        },
        'docs-empleados-mensuales': {
          slug: 'docs-empleados-mensuales',
          tabId: '60000000-0000-0000-0000-000000000112',
        },
      },
    },
    'docs-equipos': {
      slug: 'docs-equipos',
      tabId: '60000000-0000-0000-0000-000000000012',
      subtabs: {
        'docs-equipos-permanentes': {
          slug: 'docs-equipos-permanentes',
          tabId: '60000000-0000-0000-0000-000000000121',
        },
        'docs-equipos-mensuales': {
          slug: 'docs-equipos-mensuales',
          tabId: '60000000-0000-0000-0000-000000000122',
        },
      },
    },
    'docs-empresa': {
      slug: 'docs-empresa',
      tabId: '60000000-0000-0000-0000-000000000013',
      subtabs: {
        'docs-empresa-permanentes': {
          slug: 'docs-empresa-permanentes',
          tabId: '60000000-0000-0000-0000-000000000131',
        },
        'docs-empresa-mensuales': {
          slug: 'docs-empresa-mensuales',
          tabId: '60000000-0000-0000-0000-000000000132',
        },
      },
    },
    'tipos-documentos': {
      slug: 'tipos-documentos',
      tabId: '60000000-0000-0000-0000-000000000014',
      subtabs: {},
    },
  },
}
```

---

## 🔄 Proceso de Migración

### Paso 1: Migrar el Page Principal

**Archivo:** `src/app/dashboard/document/page.tsx`

#### Antes (ViewComponent):

```tsx
import Viewcomponent from '@/components/ViewComponent';

export default function page({ params }: { params: { tab: string; subtab: string } }) {
  const viewData = {
    defaultValue: 'Documentos de empleados',
    path: '/dashboard/document',
    tabsValues: [
      {
        value: 'Documentos de empleados',
        name: 'Documentos de empleados',
        content: {
          component: <EmployeeDocumentsTabs path="/dashboard/document" tabValue={params.tab} subtab={params.subtab} />,
        },
      },
      // ... más tabs
    ],
  };

  return <Viewcomponent viewData={viewData} />;
}
```

#### Después (TabsManagerServer):

```tsx
import { TabsManagerServer } from '@/features/TabsManager';
import { FileText, Building2, Truck, FileType } from 'lucide-react';
import { Suspense } from 'react';
import EmployeeDocumentsTabContent from '@/features/Documents/EmployeeDocumentsTabContent';
import EquipmentDocumentsTabContent from '@/features/Documents/EquipmentDocumentsTabContent';
import CompanyDocumentsTabContent from '@/features/Documents/CompanyDocumentsTabContent';
import TypesDocumentsViewWrapper from './documentComponents/TypesDocumentsViewWrapper';

export const metadata = {
  title: 'Documentos | GH Gestión',
  description: 'Gestión de documentos de empleados, equipos y empresa',
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="px-6">
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="docs-empleados"
        dependentParams={['subtab']}
        tabs={[
          {
            value: 'docs-empleados',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos de Empleados
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-empleados',
            content: (
              <Suspense fallback={<div>Cargando documentos...</div>}>
                <EmployeeDocumentsTabContent searchParams={searchParams} />
              </Suspense>
            ),
          },
          {
            value: 'docs-equipos',
            label: (
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Documentos de Equipos
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-equipos',
            content: (
              <Suspense fallback={<div>Cargando documentos...</div>}>
                <EquipmentDocumentsTabContent searchParams={searchParams} />
              </Suspense>
            ),
          },
          {
            value: 'docs-empresa',
            label: (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Documentos de Empresa
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-empresa',
            content: (
              <Suspense fallback={<div>Cargando documentos...</div>}>
                <CompanyDocumentsTabContent searchParams={searchParams} />
              </Suspense>
            ),
          },
          {
            value: 'tipos-documentos',
            label: (
              <span className="flex items-center gap-2">
                <FileType className="h-4 w-4" />
                Tipos de Documentos
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'tipos-documentos',
            content: (
              <TypesDocumentsViewWrapper optionChildrenProp="all" equipos={true} empresa={true} personas={true} />
            ),
          },
        ]}
      />
    </div>
  );
}
```

**Cambios clave:**

1. ✅ Cambiar `params` por `searchParams`
2. ✅ Usar `TabsManagerServer` en lugar de `ViewComponent`
3. ✅ Agregar iconos descriptivos a cada tab
4. ✅ Configurar `moduleSlug` y `tabSlug` para permisos
5. ✅ Envolver contenido async en `Suspense`
6. ✅ Configurar `dependentParams={['subtab']}`

---

### Paso 2: Migrar EmployeeDocumentsTabs

**Archivo:** `src/features/Employees/Empleados/Documents/EmployeeDocumentsTabs.tsx`

#### Antes (ViewComponentInternal):

```tsx
import ViewcomponentInternal from '@/components/ViewComponentInternal';

async function EmployeeDocumentsTabs({ tabValue, subtab, path }) {
  const viewData = {
    defaultValue: subtab || 'permanentes',
    path: path,
    tabsValues: [
      {
        value: 'permanentes',
        name: 'Documentos permanentes',
        content: {
          component: <PermanentDocuments />,
        },
      },
      // ... más tabs
    ],
  };

  return <ViewcomponentInternal currentMainTab={tabValue} viewData={viewData} />;
}
```

#### Después (TabsManagerServer):

**Renombrar archivo a:** `src/features/Documents/EmployeeDocumentsTabContent.tsx`

```tsx
import DocumentNav from '@/components/DocumentNav';
import { TabsManagerServer } from '@/features/TabsManager';
import { FileArchive, Calendar } from 'lucide-react';
import { Suspense } from 'react';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';
import MonthlyDocuments from '@/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments';

export default async function EmployeeDocumentsTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <div className="flex gap-4 flex-wrap mb-4">
        <DocumentNav onlyEmployees />
      </div>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="docs-empleados-permanentes"
        tabs={[
          {
            value: 'docs-empleados-permanentes',
            label: (
              <span className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Documentos Permanentes
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-empleados-permanentes',
            content: (
              <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
                <PermanentDocuments />
              </Suspense>
            ),
          },
          {
            value: 'docs-empleados-mensuales',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Documentos Mensuales
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-empleados-mensuales',
            content: (
              <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
                <MonthlyDocuments />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
```

**Cambios clave:**

1. ✅ Renombrar archivo con sufijo `TabContent`
2. ✅ Cambiar props de `{ tabValue, subtab, path }` a `{ searchParams }`
3. ✅ Usar `TabsManagerServer` con `paramName="subtab"`
4. ✅ Mover `DocumentNav` fuera del TabsManager
5. ✅ Agregar iconos a las subtabs
6. ✅ Configurar slugs correctos según permissions-map

---

### Paso 3: Migrar CompanyTabs

**Archivo:** `src/app/dashboard/document/documentComponents/CompanyTabs.tsx`

#### Después (TabsManagerServer):

**Renombrar archivo a:** `src/features/Documents/CompanyDocumentsTabContent.tsx`

```tsx
import { TabsManagerServer } from '@/features/TabsManager';
import { FileArchive, Calendar } from 'lucide-react';
import { Suspense } from 'react';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { DataTable } from '@/app/dashboard/company/actualCompany/components/data-table';
import { columnsDocuments } from '@/app/dashboard/company/actualCompany/components/document-colums';

async function CompanyPermanentDocuments() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  const { data: documents_company } = await supabase
    .from('documents_company')
    .select('*,id_document_types(*),user_id(*)')
    .eq('applies', actualCompany || '')
    .eq('id_document_types.is_it_montlhy', false);

  // ... lógica de procesamiento de datos

  return <DataTable isDocuments data={documentCompany || []} columns={columnsDocuments} />;
}

async function CompanyMonthlyDocuments() {
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  const { data: documents_company } = await supabase
    .from('documents_company')
    .select('*,id_document_types(*),user_id(*)')
    .eq('applies', actualCompany || '')
    .eq('id_document_types.is_it_montlhy', true);

  // ... lógica de procesamiento de datos

  return <DataTable isDocuments data={documentCompanyMensual || []} columns={columnsDocuments} />;
}

export default async function CompanyDocumentsTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="docs-empresa-permanentes"
      tabs={[
        {
          value: 'docs-empresa-permanentes',
          label: (
            <span className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Documentos Permanentes
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'docs-empresa-permanentes',
          content: (
            <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
              <CompanyPermanentDocuments />
            </Suspense>
          ),
        },
        {
          value: 'docs-empresa-mensuales',
          label: (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Documentos Mensuales
            </span>
          ),
          moduleSlug: 'documentacion',
          tabSlug: 'docs-empresa-mensuales',
          content: (
            <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
              <CompanyMonthlyDocuments />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
```

**Cambios clave:**

1. ✅ Separar la lógica de datos en componentes individuales
2. ✅ Eliminar `CompanyTabsWrapper` (ya no es necesario)
3. ✅ Mover fetching de datos a componentes específicos
4. ✅ Usar `TabsManagerServer` con subtabs

---

## 📁 Reorganización de Archivos

### Estructura Actual (Antes)

```
src/
├── app/
│   └── dashboard/
│       └── document/
│           ├── page.tsx (usa ViewComponent)
│           └── documentComponents/
│               ├── CompanyTabs.tsx (usa ViewComponentInternal)
│               ├── CompanyTabsWrapper.tsx
│               ├── EquipmentTabs.tsx (✅ ya migrado)
│               └── TypesDocumentsViewWrapper.tsx
│
└── features/
    └── Employees/
        └── Empleados/
            └── Documents/
                └── EmployeeDocumentsTabs.tsx (usa ViewComponentInternal)
```

### Estructura Propuesta (Después)

```
src/
├── app/
│   └── dashboard/
│       └── document/
│           ├── page.tsx (✅ usa TabsManagerServer)
│           └── documentComponents/
│               ├── TypesDocumentsViewWrapper.tsx (sin cambios)
│               └── [ELIMINAR CompanyTabsWrapper.tsx]
│
└── features/
    └── Documents/  (✨ NUEVA CARPETA)
        ├── EmployeeDocumentsTabContent.tsx (✅ migrado)
        ├── EquipmentDocumentsTabContent.tsx (✅ mover desde app/)
        ├── CompanyDocumentsTabContent.tsx (✅ migrado)
        └── components/
            ├── CompanyPermanentDocuments.tsx
            └── CompanyMonthlyDocuments.tsx
```

**Razones para la reorganización:**

1. ✅ Agrupa toda la funcionalidad de documentos en una feature
2. ✅ Sigue el patrón de Dashboard y Empresa
3. ✅ Separa lógica de presentación (components) de contenido de tabs
4. ✅ Facilita el mantenimiento y testing

---

## 🎨 Iconos Recomendados (lucide-react)

```tsx
import {
  FileText, // Documentos de empleados
  Truck, // Documentos de equipos
  Building2, // Documentos de empresa
  FileType, // Tipos de documentos
  FileArchive, // Documentos permanentes
  Calendar, // Documentos mensuales
} from 'lucide-react';
```

---

## ✅ Checklist de Migración

### Paso 1: Preparación

- [ ] Leer documentación de TabsManager
- [ ] Identificar todos los componentes que usan ViewComponent
- [ ] Verificar slugs en permissions-map.ts
- [ ] Crear carpeta `src/features/Documents/`

### Paso 2: Migrar Page Principal

- [ ] Cambiar `params` por `searchParams`
- [ ] Reemplazar `ViewComponent` por `TabsManagerServer`
- [ ] Agregar iconos a cada tab
- [ ] Configurar `moduleSlug` y `tabSlug`
- [ ] Configurar `dependentParams={['subtab']}`
- [ ] Envolver contenido async en `Suspense`

### Paso 3: Migrar EmployeeDocumentsTabs

- [ ] Renombrar a `EmployeeDocumentsTabContent.tsx`
- [ ] Mover a `src/features/Documents/`
- [ ] Cambiar props a `{ searchParams }`
- [ ] Reemplazar `ViewComponentInternal` por `TabsManagerServer`
- [ ] Agregar iconos a subtabs
- [ ] Configurar slugs correctos

### Paso 4: Migrar CompanyTabs

- [ ] Renombrar a `CompanyDocumentsTabContent.tsx`
- [ ] Mover a `src/features/Documents/`
- [ ] Separar lógica de datos en componentes
- [ ] Eliminar `CompanyTabsWrapper.tsx`
- [ ] Reemplazar `ViewComponentInternal` por `TabsManagerServer`
- [ ] Agregar iconos a subtabs

### Paso 5: Mover EquipmentTabs

- [ ] Mover `EquipmentTabs.tsx` a `src/features/Documents/EquipmentDocumentsTabContent.tsx`
- [ ] Actualizar imports en page.tsx

### Paso 6: Verificación

- [ ] Ejecutar `npm run check-types`
- [ ] Verificar que no hay errores de TypeScript
- [ ] Probar navegación entre tabs
- [ ] Verificar que los permisos funcionan correctamente
- [ ] Verificar que las URLs se actualizan correctamente
- [ ] Probar botones atrás/adelante del navegador

### Paso 7: Limpieza

- [ ] Eliminar archivos legacy no utilizados
- [ ] Actualizar imports en otros archivos si es necesario
- [ ] Actualizar tests E2E si existen
- [ ] Actualizar documentación

---

## 🚨 Errores Comunes y Soluciones

### Error 1: "Property 'tabValue' does not exist"

**Causa:** Componente hijo todavía espera props del sistema antiguo

**Solución:** Cambiar props de `{ tabValue, subtab, path }` a `{ searchParams }`

### Error 2: Tabs anidadas no se limpian al cambiar de tab principal

**Causa:** Falta configurar `dependentParams`

**Solución:** Agregar `dependentParams={['subtab']}` en el TabsManager principal

### Error 3: Componente no se renderiza

**Causa:** Falta envolver en `Suspense` o el componente es async

**Solución:** Envolver contenido async en `<Suspense fallback={...}>`

### Error 4: Permisos no funcionan

**Causa:** Slugs incorrectos o no coinciden con permissions-map.ts

**Solución:** Verificar que `moduleSlug` y `tabSlug` coincidan exactamente con permissions-map.ts

---

## 📊 Comparación Antes/Después

| Aspecto           | ViewComponent (Antes)      | TabsManagerServer (Después)         |
| ----------------- | -------------------------- | ----------------------------------- |
| **Props**         | `params: { tab, subtab }`  | `searchParams: object`              |
| **Configuración** | Objeto `viewData` complejo | Array de `tabs` simple              |
| **Permisos**      | Manual con `restricted`    | Automático con `moduleSlug/tabSlug` |
| **URLs**          | No reflejan estado         | URLs compartibles                   |
| **Navegación**    | Recarga completa           | Instantánea                         |
| **Anidación**     | Compleja                   | Natural con múltiples TabsManager   |
| **Iconos**        | No soportados              | Soportados en `label`               |
| **Suspense**      | No integrado               | Integrado nativamente               |

---

## 🎯 Resultado Esperado

Después de la migración:

✅ URLs compartibles: `/dashboard/document?tab=docs-empleados&subtab=docs-empleados-permanentes`
✅ Navegación instantánea sin recargas
✅ Permisos automáticos basados en roles
✅ Código más limpio y mantenible
✅ Mejor experiencia de usuario
✅ Estructura de archivos consistente con Dashboard y Empresa

---

## 📝 Notas Adicionales

1. **No eliminar ViewComponent todavía:** Puede haber otras páginas usándolo
2. **Verificar tests E2E:** Actualizar selectores si es necesario
3. **Documentar cambios:** Actualizar docs/arquitectura/02-estructura-dashboard.md
4. **Comunicar cambios:** Informar al equipo sobre las nuevas URLs

---

## 🔗 Referencias

- [Documentación TabsManager](../componentes/TabsManager.md)
- [Ejemplo Dashboard](../../src/features/Dashboard/DashboardComponent.tsx)
- [Ejemplo Empresa](../../src/features/Empresa/EmpresaComponent.tsx)
- [Permissions Map](../../src/features/Permissions/permissions-map.ts)
