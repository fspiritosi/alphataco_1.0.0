# Ejemplo Práctico: Duplicación de PED-0142

## 🔍 Lo que Realmente Pasó (con datos reales)

### Estado de la Base de Datos ANTES de que YPF creara el duplicado:

```
2025-11-06 12:22:55  →  Vista Oil  →  PED-0142 ✅
2025-11-06 21:43:45  →  Vista Oil  →  PED-0142 ✅ (mismo número, mismo cliente)
2025-11-07 17:50:58  →  YPF        →  PED-0141 ✅
2025-11-07 17:51:17  →  YPF        →  PED-0141 ✅ (mismo número, mismo cliente)
2025-11-07 17:51:58  →  YPF        →  PED-0141 ✅ (mismo número, mismo cliente)
```

### Momento del Error (2025-11-07 19:16:30):

**Usuario de YPF intenta crear un nuevo pedido**

```typescript
// PASO 1: getLastOrderNumber() se ejecuta
getLastOrderNumber() {
  // Query SQL:
  SELECT numero_pedido
  FROM preparte
  WHERE numero_pedido IS NOT NULL
  ORDER BY created_at DESC  // ← Ordena por fecha, NO por cliente
  LIMIT 1;

  // Resultado:
  // {
  //   numero_pedido: "PED-0141",
  //   created_at: "2025-11-07 17:51:58",
  //   cliente_id: "YPF"
  // }

  return "PED-0141";  // ← El más reciente GLOBALMENTE
}

// PASO 2: generateOrderNumber() calcula el siguiente
generateOrderNumber() {
  const last = "PED-0141";
  const numero = parseInt(last.split('-')[1]);  // = 141
  const siguiente = numero + 1;                 // = 142
  return `PED-${String(142).padStart(4, '0')}`; // = "PED-0142"
}

// PASO 3: Se asigna PED-0142 a YPF
// ❌ PROBLEMA: Vista Oil ya tiene PED-0142 desde el día anterior
```

---

## ✅ Lo que DEBERÍA pasar (con filtro por cliente)

### Mismo escenario, pero filtrando por cliente:

```typescript
// PASO 1: getLastOrderNumber(cliente_id) se ejecuta PARA YPF
getLastOrderNumber("ypf-id") {
  // Query SQL:
  SELECT numero_pedido
  FROM preparte
  WHERE numero_pedido IS NOT NULL
    AND cliente_id = 'ypf-id'  // ← Filtra por YPF
  ORDER BY created_at DESC
  LIMIT 1;

  // Resultado:
  // {
  //   numero_pedido: "PED-0141",
  //   created_at: "2025-11-07 17:51:58",
  //   cliente_id: "YPF"
  // }

  return "PED-0141";  // ← El más reciente DE YPF
}

// PASO 2: generateOrderNumber() calcula el siguiente PARA YPF
generateOrderNumber("ypf-id") {
  const last = "PED-0141";  // Último de YPF
  const numero = parseInt(last.split('-')[1]);  // = 141
  const siguiente = numero + 1;                 // = 142
  return `PED-${String(142).padStart(4, '0')}`; // = "PED-0142"
}

// PASO 3: Se asigna PED-0142 a YPF
// ✅ VÁLIDO: Vista Oil puede tener PED-0142, YPF también puede tenerlo
//    Son secuencias independientes
```

---

## 📊 Comparación Visual

### Estado Actual (INCORRECTO):

```
┌─────────────────────────────────────────┐
│  ÚLTIMO NÚMERO GLOBAL                  │
│  (Busca en TODOS los clientes)         │
├─────────────────────────────────────────┤
│                                         │
│  Vista Oil:  PED-0142 (06/11 12:22)    │
│  Vista Oil:  PED-0142 (06/11 21:43)    │
│  YPF:        PED-0141 (07/11 17:51) ← Último │
│                                         │
│  Cuando YPF crea nuevo:                │
│  → Busca último global                 │
│  → Encuentra: PED-0141                 │
│  → Genera: PED-0142                    │
│  ❌ DUPLICA con Vista Oil              │
└─────────────────────────────────────────┘
```

### Estado Esperado (CORRECTO):

```
┌─────────────────────────────────────────┐
│  ÚLTIMO NÚMERO POR CLIENTE             │
│  (Cada cliente tiene su contador)      │
├─────────────────────────────────────────┤
│                                         │
│  VISTA OIL:                            │
│  ├─ PED-0140                           │
│  ├─ PED-0141                           │
│  └─ PED-0142 ← Último de Vista Oil    │
│      (Siguiente sería: PED-0143)       │
│                                         │
│  YPF:                                  │
│  ├─ PED-0140                           │
│  ├─ PED-0141 ← Último de YPF          │
│  └─ [Siguiente: PED-0142] ✅          │
│      (Válido, es secuencia independiente)│
└─────────────────────────────────────────┘
```

---

## 🎯 Respuesta Directa

### "¿Por qué se creó otro con el mismo número?"

**Porque el sistema busca el último número de TODA la base de datos (global), no del cliente específico.**

En ese momento:

- Último global: `PED-0141` (de YPF, más reciente por fecha)
- Sistema calcula: 141 + 1 = 142
- Asigna: `PED-0142` a YPF
- **NO verifica** que Vista Oil ya tiene `PED-0142` desde el día anterior

### "¿Cómo soluciona filtrar por cliente?"

**Cada cliente mantiene su propia secuencia de números, independiente de los demás.**

Ahora:

- Sistema busca: "Último número DE YPF" → Encuentra `PED-0141`
- Sistema calcula: 141 + 1 = 142
- Asigna: `PED-0142` a YPF
- **No importa** que Vista Oil tenga `PED-0142`, porque son secuencias independientes

**Es como tener dos libros de facturas separados:**

- Vista Oil tiene su libro: Factura 142, 143, 144...
- YPF tiene su libro: Factura 142, 143, 144...
- Pueden tener el mismo número sin problema.

---

## ✅ Validación con Constraint

Para asegurarnos que esto funcione correctamente, la base de datos debe tener:

```sql
-- Constraint único: (cliente_id, numero_pedido)
-- Esto garantiza que un cliente no puede tener números duplicados
-- Pero permite que diferentes clientes tengan el mismo número

ALTER TABLE preparte
ADD CONSTRAINT unique_cliente_numero_pedido
UNIQUE (cliente_id, numero_pedido);
```

**Esto permite:**

- ✅ Vista Oil: PED-0142 (único)
- ✅ YPF: PED-0142 (único)
- ❌ YPF: PED-0142 duplicado (bloqueado por constraint)
