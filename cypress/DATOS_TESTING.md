# Datos de Testing - Referencia Rápida

## 📍 Ubicación

**Archivo:** `supabase/seed-testing.sql`

## 👤 Usuario de Testing

```
Email: testing@e2e.com
Password: Testing123!
ID: 99999999-9999-9999-9999-999999999999
Company: GRUPO HORIZONTE SRL (be4119b0-12ca-4a8f-87ed-209239194dab)
```

## 🗂️ Datos Existentes (IDs Predecibles)

### Cliente de Testing

```
ID: 22222222-2222-2222-2222-222222222222
Nombre: Cliente Testing E2E
CUIT: 20111222333
```

### Servicio de Testing

```
ID: 33333333-3333-3333-3333-333333333333
Nombre: Servicio Testing E2E
Cliente: 22222222-2222-2222-2222-222222222222
```

### Item de Servicio

```
ID: 44444444-4444-4444-4444-444444444444
Nombre: Item Testing E2E
Servicio: 33333333-3333-3333-3333-333333333333
```

### Empleado de Testing

```
ID: 55555555-5555-5555-5555-555555555555
Nombre: Juan Testing
CUIL: 20-99999999-9
Legajo: TEST-001
```

### Empleados Adicionales

```
ID: 77777777-7777-7777-7777-777777777777
Nombre: Carlos Testing E2E
Legajo: EMP001

ID: 88888888-8888-8888-8888-888888888888
Nombre: María Testing E2E
Legajo: EMP002
```

### Equipo de Testing (Vehículo)

```
ID: 66666666-6666-6666-6666-666666666666
Dominio: TEST999
Motor: Motor Testing
Año: 2030
```

### Equipos Adicionales

```
ID: 99999999-9999-9999-9999-999999999999
Dominio: TEST001
Interno: VEH-TEST-001

ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
Dominio: TEST002
Interno: VEH-TEST-002
```

### Daily Report de Testing

```
ID: 11111111-1111-1111-1111-111111111111
Fecha: 2030-01-15
Estado: abierto
```

### Daily Report Row

```
ID: 77777777-7777-7777-7777-777777777777
Cliente: 22222222-2222-2222-2222-222222222222
Servicio: 33333333-3333-3333-3333-333333333333
Item: 44444444-4444-4444-4444-444444444444
Daily Report: 11111111-1111-1111-1111-111111111111
```

### Áreas del Cliente

```
ID: 55555555-5555-5555-5555-555555555555
Nombre: Área Testing Norte
Cliente: 22222222-2222-2222-2222-222222222222

ID: 66666666-6666-6666-6666-666666666666
Nombre: Área Testing Sur
Cliente: 22222222-2222-2222-2222-222222222222
```

## 📝 Convenciones para Nuevos Datos

### IDs

Usar patrones reconocibles:

```
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
cccccccc-cccc-cccc-cccc-cccccccccccc
dddddddd-dddd-dddd-dddd-dddddddddddd
eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```

### Nombres

Usar prefijos claros:

```
"Testing E2E [Entidad]"
"Test CRUD [Entidad]"
"[Entidad] Testing"
```

### Fechas

Usar año 2030:

```sql
'2030-01-15T10:00:00+00:00'
'2030-01-01'
```

### Company ID

Siempre usar:

```
be4119b0-12ca-4a8f-87ed-209239194dab
```

## 🔧 Comandos MCP Útiles

### Listar tablas

```
mcp_supabase_local_list_tables
```

### Ver estructura de tabla

```sql
mcp_supabase_local_execute_sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'nombre_tabla';
```

### Verificar datos existentes

```sql
mcp_supabase_local_execute_sql
SELECT * FROM tabla WHERE id = 'uuid-aqui';
```

## 📋 Template para Agregar Datos

```sql
-- ============================================
-- [DESCRIPCIÓN DE LA ENTIDAD]
-- ============================================
INSERT INTO tabla_nombre (
    id,
    campo1,
    campo2,
    company_id,
    created_at
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Valor Testing E2E',
    'Otro valor',
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    '2030-01-15T10:00:00+00:00'
) ON CONFLICT (id) DO NOTHING;
```

## ⚠️ Importante

1. **SIEMPRE** usar `ON CONFLICT (id) DO NOTHING` para evitar errores
2. **SIEMPRE** usar año 2030 para fechas
3. **SIEMPRE** usar IDs predecibles y documentarlos
4. **SIEMPRE** agregar comentarios descriptivos
5. **PREGUNTAR** al usuario antes de agregar datos nuevos

## 🔗 Referencias

- Archivo completo: `supabase/seed-testing.sql`
- Plan de migración: `cypress/MIGRATION_PLAN.md`
- Reglas de workflow: `.kiro/steering/cypress-e2e-workflow.md`
