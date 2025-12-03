# 📋 Resumen: Problema con Número de Pedido Duplicado

## 🔴 Problema Confirmado

**Número de pedido `PED-0142` está en dos clientes diferentes:**

- **Vista Oil**: 4 registros (creados 2025-11-06)
- **YPF**: 3 registros (creados 2025-11-07)

## 🔍 Cómo se Calcula Actualmente

### Flujo de Generación:

1. **Usuario crea pedido** → Se llama `generateOrderNumber()`
2. **Función busca último número GLOBAL** (toda la tabla, sin filtrar por cliente)
3. **Incrementa el número** y lo asigna a todos los registros creados en ese proceso

### Código Problemático:

```typescript
// ❌ PROBLEMA: Busca el último número de TODA la tabla
export async function getLastOrderNumber() {
  const { data } = await supabase
    .from('preparte')
    .select('numero_pedido')
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false }) // Último globalmente
    .limit(1);
}

// ❌ PROBLEMA: No considera el cliente_id
const generateOrderNumber = async () => {
  const lastOrderNumber = await getLastOrderNumber(); // Último global
  const lastNumber = parseInt(lastOrderNumber.split('-')[1]);
  const newNumber = String(lastNumber + 1).padStart(4, '0');
  return `PED-${newNumber}`;
};
```

## 🐛 Por Qué Sucedió

### Secuencia de Eventos:

**Día 1 (2025-11-06):**

- **12:22:55**: Vista Oil crea pedidos → Sistema lee último global: `PED-0141` → Genera: `PED-0142` ✅
- **21:43:45**: Vista Oil crea más registros con el mismo `PED-0142` (correcto, mismo cliente)

**Día 2 (2025-11-07):**

- **19:16:30**: YPF crea pedidos → Sistema lee último global: probablemente `PED-0141` (último de YPF) → **ERROR**: Genera `PED-0142` ❌

### Posibles Causas:

1. **Race Condition**:

   - Vista Oil genera `PED-0142` pero aún no se guarda
   - YPF lee último: `PED-0141` → Genera `PED-0142`
   - Ambos guardan con el mismo número

2. **Problema de Query**:

   - La query busca el último por `created_at DESC`
   - Si hay un problema de índices o timing, podría leer un número incorrecto

3. **No Filtra por Cliente**:
   - El sistema debería buscar el último número **de YPF**, no global
   - Pero actualmente busca el último de todos los clientes

## ✅ Solución

### 1. Filtrar por Cliente en la Query:

```typescript
export async function getLastOrderNumber(cliente_id: string) {
  const { data } = await supabase
    .from('preparte')
    .select('numero_pedido')
    .eq('cliente_id', cliente_id) // 🔑 FILTRAR POR CLIENTE
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);
}
```

### 2. Pasar cliente_id a la función:

```typescript
const generateOrderNumber = async (cliente_id: string) => {
  const lastOrderNumber = await getLastOrderNumber(cliente_id);
  // ...
};
```

### 3. Agregar Constraint en Base de Datos:

```sql
ALTER TABLE preparte
ADD CONSTRAINT preparte_cliente_numero_pedido_unique
UNIQUE (cliente_id, numero_pedido);
```
