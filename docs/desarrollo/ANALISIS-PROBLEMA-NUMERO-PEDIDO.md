# Análisis: Problema de Número de Pedido Duplicado entre Clientes

## 🔴 Problema Identificado

El número de pedido `PED-0142` está asignado a **dos clientes diferentes**:

- **Vista Oil** (4 registros creados el 2025-11-06)
- **YPF** (3 registros creados el 2025-11-07)

Esto **NO debería ser posible** ya que el número de pedido debería ser único por cliente, permitiendo duplicados solo dentro del mismo cliente.

## 📊 Registros Afectados

### Cliente: Vista Oil

- 4 registros con `PED-0142`
- Creados: 2025-11-06 12:22:55 y 2025-11-06 21:43:45
- Status: reprogramado y confirmado

### Cliente: YPF

- 3 registros con `PED-0142`
- Creados: 2025-11-07 19:16:30
- Status: confirmado

## 🔍 Análisis de la Lógica Actual

### Función: `getLastOrderNumber()`

**Ubicación:** `src/features/Operaciones/Preparte/actions/preparte.ts:380-399`

```typescript
export async function getLastOrderNumber() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('preparte' as any)
    .select('numero_pedido')
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  // ...
  return (data[0] as any)?.numero_pedido || 'PED-0000';
}
```

**❌ Problema:** Esta función busca el último número de pedido de **TODA la tabla**, sin considerar el `cliente_id`. No filtra por cliente.

### Función: `generateOrderNumber()`

**Ubicación:** `src/features/Operaciones/Preparte/components/PreparteManager.tsx:181-186`

```typescript
const generateOrderNumber = async () => {
  const lastOrderNumber = await getLastOrderNumber();
  const lastNumber = parseInt(lastOrderNumber.split('-')[1]);
  const newNumber = String(lastNumber + 1).padStart(4, '0');
  return `PED-${newNumber}`;
};
```

**❌ Problema:** Incrementa el número globalmente, sin considerar el cliente. Si el último número fue `PED-0141` para cualquier cliente, el siguiente será `PED-0142` sin importar para qué cliente.

## 🐛 Cómo Llegó a Suceder

### Escenario:

1. **2025-11-06 12:22:55**: Vista Oil crea pedidos que obtienen `PED-0142` (el número global era 141)
2. **2025-11-06 21:43:45**: Vista Oil crea más registros que comparten el mismo `PED-0142` (esto está bien, mismo cliente)
3. **2025-11-07 19:16:30**: YPF intenta crear pedidos
   - El sistema busca el último número global: encuentra `PED-0142` de Vista Oil
   - Genera el siguiente: `PED-0143`
   - **PERO**: Si hubo algún problema de concurrencia, un error, o se crearon pedidos para Vista Oil después, el sistema podría haber usado `PED-0142` nuevamente

### Posibles Causas:

1. **Race Condition**: Si dos usuarios crean pedidos simultáneamente para diferentes clientes, ambos podrían obtener el mismo último número antes de que se incremente.

2. **Problema de Concurrencia en la Query**:

   - Usuario A (Vista Oil) lee último número: `PED-0141`
   - Usuario B (YPF) lee último número: `PED-0141` (antes de que A guarde)
   - Usuario A genera: `PED-0142` y guarda
   - Usuario B genera: `PED-0142` y guarda
   - Ambos tienen el mismo número para diferentes clientes

3. **No Hay Filtro por Cliente**: La lógica actual no considera el `cliente_id` en absoluto, solo busca el último número global.

4. **No Hay Validación en Backend**: No hay restricción de base de datos (UNIQUE constraint) que prevenga esto.

## 🔧 Validaciones Actuales

### Backend (Base de Datos):

- ❌ **NO hay UNIQUE constraint** en `(cliente_id, numero_pedido)`
- ❌ **NO hay validación** que prevenga duplicados entre clientes
- La columna `numero_pedido` es simplemente `text` nullable sin restricciones

### Frontend:

- ❌ **NO valida** si el número ya existe para otro cliente
- ❌ **NO filtra por cliente** al generar el número
- Solo genera el siguiente número secuencial global

## ✅ Solución Propuesta

### 1. Modificar `getLastOrderNumber()` para filtrar por cliente:

```typescript
export async function getLastOrderNumber(cliente_id: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('preparte' as any)
    .select('numero_pedido')
    .eq('cliente_id', cliente_id) // 🔑 Filtrar por cliente
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  // ...
}
```

### 2. Modificar `generateOrderNumber()` para recibir cliente_id:

```typescript
const generateOrderNumber = async (cliente_id: string) => {
  const lastOrderNumber = await getLastOrderNumber(cliente_id);
  const lastNumber = parseInt(lastOrderNumber.split('-')[1]);
  const newNumber = String(lastNumber + 1).padStart(4, '0');
  return `PED-${newNumber}`;
};
```

### 3. Agregar UNIQUE constraint en la base de datos:

```sql
-- Crear constraint único por cliente
ALTER TABLE preparte
ADD CONSTRAINT preparte_cliente_numero_pedido_unique
UNIQUE (cliente_id, numero_pedido);
```

### 4. Agregar validación en el frontend antes de crear:

- Verificar que el número no exista para otro cliente
- Manejar errores de duplicación

## 📝 Notas Adicionales

- Los registros existentes con `PED-0142` para YPF deberían ser corregidos manualmente
- La solución debería implementarse lo antes posible para prevenir futuros problemas
- Considerar migración de datos existentes para corregir números duplicados
