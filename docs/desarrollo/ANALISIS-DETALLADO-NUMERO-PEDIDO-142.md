# Análisis Detallado: Problema con Número de Pedido 142

## 🔴 Problema Confirmado

El número de pedido `PED-0142` está asignado a **dos clientes diferentes**:

- **Vista Oil** (cliente_id: `c217157f-2731-4f05-b18b-a09c8dfc05ad`)
  - 4 registros creados el **2025-11-06** (dos grupos: 12:22:55 y 21:43:45)
- **YPF** (cliente_id: `2bc1a554-e4e5-49b3-95f0-680a74b68f72`)
  - 3 registros creados el **2025-11-07** (19:16:30)

## 📊 Secuencia de Eventos

### Día 1: 2025-11-06

**Vista Oil crea pedidos con PED-0142:**

- **12:22:55**: Se crean 2 registros con `PED-0142`
- **21:43:45**: Se crean 2 registros más con `PED-0142` (mismo número, mismo cliente ✅ CORRECTO)

**Análisis:**

- Vista Oil tenía pedidos anteriores (probablemente hasta PED-0141)
- Al crear nuevos pedidos, el sistema lee el último número global: `PED-0141`
- Genera: `PED-0142`
- Se asignan múltiples registros al mismo número (esto es correcto para el mismo cliente)

### Día 2: 2025-11-07

**YPF crea pedidos con PED-0142:**

- **19:16:30**: Se crean 3 registros con `PED-0142`

**Análisis:**

- YPF ya tenía pedidos anteriores (incluyendo `PED-0141` de 2025-11-06 y 2025-11-07)
- **PROBLEMA**: Al crear nuevos pedidos, el sistema lee el último número global
- En lugar de leer el último de YPF, lee el último global (probablemente `PED-0141` de Vista Oil o YPF)
- Genera: `PED-0142` (mismo número que ya usó Vista Oil)

## 🔍 Causa Raíz del Problema

### 1. **Lógica de Generación GLOBAL, No por Cliente**

La función `getLastOrderNumber()` busca el último número de **TODA la tabla**:

```typescript
// ❌ PROBLEMA: No filtra por cliente
const { data } = await supabase
  .from('preparte')
  .select('numero_pedido')
  .not('numero_pedido', 'is', null)
  .order('created_at', { ascending: false }) // El más reciente globalmente
  .limit(1);
```

**Resultado:**

- Si Vista Oil tiene `PED-0142` (creado 2025-11-06)
- Y YPF tiene `PED-0141` (creado 2025-11-07)
- Cuando YPF crea un nuevo pedido, el sistema lee `PED-0142` (el más reciente globalmente)
- Genera `PED-0143` ❌ (debería generar basado en el último de YPF, no global)

**PERO el problema es peor:** El sistema podría estar leyendo `PED-0141` si Vista Oil aún no había guardado, o si hay algún problema de timing.

### 2. **Race Condition o Timing Issue**

**Escenario posible:**

1. **2025-11-06 12:22:55**: Vista Oil genera `PED-0142` (lee último: `PED-0141`)
2. **2025-11-06 21:43:45**: Vista Oil genera otro `PED-0142` (lee último: `PED-0142` de sí mismo)
3. **2025-11-07 17:50-17:51**: YPF crea múltiples pedidos con `PED-0141`
4. **2025-11-07 19:16:30**: YPF intenta crear nuevo pedido
   - El sistema lee último global: podría leer `PED-0141` (si Vista Oil no aparece aún)
   - O podría haber un problema donde lee un número que no debería

### 3. **No Hay Validación de Unicidad por Cliente**

La base de datos **NO tiene constraint** que prevenga:

- Mismo número para diferentes clientes
- Solo previene si hay exactamente el mismo registro (por ID único)

## 🎯 El Problema Real

El número de pedido debería ser **secuencial por cliente**, no global:

```
Vista Oil: PED-0001, PED-0002, ..., PED-0141, PED-0142
YPF:       PED-0001, PED-0002, ..., PED-0141, PED-0003 (siguiente)
```

Pero la lógica actual genera:

```
Global:    PED-0141 → PED-0142 → PED-0143
```

Sin importar el cliente.

## ✅ Solución Requerida

1. **Modificar `getLastOrderNumber()` para filtrar por `cliente_id`**
2. **Agregar UNIQUE constraint** en base de datos: `(cliente_id, numero_pedido)`
3. **Validar antes de crear** que el número no exista para otro cliente
