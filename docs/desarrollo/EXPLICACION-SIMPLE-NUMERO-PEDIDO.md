# Explicación Simple: ¿Por qué se duplicó el número de pedido?

## 📊 El Problema Visual

### Lo que PASÓ:

```
Timeline de creación:

2025-11-06 12:22:55  →  Vista Oil crea PED-0142 ✅
2025-11-07 17:51:58  →  YPF crea PED-0141 ✅
2025-11-07 19:16:30  →  YPF intenta crear un nuevo pedido
                         ❌ Sistema genera PED-0142 (DUPLICADO)
```

### Lo que el Sistema HIZO (INCORRECTAMENTE):

```
1. getLastOrderNumber() busca: "¿Cuál fue el último número creado (por fecha)?"

   Respuesta: PED-0141 (de YPF, 17:51:58)

2. generateOrderNumber() calcula: 141 + 1 = 142

3. Asigna: PED-0142 a YPF

   ⚠️ PROBLEMA: No verificó si otro cliente ya tenía PED-0142
```

---

## 💡 La Solución: Secuencia por Cliente

### ¿Cómo debería funcionar?

**Cada cliente tiene su propio "contador" independiente:**

```
CLIENTE: Vista Oil
  └─ PED-0140
  └─ PED-0141
  └─ PED-0142 ← Último de Vista Oil
  └─ [Siguiente sería: PED-0143]

CLIENTE: YPF
  └─ PED-0140
  └─ PED-0141 ← Último de YPF
  └─ [Siguiente sería: PED-0142] ← Válido, porque es para YPF
```

**Es como tener dos cajas separadas:**

```
CAJA 1 (Vista Oil):
  [PED-0140] [PED-0141] [PED-0142] ← Aquí termina

CAJA 2 (YPF):
  [PED-0140] [PED-0141] [PED-0142] ← Puede tener el mismo número
```

---

## ❓ Respuestas Directas

### "¿Por qué se creó otro con el mismo número?"

**Porque el sistema busca el último número de TODOS los clientes, no del cliente específico.**

Ejemplo:

- Sistema busca: "Último número global" → Encuentra `PED-0141` (de YPF)
- Incrementa: 141 + 1 = 142
- Genera: `PED-0142` para YPF
- **NO verifica** que Vista Oil ya tiene `PED-0142`

### "¿Cómo soluciona filtrar por cliente?"

**Hace que cada cliente tenga su propia secuencia independiente.**

Ejemplo con filtro por cliente:

1. **YPF quiere crear un pedido:**

   - Sistema busca: "Último número de YPF" → Encuentra `PED-0141`
   - Incrementa: 141 + 1 = 142
   - Genera: `PED-0142` para YPF ✅
   - **No importa** que Vista Oil también tenga `PED-0142`

2. **Vista Oil quiere crear un pedido:**
   - Sistema busca: "Último número de Vista Oil" → Encuentra `PED-0142`
   - Incrementa: 142 + 1 = 143
   - Genera: `PED-0143` para Vista Oil ✅

---

## 🔄 Comparación: Antes vs Después

### ❌ ANTES (Incorrecto - Global):

```typescript
// Busca el último número de TODOS los clientes
getLastOrderNumber() {
  // Encuentra: PED-0141 (de cualquier cliente, el más reciente)
  // Genera: PED-0142 (sin importar el cliente)
  // ❌ Puede duplicar números entre clientes
}
```

**Resultado:** Múltiples clientes pueden tener el mismo número.

### ✅ DESPUÉS (Correcto - Por Cliente):

```typescript
// Busca el último número del CLIENTE ESPECÍFICO
getLastOrderNumber(cliente_id) {
  // Encuentra: PED-0141 (del cliente específico)
  // Genera: PED-0142 (para ese cliente)
  // ✅ Cada cliente tiene su propia secuencia
}
```

**Resultado:** Cada cliente mantiene su propia secuencia, sin conflictos.

---

## 🎯 Conclusión

**El número de pedido debe ser único DENTRO de cada cliente, no globalmente.**

Es como tener múltiples libros de facturas:

- Cada cliente tiene su propio libro
- Pueden tener el mismo número de factura
- Pero nunca se repiten dentro del mismo libro
