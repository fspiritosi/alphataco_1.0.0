# Explicación del Problema del Número de Pedido Duplicado

## 🔍 ¿Por qué se generó PED-0142 duplicado?

### El Problema Actual: Búsqueda Global

El sistema actualmente busca el **último número de pedido globalmente** (de todos los clientes), ordenando por fecha de creación (`created_at`).

**Cronología cuando YPF creó PED-0142 (2025-11-07 19:16:30):**

1. **2025-11-06 12:22:55**: Vista Oil crea `PED-0142` (2 registros)
2. **2025-11-06 21:43:45**: Vista Oil crea más registros con `PED-0142`
3. **2025-11-07 17:51:58**: YPF crea `PED-0141` (3 registros) ← **Este fue el más reciente**
4. **2025-11-07 19:16:30**: YPF intenta crear un nuevo pedido

### ¿Qué pasó cuando YPF intentó crear el pedido?

```typescript
// 1. getLastOrderNumber() busca el último número GLOBALMENTE
const { data } = await supabase
  .from('preparte')
  .select('numero_pedido')
  .not('numero_pedido', 'is', null)
  .order('created_at', { ascending: false }) // ❌ Ordena por fecha, no por cliente
  .limit(1);

// 2. Encontró: PED-0141 (de YPF, creado a las 17:51:58)
//    ⚠️ NO encontró PED-0142 de Vista Oil porque fue creado ANTES

// 3. generateOrderNumber() extrae el número:
const lastNumber = parseInt('PED-0141'.split('-')[1]); // = 141

// 4. Incrementa:
const newNumber = 141 + 1; // = 142

// 5. Genera:
return `PED-${String(142).padStart(4, '0')}`; // = "PED-0142"
```

**El sistema NO sabe que Vista Oil ya tiene PED-0142** porque:

- Solo busca el último número creado por fecha
- No verifica si ese número ya existe para otro cliente
- No considera que cada cliente debería tener su propia secuencia

---

## ✅ Solución: Filtrar por Cliente

### ¿Por qué filtrar por cliente lo soluciona?

La idea es que **cada cliente tenga su propia secuencia independiente** de números de pedido.

**Ejemplo conceptual:**

```
Vista Oil:
  - PED-0140 (2025-11-05)
  - PED-0141 (2025-11-05)
  - PED-0142 (2025-11-06) ← Vista Oil
  - PED-0143 (2025-11-06)
  - PED-0144 (2025-11-06)
  - PED-0145 (2025-11-06)

YPF:
  - PED-0140 (2025-11-06)
  - PED-0141 (2025-11-07) ← YPF
  - PED-0142 (2025-11-07) ← YPF (debería ser válido)
```

### Cómo funciona la solución:

```typescript
// 1. getLastOrderNumber() ahora filtra por cliente
export async function getLastOrderNumber(cliente_id: string) {
  const { data } = await supabase
    .from('preparte')
    .select('numero_pedido')
    .not('numero_pedido', 'is', null)
    .eq('cliente_id', cliente_id) // ✅ Filtra por cliente
    .order('created_at', { ascending: false })
    .limit(1);

  // ...
}

// 2. Cuando YPF crea un pedido:
const lastOrderNumber = await getLastOrderNumber('ypf-id');
// Encuentra: PED-0141 (último de YPF)

// 3. Genera el siguiente para YPF:
// PED-0142 (válido para YPF, aunque Vista Oil también tenga PED-0142)
```

### Ventajas:

1. **Secuencia independiente por cliente**: Cada cliente tiene su propio "contador"
2. **Evita conflictos**: Vista Oil puede tener PED-0142 y YPF también puede tenerlo
3. **Lógica de negocio correcta**: El número de pedido es único **dentro del cliente**, no globalmente

---

## 🎯 Respuesta a tus preguntas

### 1. "¿Por qué se creó otro con el mismo número en lugar del siguiente?"

**Respuesta:** Porque el sistema busca el último número **globalmente** (por fecha), no por cliente. Cuando YPF creó el pedido, el sistema encontró `PED-0141` (el más reciente globalmente) y generó `PED-0142` sin saber que Vista Oil ya lo tenía desde el día anterior.

### 2. "¿Cómo solucionaría considerar el cliente?"

**Respuesta:** Al filtrar por cliente, cada cliente mantiene su propia secuencia:

- Vista Oil: puede tener PED-0142, PED-0143, etc.
- YPF: puede tener su propio PED-0142, PED-0143, etc.
- Los números pueden "repetirse" entre clientes, pero nunca dentro del mismo cliente.

Es como tener múltiples contadores independientes, uno por cliente.

---

## 🔧 Cambios necesarios

1. **Modificar `getLastOrderNumber()`** para recibir `cliente_id` y filtrar por él
2. **Modificar `generateOrderNumber()`** para recibir `cliente_id` y pasarlo a `getLastOrderNumber()`
3. **Agregar constraint UNIQUE** en la BD: `UNIQUE (cliente_id, numero_pedido)`
4. **Pasar `cliente_id`** desde `PreparteManager` cuando se crea un pedido
