# 🔍 Análisis Final: Problema con Número de Pedido 142

## 📊 Evidencia de la Base de Datos

### Secuencia Cronológica Real:

1. **2025-11-06 12:22:55**: Vista Oil crea `PED-0142` (2 registros)
2. **2025-11-06 12:24:57**: Vista Oil crea `PED-0143` (2 registros)
3. **2025-11-06 21:43:45**: Vista Oil crea más registros con `PED-0142` (2 registros - mismo número, mismo cliente ✅)
4. **2025-11-07 15:47:56**: Shell crea `PED-0143` (diferente cliente)
5. **2025-11-07 17:51:58**: YPF crea `PED-0141` (3 registros)
6. **2025-11-07 19:16:30**: YPF crea `PED-0142` (3 registros) ❌ **PROBLEMA**

## 🎯 Problema Identificado

### Lo que está mal:

Cuando YPF crea pedidos el **2025-11-07 19:16:30**:

1. El sistema llama a `getLastOrderNumber()`
2. Esta función busca el último número de **TODA la tabla** (sin filtrar por cliente)
3. En ese momento, los últimos números globales son:
   - `PED-0141` de YPF (creado 17:51:58) ← más reciente
   - `PED-0143` de Shell (creado 15:47:56)
   - `PED-0142` de Vista Oil (creado 06 21:44:03)
4. El sistema lee: `PED-0141` (el más reciente por `created_at`)
5. Genera: `PED-0142`
6. **PROBLEMA**: Vista Oil ya tiene `PED-0142` desde el día anterior

### El Gap en la Lógica:

La función `getLastOrderNumber()` **NO filtra por cliente**. Busca el último número globalmente, lo que permite que:

- Diferentes clientes puedan obtener el mismo número
- No haya validación de unicidad por cliente
- Race conditions entre diferentes clientes

## 🔬 Análisis del Código

### Flujo Actual (INCORRECTO):

```typescript
// 1. Usuario crea pedido para YPF
const numeroPedido = await generateOrderNumber();  // ❌ No recibe cliente_id

// 2. generateOrderNumber() busca último número GLOBAL
const lastOrderNumber = await getLastOrderNumber();  // ❌ Sin filtro de cliente

// 3. getLastOrderNumber() busca en TODA la tabla
SELECT numero_pedido FROM preparte
WHERE numero_pedido IS NOT NULL
ORDER BY created_at DESC  // ❌ Último global, no del cliente
LIMIT 1;

// 4. Si encuentra PED-0141 (de cualquier cliente), genera PED-0142
// 5. YPF guarda con PED-0142, pero Vista Oil ya lo tiene
```

### Lo que DEBERÍA hacer:

```typescript
// 1. Usuario crea pedido para YPF
const numeroPedido = await generateOrderNumber(formData.cliente_id);  // ✅ Con cliente_id

// 2. generateOrderNumber() busca último número DE ESE CLIENTE
const lastOrderNumber = await getLastOrderNumber(cliente_id);  // ✅ Filtrado

// 3. getLastOrderNumber() busca solo del cliente YPF
SELECT numero_pedido FROM preparte
WHERE numero_pedido IS NOT NULL
  AND cliente_id = '2bc1a554-...'  // ✅ Filtro por cliente
ORDER BY created_at DESC
LIMIT 1;

// 4. Si YPF tiene PED-0141 como último, genera PED-0142
// 5. Pero espera... Vista Oil ya tiene PED-0142, entonces debería generar el siguiente de YPF
// 6. Debería buscar el último de YPF, no el global
```

**PERO AQUÍ ESTÁ EL VERDADERO PROBLEMA:**

Si YPF ya tiene `PED-0141` como su último número, y el sistema busca globalmente y encuentra `PED-0141`, genera `PED-0142`. Pero como la lógica es global, no valida si ese número ya existe para otro cliente.

## ✅ Solución

1. **Modificar `getLastOrderNumber()` para filtrar por cliente**
2. **Pasar `cliente_id` a `generateOrderNumber()`**
3. **Agregar constraint UNIQUE en BD**: `(cliente_id, numero_pedido)`
4. **Validar antes de guardar** que el número no exista para otro cliente
