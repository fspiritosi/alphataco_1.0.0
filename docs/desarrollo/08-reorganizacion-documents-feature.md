# Reorganización de Archivos - Feature Documents

## 📋 Resumen de Cambios

Este documento detalla la reorganización de archivos después de migrar de `ViewComponent` a `TabsManagerServer` en el módulo de Documentos.

---

## 🗂️ Estructura Actual (Antes de la Migración)

```
src/
├── app/
│   └── dashboard/
│       └── document/
│           ├── page.tsx                                    ❌ Usa ViewComponent
│           ├── columEmp.tsx
│           ├── columns.tsx
│           ├── DocumentTable.tsx
│           ├── [id]/
│           │   └── page.tsx
│           ├── equipment/
│           │   └── page.tsx
│           └── documentComponents/
│               ├── ButtonTypeRefetch.tsx
│               ├── CompanyTabs.tsx                         ❌ Usa ViewComponentInternal
│               ├── CompanyTabsWrapper.tsx                  ❌ Wrapper innecesario
│               ├── DocumentsTable.tsx
│               ├── DownloadButton.tsx
│               ├── EditDocumenTypeModal.tsx
│               ├── EquipmentDocumentsTable.tsx
│               ├── EquipmentTabs.tsx                       ✅ Ya usa TabsManagerServer
│               ├── FilterComponent.tsx
│               ├── TypesDocumentAction.tsx
│               ├── TypesDocumentsView.tsx
│               └── TypesDocumentsViewWrapper.tsx
│
└── features/
    ├── Employees/
    │   └── Empleados/
    │       └── Documents/
    │           ├── EmployeeDocumentsTabs.tsx               ❌ Usa ViewComponentInternal
    │           ├── Monthly/
    │           │   └── MonthlyDocuments.tsx
    │           └── Permanents/
    │               └── PermanentDocuments.tsx
    │
    └── Equipos/
        └── DocumentosEquipos/
            ├── index.tsx                                   ✅ MonthlyEquipmentDocumentsWrapper
            └── Permanents/
                └── index.tsx                               ✅ PermanentEquipmentDocumentsWrapper
```

---

## 🎯 Estructura Propuesta (Después de la Migración)

```
src/
├── app/
│   └── dashboard/
│       └── document/
│           ├── page.tsx                                    ✅ Migrado a TabsManagerServer
│           ├── [id]/
│           │   └── page.tsx                                (sin cambios)
│           └── equipment/
│               └── page.tsx                                (sin cambios)
│
└── features/
    ├── Documents/                                          ✨ NUEVA FEATURE
    │   ├── EmployeeDocumentsTabContent.tsx                 ✅ Migrado (antes EmployeeDocumentsTabs)
    │   ├── EquipmentDocumentsTabContent.tsx                ✅ Movido (antes en app/dashboard/document)
    │   ├── CompanyDocumentsTabContent.tsx                  ✅ Migrado (antes CompanyTabs)
    │   ├── TypesDocumentsTabContent.tsx                    ✅ Wrapper simplificado
    │   │
    │   ├── components/                                     ✨ NUEVA CARPETA
    │   │   ├── employee/
    │   │   │   ├── PermanentDocuments.tsx                  (movido desde Employees/)
    │   │   │   └── MonthlyDocuments.tsx                    (movido desde Employees/)
    │   │   │
    │   │   ├── equipment/
    │   │   │   ├── PermanentEquipmentDocuments.tsx         (movido desde Equipos/)
    │   │   │   └── MonthlyEquipmentDocuments.tsx           (movido desde Equipos/)
    │   │   │
    │   │   ├── company/
    │   │   │   ├── CompanyPermanentDocuments.tsx           ✨ NUEVO (extraído de CompanyTabs)
    │   │   │   └── CompanyMonthlyDocuments.tsx             ✨ NUEVO (extraído de CompanyTabs)
    │   │   │
    │   │   └── shared/
    │   │       ├── DocumentNav.tsx                         (movido desde components/)
    │   │       ├── DocumentsTable.tsx                      (movido desde app/)
    │   │       ├── EquipmentDocumentsTable.tsx             (movido desde app/)
    │   │       ├── DownloadButton.tsx                      (movido desde app/)
    │   │       ├── FilterComponent.tsx                     (movido desde app/)
    │   │       ├── ButtonTypeRefetch.tsx                   (movido desde app/)
    │   │       └── EditDocumenTypeModal.tsx                (movido desde app/)
    │   │
    │   ├── types/
    │   │   ├── TypesDocumentAction.tsx                     (movido desde app/)
    │   │   ├── TypesDocumentsView.tsx                      (movido desde app/)
    │   │   └── TypesDocumentsViewWrapper.tsx               (movido desde app/)
    │   │
    │   └── utils/
    │       ├── columEmp.tsx                                (movido desde app/)
    │       └── columns.tsx                                 (movido desde app/)
    │
    ├── Employees/
    │   └── Empleados/
    │       └── Documents/                                  ❌ ELIMINAR (movido a features/Documents)
    │
    └── Equipos/
        └── DocumentosEquipos/                              ❌ ELIMINAR (movido a features/Documents)
```

---

## 📦 Archivos a Mover

### 1. Crear Nueva Feature: `src/features/Documents/`

#### Archivos Principales (TabContent)

```bash
# Desde features/Employees/Empleados/Documents/
mv src/features/Employees/Empleados/Documents/EmployeeDocumentsTabs.tsx \
   src/features/Documents/EmployeeDocumentsTabContent.tsx

# Desde app/dashboard/document/documentComponents/
mv src/app/dashboard/document/documentComponents/EquipmentTabs.tsx \
   src/features/Documents/EquipmentDocumentsTabContent.tsx

# Desde app/dashboard/document/documentComponents/
# (Requiere refactorización antes de mover)
# CompanyTabs.tsx → CompanyDocumentsTabContent.tsx
```

#### Componentes de Empleados

```bash
# Crear carpeta
mkdir -p src/features/Documents/components/employee

# Mover componentes
mv src/features/Employees/Empleados/Documents/Permanents/PermanentDocuments.tsx \
   src/features/Documents/components/employee/

mv src/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments.tsx \
   src/features/Documents/components/employee/
```

#### Componentes de Equipos

```bash
# Crear carpeta
mkdir -p src/features/Documents/components/equipment

# Mover componentes
mv src/features/Equipos/DocumentosEquipos/Permanents/index.tsx \
   src/features/Documents/components/equipment/PermanentEquipmentDocuments.tsx

mv src/features/Equipos/DocumentosEquipos/index.tsx \
   src/features/Documents/components/equipment/MonthlyEquipmentDocuments.tsx
```

#### Componentes Compartidos

```bash
# Crear carpeta
mkdir -p src/features/Documents/components/shared

# Mover desde app/dashboard/document/documentComponents/
mv src/app/dashboard/document/documentComponents/DocumentsTable.tsx \
   src/features/Documents/components/shared/

mv src/app/dashboard/document/documentComponents/EquipmentDocumentsTable.tsx \
   src/features/Documents/components/shared/

mv src/app/dashboard/document/documentComponents/DownloadButton.tsx \
   src/features/Documents/components/shared/

mv src/app/dashboard/document/documentComponents/FilterComponent.tsx \
   src/features/Documents/components/shared/

mv src/app/dashboard/document/documentComponents/ButtonTypeRefetch.tsx \
   src/features/Documents/components/shared/

mv src/app/dashboard/document/documentComponents/EditDocumenTypeModal.tsx \
   src/features/Documents/components/shared/

# Mover DocumentNav desde components/
mv src/components/DocumentNav.tsx \
   src/features/Documents/components/shared/
```

#### Tipos de Documentos

```bash
# Crear carpeta
mkdir -p src/features/Documents/types

# Mover componentes
mv src/app/dashboard/document/documentComponents/TypesDocumentAction.tsx \
   src/features/Documents/types/

mv src/app/dashboard/document/documentComponents/TypesDocumentsView.tsx \
   src/features/Documents/types/

mv src/app/dashboard/document/documentComponents/TypesDocumentsViewWrapper.tsx \
   src/features/Documents/types/
```

#### Utilidades

```bash
# Crear carpeta
mkdir -p src/features/Documents/utils

# Mover columnas
mv src/app/dashboard/document/columEmp.tsx \
   src/features/Documents/utils/

mv src/app/dashboard/document/columns.tsx \
   src/features/Documents/utils/
```

---

## 🔄 Actualización de Imports

### En `src/app/dashboard/document/page.tsx`

```tsx
// Antes
import EmployeeDocumentsTabs from '../../../features/Employees/Empleados/Documents/EmployeeDocumentsTabs';
import CompanyTabsWrapper from './documentComponents/CompanyTabsWrapper';
import EquipmentTabs from './documentComponents/EquipmentTabs';
import TypesDocumentsViewWrapper from './documentComponents/TypesDocumentsViewWrapper';

// Después
import EmployeeDocumentsTabContent from '@/features/Documents/EmployeeDocumentsTabContent';
import EquipmentDocumentsTabContent from '@/features/Documents/EquipmentDocumentsTabContent';
import CompanyDocumentsTabContent from '@/features/Documents/CompanyDocumentsTabContent';
import TypesDocumentsTabContent from '@/features/Documents/TypesDocumentsTabContent';
```

### En Componentes de Documents

```tsx
// Antes
import DocumentNav from '@/components/DocumentNav';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';

// Después
import DocumentNav from '@/features/Documents/components/shared/DocumentNav';
import PermanentDocuments from '@/features/Documents/components/employee/PermanentDocuments';
```

---

## 🗑️ Archivos a Eliminar

Después de verificar que todo funciona correctamente:

```bash
# Eliminar wrapper innecesario
rm src/app/dashboard/document/documentComponents/CompanyTabsWrapper.tsx

# Eliminar carpetas vacías
rm -rf src/features/Employees/Empleados/Documents/
rm -rf src/features/Equipos/DocumentosEquipos/
rm -rf src/app/dashboard/document/documentComponents/
```

---

## ✅ Checklist de Reorganización

### Fase 1: Preparación

- [ ] Crear carpeta `src/features/Documents/`
- [ ] Crear subcarpetas: `components/`, `types/`, `utils/`
- [ ] Crear subcarpetas de components: `employee/`, `equipment/`, `company/`, `shared/`

### Fase 2: Mover Archivos Principales

- [ ] Mover `EmployeeDocumentsTabs.tsx` → `EmployeeDocumentsTabContent.tsx`
- [ ] Mover `EquipmentTabs.tsx` → `EquipmentDocumentsTabContent.tsx`
- [ ] Refactorizar y mover `CompanyTabs.tsx` → `CompanyDocumentsTabContent.tsx`
- [ ] Mover `TypesDocumentsViewWrapper.tsx` → `TypesDocumentsTabContent.tsx`

### Fase 3: Mover Componentes

- [ ] Mover componentes de empleados a `components/employee/`
- [ ] Mover componentes de equipos a `components/equipment/`
- [ ] Crear componentes de empresa en `components/company/`
- [ ] Mover componentes compartidos a `components/shared/`

### Fase 4: Mover Tipos y Utilidades

- [ ] Mover componentes de tipos a `types/`
- [ ] Mover columnas a `utils/`

### Fase 5: Actualizar Imports

- [ ] Actualizar imports en `page.tsx`
- [ ] Actualizar imports en todos los componentes movidos
- [ ] Buscar y reemplazar imports en todo el proyecto

### Fase 6: Verificación

- [ ] Ejecutar `npm run check-types`
- [ ] Verificar que no hay errores de TypeScript
- [ ] Probar navegación en el navegador
- [ ] Verificar que todos los documentos se cargan correctamente

### Fase 7: Limpieza

- [ ] Eliminar `CompanyTabsWrapper.tsx`
- [ ] Eliminar carpetas vacías
- [ ] Eliminar imports no utilizados
- [ ] Actualizar documentación

---

## 🎯 Beneficios de la Reorganización

### Antes

❌ Archivos dispersos en múltiples carpetas
❌ Lógica mezclada entre `app/` y `features/`
❌ Difícil encontrar componentes relacionados
❌ Duplicación de componentes similares
❌ Imports largos y confusos

### Después

✅ Todo relacionado con documentos en una feature
✅ Separación clara: TabContent → components → utils
✅ Fácil de encontrar y mantener
✅ Componentes compartidos reutilizables
✅ Imports cortos y claros: `@/features/Documents/...`

---

## 📊 Resumen de Movimientos

| Tipo                  | Cantidad        | Desde                     | Hacia                                      |
| --------------------- | --------------- | ------------------------- | ------------------------------------------ |
| TabContent            | 4               | Varios                    | `features/Documents/`                      |
| Componentes Employee  | 2               | `features/Employees/`     | `features/Documents/components/employee/`  |
| Componentes Equipment | 2               | `features/Equipos/`       | `features/Documents/components/equipment/` |
| Componentes Company   | 2               | Nuevo                     | `features/Documents/components/company/`   |
| Componentes Shared    | 7               | `app/dashboard/document/` | `features/Documents/components/shared/`    |
| Tipos                 | 3               | `app/dashboard/document/` | `features/Documents/types/`                |
| Utils                 | 2               | `app/dashboard/document/` | `features/Documents/utils/`                |
| **TOTAL**             | **22 archivos** |                           |                                            |

---

## 🚨 Precauciones

1. **Hacer backup antes de mover archivos**
2. **Mover un archivo a la vez y verificar**
3. **Ejecutar `npm run check-types` después de cada movimiento**
4. **No eliminar archivos hasta verificar que todo funciona**
5. **Actualizar tests E2E si existen**

---

## 🔗 Referencias

- [Migración ViewComponent a TabsManagerServer](./07-migracion-viewcomponent-a-tabsmanager.md)
- [Estructura Dashboard](../../src/features/Dashboard/)
- [Estructura Empresa](../../src/features/Empresa/)
