# Mapeo de Estructura de Tabs

## Estado Actual vs Estructura Deseada

### Módulos Existentes ✅

Todos los módulos ya existen en la base de datos:

1. Dashboard
2. Empresa
3. Empleados
4. Equipos
5. Comercial
6. Documentación
7. Mantenimiento
8. Operaciones
9. Formularios
10. Ayuda

### Tabs Actuales vs Tabs Necesarios

#### 1. Dashboard

- **Actual**: 1 tab (`main`)
- **Necesario**: Sin tabs (vista única)
- **Acción**: Eliminar tab `main` o dejarlo como está

#### 2. Empresa

- **Actual**: 5 tabs (`general`, `usuarios`, `clientes`, `equipos`, `rrhh`)
- **Necesario**: 3 tabs principales con subtabs
  - `general` (5 subtabs): company, cost-center, organigrama, users, documentacion
  - `rrhh` (6 subtabs): listado, diagrams, convenios, contract-types, positions, aptitudes
  - `vehicles` (5 subtabs): tipos, marcas, modelos, subtipos, titulares

#### 3. Empleados

- **Actual**: 2 tabs (`lista`, `diagramas`)
- **Necesario**: 5 tabs
  - `employees` (2 subtabs): empleados-activos, empleados-inactivos
  - `documentos-de-empleados` (2 subtabs): permanentes, mensuales
  - `diagrams` (4 subtabs): old, new, massive_diagram, reports
  - `tipos-de-documentos` (sin subtabs)
  - `covenant` (sin subtabs)

#### 4. Equipos

- **Actual**: 4 tabs (`lista`, `tipos`, `marcas`, `modelos`)
- **Necesario**: 4 tabs principales con subtabs
  - `equipos` (3 subtabs): vehicles, others, inactive
  - `documentos-de-equipos` (2 subtabs): permanentes, mensuales
  - `tipos-de-documentos` (sin subtabs)
  - `type_of_repairs` (4 subtabs): created_solicitudes, type_of_repair, type_of_repair_new_entry, maintenance_groups

#### 5. Comercial

- **Actual**: 3 tabs (`clientes`, `contratos`, `servicios`)
- **Necesario**: 1 tab principal con subtabs
  - `comerce` (7 subtabs): customers, areas, equipment, sector, service, mensure_units, daily_reports

#### 6. Documentación

- **Actual**: 4 tabs (`empleados`, `equipos`, `empresa`, `tipos`)
- **Necesario**: 4 tabs principales con subtabs
  - `documentos-de-empleados` (2 subtabs): permanentes, mensuales
  - `documentos-de-equipos` (2 subtabs): permanentes, mensuales
  - `documentos-de-empresa` (2 subtabs): permanentes, mensuales
  - `tipos-de-documentos` (sin subtabs)

#### 7. Mantenimiento

- **Actual**: 3 tabs (`solicitudes`, `tipos`, `historial`)
- **Necesario**: 1 tab principal con subtabs
  - `type_of_repairs` (4 subtabs): created_solicitudes, type_of_repair, type_of_repair_new_entry, maintenance_groups

#### 8. Operaciones

- **Actual**: 2 tabs (`preparte`, `partes-diarios`)
- **Necesario**: 2 tabs (sin subtabs)
  - `preparte`
  - `dailyreportstable`

#### 9. Formularios

- **Actual**: 2 tabs (`lista`, `respuestas`)
- **Necesario**: 1 tab (sin subtabs)
  - `formularios`

#### 10. Ayuda

- **Actual**: 2 tabs (`documentacion`, `soporte`)
- **Necesario**: Sin tabs (vista única)

## Recomendación

Dado que ya existe una estructura de tabs, tenemos dos opciones:

### Opción 1: Mantener estructura actual y agregar subtabs

- Mantener los tabs existentes
- Agregar subtabs donde sea necesario
- Actualizar slugs para que coincidan con el plan de migración

### Opción 2: Reemplazar estructura completa

- Eliminar todos los tabs actuales
- Insertar la nueva estructura completa
- Requiere migración de permisos existentes

## SQL para Insertar Estructura Completa

El archivo `supabase/seed-tabs-structure.sql` contiene todos los INSERTs necesarios para la estructura completa con:

- 28 tabs principales
- 44 subtabs
- Total: 72 tabs

Para aplicarlo:

```sql
-- Primero, eliminar tabs existentes (CUIDADO: esto eliminará permisos asociados)
DELETE FROM tabs;

-- Luego ejecutar el archivo seed-tabs-structure.sql
```

O usar la migración:

```bash
supabase db reset  # Resetea toda la BD
# O aplicar manualmente el archivo SQL
```

## Próximos Pasos

1. Decidir si mantener estructura actual o reemplazarla
2. Si se reemplaza, migrar permisos existentes
3. Actualizar componentes del frontend para usar los nuevos slugs
4. Actualizar tests E2E con los nuevos data-testid
