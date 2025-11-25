# Integración del Sistema de Remitos en el Formulario

## 🎯 Cambio Implementado

Se modificó el formulario de edición de partes diarios para que cuando se ingresa un número de remito, **se cree directamente en la tabla `remitos`** en lugar de guardarlo en `dailyreportrows.remit_number`.

## ✅ Archivo Modificado

**`src/features/Empresa/Clientes/components/operations/components/hooks/useFormSubmit.ts`**

### Cambios Realizados

#### 1. Import Agregado

```typescript
import { createRemitoClient } from '@/features/Operaciones/PartesDiarios/remitManager/actions/actionsClient';
```

#### 2. Función `handleCreate` (Crear Nueva Línea)

**ANTES:**

```typescript
const rowData = {
  // ... otros campos
  status: 'en_certificacion',
  remit_number: data.remit_number, // ❌ Se guardaba aquí
  // ... otros campos
};
```

**AHORA:**

```typescript
const rowData = {
  // ... otros campos
  status: 'en_certificacion',
  // ❌ NO se guarda remit_number aquí
  // ... otros campos
};

const createdRows = await createDailyReportRowClient([rowData as any]);
const newRowId = createdRows[0].id;

// ✅ NUEVO: Crear remito en tabla remitos
if (data.remit_number) {
  try {
    await createRemitoClient(newRowId, data.remit_number);
  } catch (error) {
    console.error('Error al crear remito:', error);
    toast.error('Error al crear el remito. La línea se creó pero sin remito.');
  }
}
```

#### 3. Función `handleUpdate` (Actualizar Línea Existente)

**ANTES:**

```typescript
const updateData = {
  status: finalStatus,
  remit_number: isChangingToCertificacion ? data.remit_number : null, // ❌ Se guardaba aquí
  // ... otros campos
};
await updateDailyReportStatusAndRemitNumberClient(selectedRow.id, updateData as any);
```

**AHORA:**

```typescript
const updateData = {
  status: finalStatus,
  // ❌ NO se guarda remit_number aquí
  // ... otros campos
};
await updateDailyReportStatusAndRemitNumberClient(selectedRow.id, updateData as any);

// ✅ NUEVO: Crear remito en tabla remitos
if (isChangingToCertificacion && data.remit_number) {
  try {
    await createRemitoClient(selectedRow.id, data.remit_number);
  } catch (error) {
    console.error('Error al crear remito:', error);
    if (error instanceof Error && error.message.includes('Ya existe')) {
      toast.warning('El remito ya existe para esta línea.');
    } else {
      toast.error('Error al crear el remito.');
    }
  }
}
```

## 🔄 Flujo Completo

### Escenario 1: Crear Nueva Línea con Remito

1. Usuario llena el formulario
2. Ingresa número de remito "12345"
3. Click en "Guardar"
4. **Se crea la línea** en `dailyreportrows` (SIN remit_number)
5. **Se crea el remito** en tabla `remitos` con `daily_report_row_id`
6. Usuario abre modal de gestión de remitos
7. ✅ Ve el remito "12345"

### Escenario 2: Actualizar Línea a "En Certificación"

1. Usuario edita una línea existente
2. Cambia estado a "en_certificacion"
3. Formulario pide número de remito
4. Ingresa "67890"
5. Click en "Guardar"
6. **Se actualiza el estado** en `dailyreportrows` (SIN remit_number)
7. **Se crea el remito** en tabla `remitos`
8. Usuario abre modal de gestión de remitos
9. ✅ Ve el remito "67890"

### Escenario 3: Remito Duplicado

1. Usuario intenta crear remito que ya existe
2. Sistema detecta duplicado
3. ⚠️ Muestra warning: "El remito ya existe para esta línea"
4. No se crea duplicado
5. Usuario puede abrir modal y ver el remito existente

## 📊 Ventajas

1. **Datos Centralizados**: Todos los remitos en tabla `remitos`
2. **Múltiples Remitos**: Permite agregar más remitos desde el modal
3. **Múltiples Documentos**: Cada remito puede tener varios documentos
4. **Sin Duplicados**: Validación automática
5. **Mejor Organización**: Estructura relacional correcta

## 🗄️ Estructura de Datos

### Tabla `dailyreportrows`

```sql
-- ❌ remit_number ya NO se usa (deprecated)
-- ❌ document_path ya NO se usa (deprecated)
-- ✅ Solo datos de la línea del parte diario
```

### Tabla `remitos`

```sql
-- ✅ Almacena todos los remitos
id UUID
daily_report_row_id UUID (FK a dailyreportrows)
remit_number TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### Tabla `remito_documents`

```sql
-- ✅ Almacena todos los documentos de cada remito
id UUID
remit_id UUID (FK a remitos)
document_path TEXT
document_name TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 🔧 Mantenimiento

### Columnas Deprecated

Las columnas `remit_number` y `document_path` en `dailyreportrows` se mantienen por compatibilidad pero **ya no se usan**. En el futuro pueden ser eliminadas.

### Migración de Datos Antiguos

Si hay datos antiguos en `dailyreportrows.remit_number`, se pueden migrar ejecutando:

```sql
-- Ver script: supabase/migrations/20250118_migrate_remitos_data.sql
```

## ✅ Resultado

Ahora cuando un usuario:

1. Crea o edita una línea con remito
2. El remito se guarda en la tabla `remitos`
3. Abre el modal de gestión de remitos
4. **Ve el remito inmediatamente**
5. Puede agregar más remitos
6. Puede agregar múltiples documentos por remito

¡El sistema ahora usa correctamente la nueva estructura de datos!
