# Explicación: Cómo se Calcula el Número de Pedido

## 📋 Proceso Actual de Cálculo

### 1. Flujo de Generación

Cuando se crea un **nuevo pedido** (no al editar):

```
Usuario crea pedido → generateOrderNumber() → getLastOrderNumber() → Incrementar → PED-XXXX
```

### 2. Función `getLastOrderNumber()`

**Ubicación:** `src/features/Operaciones/Preparte/actions/preparte.ts:380-399`

```typescript
export async function getLastOrderNumber() {
  const supabase = await supabaseServer();

  // 1. Busca en TODA la tabla preparte
  const { data, error } = await supabase
    .from('preparte')
    .select('numero_pedido')
    .not('numero_pedido', 'is', null) // Solo pedidos con número
    .order('created_at', { ascending: false }) // El más reciente primero
    .limit(1); // Solo toma 1 resultado

  if (error || !data || data.length === 0) {
    return 'PED-0000'; // Si no hay pedidos, inicia en 0000
  }

  return data[0]?.numero_pedido || 'PED-0000';
}
```

**¿Qué hace?**

- Busca el último número de pedido de **TODA la tabla** (sin filtrar por cliente)
- Ordena por `created_at` descendente (el más reciente)
- Retorna el número más reciente o `PED-0000` si no hay ninguno

### 3. Función `generateOrderNumber()`

**Ubicación:** `src/features/Operaciones/Preparte/components/PreparteManager.tsx:181-186`

```typescript
const generateOrderNumber = async () => {
  // 1. Obtener el último número (ej: "PED-0141")
  const lastOrderNumber = await getLastOrderNumber();

  // 2. Extraer la parte numérica (ej: "0141" → 141)
  const lastNumber = parseInt(lastOrderNumber.split('-')[1]);

  // 3. Incrementar y formatear (ej: 141 + 1 = 142 → "0142")
  const newNumber = String(lastNumber + 1).padStart(4, '0');

  // 4. Retornar el nuevo número (ej: "PED-0142")
  return `PED-${newNumber}`;
};
```

**Ejemplo paso a paso:**

```
1. Último número en BD: "PED-0141"
2. Split por '-': ["PED", "0141"]
3. Parsear: 141
4. Incrementar: 142
5. Formatear con padding: "0142"
6. Resultado: "PED-0142"
```

### 4. Uso en la Creación

**Ubicación:** `src/features/Operaciones/Preparte/components/PreparteManager.tsx:232-275`

```typescript
// Al crear un nuevo pedido (no edición)
const numeroPedido = await generateOrderNumber(); // Ej: "PED-0142"

// Este número se asigna a TODOS los registros creados en este proceso
for (const item of formData.item) {
  for (let i = 0; i < item.quantity; i++) {
    for (const date of dates) {
      prepartesToCreate.push({
        cliente_id: formData.cliente_id,
        contrato_id: formData.contrato_id,
        numero_pedido: numeroPedido, // 👈 Mismo número para todos
        // ... otros campos
      });
    }
  }
}
```

**Punto importante:**

- Si creas un pedido con 3 ítems y 2 fechas = 6 registros
- **TODOS tendrán el mismo `numero_pedido`** (ej: "PED-0142")

## ❌ Problema Identificado

### La Lógica Actual es GLOBAL, No por Cliente

```
Cliente A crea pedido → Último global: PED-0141 → Genera: PED-0142 ✅
Cliente B crea pedido → Último global: PED-0142 → Genera: PED-0143 ✅
Cliente A crea pedido → Último global: PED-0143 → Genera: PED-0144 ✅
```

**Pero en condiciones de concurrencia o si hay lag:**

```
Cliente A lee último: PED-0141 → Genera: PED-0142
Cliente B lee último: PED-0141 (antes de que A guarde) → Genera: PED-0142
Resultado: AMBOS tienen PED-0142 ❌
```

### El Problema Real:

1. **No filtra por cliente**: Busca el último número de TODOS los clientes
2. **No considera cliente_id**: El número debería ser único por cliente, pero se genera globalmente
3. **Race conditions**: Si dos usuarios crean pedidos simultáneamente, pueden obtener el mismo número

## ✅ Cómo Debería Funcionar

El número de pedido debería ser **secuencial por cliente**, no global:

```
Cliente A: PED-0001, PED-0002, PED-0003...
Cliente B: PED-0001, PED-0002, PED-0003...
Cliente C: PED-0001, PED-0002...
```

Cada cliente tiene su propia secuencia independiente.

## 🔧 Cambios Necesarios

### 1. Modificar `getLastOrderNumber()` para recibir `cliente_id`:

```typescript
export async function getLastOrderNumber(cliente_id: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('preparte')
    .select('numero_pedido')
    .eq('cliente_id', cliente_id) // 🔑 Filtrar por cliente
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  // ...
}
```

### 2. Modificar `generateOrderNumber()` para recibir `cliente_id`:

```typescript
const generateOrderNumber = async (cliente_id: string) => {
  const lastOrderNumber = await getLastOrderNumber(cliente_id);
  const lastNumber = parseInt(lastOrderNumber.split('-')[1]);
  const newNumber = String(lastNumber + 1).padStart(4, '0');
  return `PED-${newNumber}`;
};
```

### 3. Actualizar la llamada:

```typescript
// Antes:
const numeroPedido = await generateOrderNumber();

// Después:
const numeroPedido = await generateOrderNumber(formData.cliente_id);
```

## 📊 Ejemplo de Comportamiento Esperado

### Escenario:

- **Vista Oil** ya tiene: PED-0001, PED-0002, PED-0141
- **YPF** ya tiene: PED-0001, PED-0002

### Al crear nuevo pedido:

- **Vista Oil** → Busca último de Vista Oil: PED-0141 → Genera: **PED-0142** ✅
- **YPF** → Busca último de YPF: PED-0002 → Genera: **PED-0003** ✅

Cada cliente mantiene su propia secuencia.
