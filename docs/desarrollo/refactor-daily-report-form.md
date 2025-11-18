# Refactor DailyReportRowForm - Componetización

## 📋 Objetivo

Refactorizar el formulario de Comercial (`src/features/Empresa/Clientes/components/operations/components/DailyReportRowForm.tsx`) para que tenga la misma estructura y funcionalidad que el formulario de Operaciones (`src/features/Operaciones/PartesDiarios/components/DailyReportRowForm.tsx`), pero componetizado para mejor mantenibilidad.

## 🔍 Análisis Comparativo

### Formulario de Operaciones (Referencia)

**Secciones principales:**

1. **Datos del Cliente** - Cliente, Servicio, Ítem, Sector, Área
2. **Fechas y Horarios** - Tipo de jornada, horarios, checkboxes día/noche
3. **Recursos** - Empleados (con búsqueda), Equipos empresa (con búsqueda), Equipos cliente
4. **Estado y Descripción** - Estado, remito, descripción

**Características especiales:**

- Búsqueda de empleados con `SearchEmployee`
- Búsqueda de equipos con `SearchEquipment`
- Índices para filtrar empleados/equipos por cliente
- Validaciones complejas según estado
- Modo creación y edición

### Formulario de Comercial (Actual)

**Estado actual:**

- Solo muestra campos básicos para edición limitada
- No tiene búsqueda de empleados/equipos
- Campos deshabilitados en modo edición
- Falta estructura completa

## 🎯 Plan de Componetización

### Componentes a Crear

#### 1. `CustomerDataSection.tsx`

**Responsabilidad:** Sección de datos del cliente
**Props:**

```typescript
{
  form: UseFormReturn
  customers: Customer[]
  isCreating: boolean
  selectedCustomerId: string | null
  setSelectedCustomerId: (id: string) => void
  selectedServiceId: string | null
  setSelectedServiceId: (id: string) => void
  disabled?: boolean
}
```

**Campos:**

- Cliente (combobox)
- Servicio (combobox)
- Ítem (combobox)
- Sector (combobox - opcional)
- Área (combobox - opcional)

#### 2. `DateTimeSection.tsx`

**Responsabilidad:** Sección de fechas y horarios
**Props:**

```typescript
{
  form: UseFormReturn
  isCreating: boolean
  disabled?: boolean
}
```

**Campos:**

- Fecha (solo en modo creación)
- Tipo de jornada (radio group)
- Hora inicio/fin (condicional)
- Checkboxes día/noche

#### 3. `ResourcesSection.tsx`

**Responsabilidad:** Sección de recursos (empleados y equipos)
**Props:**

```typescript
{
  form: UseFormReturn
  employees: Employee[]
  equipments: Equipment[]
  customerEquipments: Equipment[]
  isCreating: boolean
  disabled?: boolean
}
```

**Campos:**

- Empleados (búsqueda múltiple)
- Equipos empresa (búsqueda múltiple)
- Equipos cliente (selección múltiple)

#### 4. `StatusSection.tsx`

**Responsabilidad:** Sección de estado y remito
**Props:**

```typescript
{
  form: UseFormReturn
  isCreating: boolean
  currentStatus: string
  disabled?: boolean
}
```

**Campos:**

- Estado (select)
- Número de remito (condicional)
- Motivo cancelación (condicional)
- Fecha reprogramación (condicional)

#### 5. `DescriptionSection.tsx`

**Responsabilidad:** Campo de descripción
**Props:**

```typescript
{
  form: UseFormReturn
  isCreating: boolean
  disabled?: boolean
}
```

**Campos:**

- Descripción (textarea)

### Hooks Personalizados

#### 1. `useCustomerData.ts`

**Responsabilidad:** Lógica de manejo de clientes, servicios e ítems

```typescript
export function useCustomerData(customers, form) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const customerServices = useMemo(() => {...}, [selectedCustomer])
  const serviceItems = useMemo(() => {...}, [selectedServiceId])

  const handleCustomerChange = useCallback((id) => {...}, [])
  const handleServiceChange = useCallback((id) => {...}, [])

  return {
    selectedCustomerId,
    selectedServiceId,
    selectedCustomer,
    customerServices,
    serviceItems,
    handleCustomerChange,
    handleServiceChange
  }
}
```

#### 2. `useFormSubmit.ts`

**Responsabilidad:** Lógica de submit (creación vs edición)

```typescript
export function useFormSubmit(isCreating, refetchDailyReport) {
  const handleCreate = async (data) => {...}
  const handleUpdate = async (data) => {...}

  const onSubmit = async (data) => {
    if (isCreating) {
      return handleCreate(data)
    }
    return handleUpdate(data)
  }

  return { onSubmit }
}
```

## 📐 Estructura de Archivos

```
src/features/Empresa/Clientes/components/operations/components/
├── DailyReportRowForm.tsx (componente principal)
├── form-sections/
│   ├── CustomerDataSection.tsx
│   ├── DateTimeSection.tsx
│   ├── ResourcesSection.tsx
│   ├── StatusSection.tsx
│   └── DescriptionSection.tsx
└── hooks/
    ├── useCustomerData.ts
    └── useFormSubmit.ts
```

## ✅ Checklist de Implementación

### Fase 1: Crear Hooks

- [x] Crear `useCustomerData.ts` ✅
- [x] Crear `useFormSubmit.ts` ✅
- [ ] Probar hooks aisladamente

### Fase 2: Crear Componentes de Sección

- [ ] Crear `CustomerDataSection.tsx`
- [ ] Crear `DateTimeSection.tsx`
- [ ] Crear `ResourcesSection.tsx`
- [ ] Crear `StatusSection.tsx`
- [ ] Crear `DescriptionSection.tsx`

### Fase 3: Integrar en Componente Principal

- [ ] Refactorizar `DailyReportRowForm.tsx`
- [ ] Integrar todos los componentes
- [ ] Probar modo creación
- [ ] Probar modo edición

### Fase 4: Testing y Ajustes

- [ ] Verificar validaciones
- [ ] Verificar flujo de creación
- [ ] Verificar flujo de edición
- [ ] Ajustar estilos si es necesario

## 🔧 Diferencias Clave vs Operaciones

1. **Estado inicial en creación:** Siempre "en_certificacion" (vs "pendiente" en Operaciones)
2. **Validación de recursos:** Al menos 1 empleado O 1 equipo (obligatorio en creación)
3. **Cliente no editable:** En modo edición, el cliente está bloqueado
4. **Estados solo hacia adelante:** No se puede retroceder en estados
5. **Creación de daily_report:** Si no existe para la fecha, se crea automáticamente

## 📝 Notas Importantes

- Mantener la misma estructura visual que Operaciones
- Reutilizar componentes de búsqueda (`SearchEmployee`, `SearchEquipment`) si existen
- Mantener validaciones específicas de Comercial
- Asegurar que el resaltado de filas post-cierre funcione correctamente

---

**Fecha de creación:** 2025-11-17
**Estado:** En planificación

## Estado de Implementación

### ✅ Completado

#### Fase 1: Análisis y Planificación

- Documento de refactorización creado
- Estructura de componentes definida
- Hooks identificados

#### Fase 2: Componentes de Sección

- ✅ CustomerDataSection.tsx
- ✅ DateTimeSection.tsx
- ✅ ResourcesSection.tsx
- ✅ StatusSection.tsx
- ✅ ObservationsSection.tsx
- ✅ index.ts (barrel export)

#### Fase 3: Hooks Personalizados

- ✅ useFormSchema.ts
- ✅ useFormInitialization.ts
- ✅ useFormSubmit.ts (actualizado)
- ✅ useCustomerData.ts (existente, actualizado)
- ✅ index.ts (barrel export)

#### Fase 4: Componente Principal Refactorizado

- ✅ DailyReportRowFormRefactored.tsx

### Archivos Creados

```
src/features/Empresa/Clientes/components/operations/components/
├── form-sections/
│   ├── CustomerDataSection.tsx
│   ├── DateTimeSection.tsx
│   ├── ResourcesSection.tsx
│   ├── StatusSection.tsx
│   ├── ObservationsSection.tsx
│   └── index.ts
├── hooks/
│   ├── useCustomerData.ts (actualizado)
│   ├── useFormSchema.ts
│   ├── useFormInitialization.ts
│   ├── useFormSubmit.ts (actualizado)
│   └── index.ts
└── DailyReportRowFormRefactored.tsx
```

### Próximos Pasos - Plan de Migración

#### Fase 5: Mejoras Adicionales - useQuery y Zustand Store

**Mejoras a Implementar:**

1. **Mover fetching a useQuery dentro del componente**

   - Los datos de `employees` y `equipments` se cargarán con `useQuery` dentro del componente
   - Ya no se recibirán como props desde el wrapper
   - Mostrar loader específico en los inputs de empleados y equipos mientras cargan

2. **Crear Zustand Store para manejo de estado del formulario**
   - Store para manejar si hay una fila seleccionada para editar
   - Controlar apertura/cierre del modal
   - Precargar datos cuando se selecciona una fila para editar

**Archivos a Crear/Modificar:**

1. **stores/useDailyReportFormStore.ts** (NUEVO)

   - Store de Zustand para manejar el estado del formulario
   - Estados: `isOpen`, `selectedRow`, `isCreating`
   - Acciones: `openForCreate`, `openForEdit`, `close`, `reset`

2. **DailyReportRowFormRefactored.tsx** (MODIFICAR)

   - Integrar `useQuery` para cargar employees y equipments
   - Conectar con el store de Zustand
   - Eliminar props: `employees`, `equipments`, `open`, `onOpenChange`, `selectedRow`, `isCreating`
   - Agregar loaders en ResourcesSection mientras cargan los datos

3. **ResourcesSection.tsx** (MODIFICAR)

   - Agregar prop `isLoadingEmployees` y `isLoadingEquipments`
   - Mostrar skeleton/spinner en los inputs mientras cargan

4. **DayliReportWraper.tsx** (MODIFICAR)

   - Usar el store para abrir el formulario
   - Eliminar estados locales: `openForm`, `isCreating`, `selectedRow`
   - Simplificar `handleEditRow` y `handleCreateRow`

5. **EnhancedComercialReportTable.tsx** (MODIFICAR)
   - Usar el store para abrir el formulario en modo edición
   - Eliminar callback `onEdit` y usar directamente el store

#### Fase 6: Integración del Componente Refactorizado

**Situación Actual:**

- El componente `DailyReportForm` (del archivo `DailyReportRowForm.tsx`) se usa en `DayliReportWraper.tsx`
- Se utiliza tanto para **crear** como para **editar** líneas de partes diarios
- El wrapper maneja dos estados: `isCreating` y `selectedRow`

**Nueva Arquitectura:**

- Store centralizado maneja el estado del formulario
- Componente se auto-gestiona con useQuery
- Wrapper solo necesita renderizar el componente y usar el store para abrirlo

**Pasos de Implementación:**

### Paso 1: Crear el Zustand Store

**Archivo:** `src/stores/useDailyReportFormStore.ts`

```typescript
import { create } from 'zustand';

interface DailyReportFormState {
  isOpen: boolean;
  selectedRow: any | null;
  isCreating: boolean;

  // Acciones
  openForCreate: () => void;
  openForEdit: (row: any) => void;
  close: () => void;
  reset: () => void;
}

export const useDailyReportFormStore = create<DailyReportFormState>((set) => ({
  isOpen: false,
  selectedRow: null,
  isCreating: false,

  openForCreate: () => set({ isOpen: true, isCreating: true, selectedRow: null }),

  openForEdit: (row) => set({ isOpen: true, isCreating: false, selectedRow: row }),

  close: () => set({ isOpen: false }),

  reset: () => set({ isOpen: false, selectedRow: null, isCreating: false }),
}));
```

### Paso 2: Crear Hook para useQuery de Recursos

**Archivo:** `src/features/Empresa/Clientes/components/operations/components/hooks/useResourcesData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
  getCustomers,
} from '@/features/Operaciones/PartesDiarios/actions/actions';

export function useResourcesData() {
  const employeesQuery = useQuery({
    queryKey: ['active-employees'],
    queryFn: getActiveEmployeesForDailyReport,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const equipmentsQuery = useQuery({
    queryKey: ['active-equipments'],
    queryFn: getActiveEquipmentsForDailyReport,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    employees: employeesQuery.data || [],
    isLoadingEmployees: employeesQuery.isLoading,
    equipments: equipmentsQuery.data || [],
    isLoadingEquipments: equipmentsQuery.isLoading,
    customers: customersQuery.data || [],
    isLoadingCustomers: customersQuery.isLoading,
    isLoading: employeesQuery.isLoading || equipmentsQuery.isLoading || customersQuery.isLoading,
  };
}
```

### Paso 3: Actualizar ResourcesSection para mostrar loaders

**Modificar:** `src/features/Empresa/Clientes/components/operations/components/form-sections/ResourcesSection.tsx`

Agregar props:

```typescript
type ResourcesSectionProps = {
  form: UseFormReturn<any>;
  employees: any[];
  equipments: any[];
  customerEquipments: any[];
  isCreating: boolean;
  selectedRow: any;
  disabled?: boolean;
  isLoadingEmployees?: boolean; // NUEVO
  isLoadingEquipments?: boolean; // NUEVO
};
```

En los Popover de empleados y equipos, mostrar skeleton cuando `isLoadingEmployees` o `isLoadingEquipments` sea true.

### Paso 4: Actualizar DailyReportRowFormRefactored

**Modificar:** `src/features/Empresa/Clientes/components/operations/components/DailyReportRowFormRefactored.tsx`

```typescript
'use client';

import { useDailyReportFormStore } from '@/stores/useDailyReportFormStore';
import { useResourcesData } from './hooks/useResourcesData';
// ... otros imports

// Eliminar todas las props, el componente se auto-gestiona
export function DailyReportRowFormRefactored() {
  // Estado desde el store
  const { isOpen, selectedRow, isCreating, close, reset } = useDailyReportFormStore();

  // Datos con useQuery
  const {
    employees,
    isLoadingEmployees,
    equipments,
    isLoadingEquipments,
    customers,
    isLoadingCustomers,
  } = useResourcesData();

  // ... resto del código

  const handleCancel = () => {
    form.reset();
    reset(); // Usar reset del store en lugar de onOpenChange
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      {/* ... */}
      <ResourcesSection
        form={form}
        employees={employees}
        equipments={equipments}
        customerEquipments={customerEquipments}
        isCreating={isCreating}
        selectedRow={selectedRow}
        disabled={disabled}
        isLoadingEmployees={isLoadingEmployees}
        isLoadingEquipments={isLoadingEquipments}
      />
      {/* ... */}
    </Sheet>
  );
}
```

### Paso 5: Actualizar DayliReportWraper

**Modificar:** `src/features/Empresa/Clientes/components/operations/components/DayliReportWraper.tsx`

```typescript
import { useDailyReportFormStore } from '@/stores/useDailyReportFormStore';
import { DailyReportRowFormRefactored } from './DailyReportRowFormRefactored';

export default function DailyReportWrapper() {
  const { openForCreate, openForEdit } = useDailyReportFormStore();

  // Eliminar estos estados:
  // const [selectedRow, setSelectedRow] = useState<any | null>(null);
  // const [openForm, setOpenForm] = useState(false);
  // const [isCreating, setIsCreating] = useState(false);
  // const [customers, setCustomers] = useState(...);
  // const [employeesPromise, setEmployeesPromise] = useState(...);
  // const [equipmentsPromise, setEquipmentsPromise] = useState(...);

  const handleEditRow = useCallback((row: any) => {
    openForEdit(row);
  }, [openForEdit]);

  const handleCreateRow = useCallback(() => {
    openForCreate();
  }, [openForCreate]);

  return (
    <div className="space-y-6">
      {/* ... filtros ... */}

      <EnhancedComercialReportTable
        dailyReports={formattedData}
        onEdit={handleEditRow}
        // ... otras props
      />

      {/* Componente sin props, se auto-gestiona */}
      <DailyReportRowFormRefactored />
    </div>
  );
}
```

### Paso 6: Actualizar EnhancedComercialReportTable (Opcional)

**Modificar:** `src/features/Empresa/Clientes/components/operations/components/EnhancedComercialReportTable.tsx`

Opcionalmente, puedes usar el store directamente en la tabla:

```typescript
import { useDailyReportFormStore } from '@/stores/useDailyReportFormStore';

export const EnhancedComercialReportTable: React.FC<Props> = ({ ... }) => {
  const { openForEdit } = useDailyReportFormStore();

  // En la columna de acciones:
  <Button onClick={() => openForEdit(row.original)}>
    <Edit size={16} />
  </Button>
}
```

### Paso 7: Pruebas

1. ✅ Verificar que el modal se abre correctamente en modo creación
2. ✅ Verificar que el modal se abre correctamente en modo edición con datos precargados
3. ✅ Verificar que los loaders se muestran mientras cargan empleados y equipos
4. ✅ Verificar que las validaciones funcionan correctamente
5. ✅ Verificar que el refetch funciona después de guardar
6. ✅ Verificar que el modal se cierra correctamente

### Paso 8: Limpieza

1. Eliminar `DailyReportRowForm.tsx` (componente antiguo)
2. Renombrar `DailyReportRowFormRefactored.tsx` a `DailyReportRowForm.tsx`
3. Actualizar imports en los archivos que lo usen
4. Eliminar código muerto del wrapper (estados y funciones no usadas)

#### Comparación de Arquitecturas

**Arquitectura Antigua:**

```typescript
// Wrapper maneja todo el estado
const [openForm, setOpenForm] = useState(false);
const [isCreating, setIsCreating] = useState(false);
const [selectedRow, setSelectedRow] = useState(null);
const [employees, setEmployees] = useState([]);
const [equipments, setEquipments] = useState([]);

// Componente recibe muchas props
<DailyReportForm
  open={openForm}
  onOpenChange={setOpenForm}
  selectedRow={selectedRow}
  customers={customers}
  employeesPromise={employeesPromise}
  equipmentsPromise={equipmentsPromise}
  isCreating={isCreating}
  // ... más props
/>
```

**Arquitectura Nueva:**

```typescript
// Wrapper solo usa el store
const { openForCreate, openForEdit } = useDailyReportFormStore();

// Componente se auto-gestiona (sin props)
<DailyReportRowFormRefactored />

// Abrir modal desde cualquier lugar
openForCreate(); // Para crear
openForEdit(row); // Para editar
```

**Ventajas de la Nueva Arquitectura:**

- ✅ Menos props drilling
- ✅ Estado centralizado y reutilizable
- ✅ Fetching optimizado con cache (React Query)
- ✅ Loaders específicos por recurso
- ✅ Más fácil de mantener y testear
- ✅ Puede abrirse desde cualquier componente sin pasar callbacks

### Notas Técnicas

- Se utilizó `as any` para resolver conflictos de tipos entre la definición de Customer en useCustomerData y el tipo real de getCustomers
- Los nombres de campos se mantuvieron consistentes con la estructura existente (customer, services, item, etc.)
- El esquema de validación se adaptó para soportar tanto modo creación como edición
- Se mantuvieron todas las validaciones existentes (al menos 1 empleado O 1 equipo, máximo 2 equipos de cliente, etc.)
- El componente refactorizado simplifica las props eliminando dependencias innecesarias como `dailyReport`, `setSelectedRow` y `formattedData`

## Detalles de Implementación

### Loaders en ResourcesSection

**Ejemplo de implementación del loader en el selector de empleados:**

```typescript
// En ResourcesSection.tsx
<FormField
  control={form.control}
  name="employees"
  render={({ field }) => (
    <FormItem className="flex flex-col">
      <FormLabel>Empleados</FormLabel>
      {isCreating ? (
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                role="combobox"
                disabled={disabled || isLoadingEmployees}
                className="w-full justify-between"
              >
                {isLoadingEmployees ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando empleados...
                  </>
                ) : selectedEmployees.length > 0 ? (
                  `${selectedEmployees.length} empleado(s) seleccionado(s)`
                ) : (
                  'Seleccionar empleados'
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar empleado..." />
              <CommandList>
                {isLoadingEmployees ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Cargando empleados...
                    </p>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((employee) => (
                        // ... renderizar empleados
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        // Modo edición (solo lectura)
      )}
      <FormMessage />
    </FormItem>
  )}
/>
```

### Estructura del Store

El store de Zustand permite:

1. **Abrir para crear:**

   ```typescript
   const { openForCreate } = useDailyReportFormStore();
   openForCreate(); // isOpen=true, isCreating=true, selectedRow=null
   ```

2. **Abrir para editar:**

   ```typescript
   const { openForEdit } = useDailyReportFormStore();
   openForEdit(rowData); // isOpen=true, isCreating=false, selectedRow=rowData
   ```

3. **Cerrar:**

   ```typescript
   const { close } = useDailyReportFormStore();
   close(); // isOpen=false (mantiene selectedRow e isCreating)
   ```

4. **Reset completo:**
   ```typescript
   const { reset } = useDailyReportFormStore();
   reset(); // isOpen=false, isCreating=false, selectedRow=null
   ```

### Flujo de Datos con React Query

```
┌─────────────────────────────────────────────────────────────┐
│                    DailyReportRowFormRefactored             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useResourcesData() Hook                              │  │
│  │                                                      │  │
│  │  useQuery('active-employees')  ──► employees[]      │  │
│  │  useQuery('active-equipments') ──► equipments[]     │  │
│  │  useQuery('customers')         ──► customers[]      │  │
│  │                                                      │  │
│  │  isLoadingEmployees   ──► Loader en input          │  │
│  │  isLoadingEquipments  ──► Loader en input          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useDailyReportFormStore()                            │  │
│  │                                                      │  │
│  │  isOpen        ──► Controla Sheet                   │  │
│  │  isCreating    ──► Modo creación/edición            │  │
│  │  selectedRow   ──► Datos precargados                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Beneficios del Cache de React Query

- **Primera carga:** Fetching desde el servidor
- **Cargas subsecuentes:** Datos desde cache (instantáneo)
- **Revalidación automática:** Después de 5 minutos (staleTime)
- **Refetch en background:** Mantiene datos actualizados
- **Menos llamadas al servidor:** Mejor performance

### Consideraciones de Refetch

Después de crear o editar una línea, necesitamos refrescar la tabla:

```typescript
// En useFormSubmit.ts
import { useQueryClient } from '@tanstack/react-query';

export function useFormSubmit(...) {
  const queryClient = useQueryClient();

  const onSubmit = async (data) => {
    // ... guardar datos

    // Invalidar queries para refrescar
    queryClient.invalidateQueries({ queryKey: ['daily-reports'] });

    // Cerrar modal
    reset();
  };
}
```

## Checklist de Implementación

- [ ] Crear `src/stores/useDailyReportFormStore.ts`
- [ ] Crear `src/features/Empresa/Clientes/components/operations/components/hooks/useResourcesData.ts`
- [ ] Actualizar `ResourcesSection.tsx` con props de loading
- [ ] Agregar loaders en inputs de empleados y equipos
- [ ] Actualizar `DailyReportRowFormRefactored.tsx` para usar store y useQuery
- [ ] Actualizar `DayliReportWraper.tsx` para usar store
- [ ] Actualizar `useFormSubmit.ts` para invalidar queries
- [ ] Probar modo creación
- [ ] Probar modo edición
- [ ] Probar loaders
- [ ] Verificar refetch después de guardar
- [ ] Eliminar componente antiguo
- [ ] Renombrar componente refactorizado
