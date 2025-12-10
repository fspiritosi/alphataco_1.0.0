Mostrar el historico luego del KPI (historico de KPI)
Si el KPI vence no se muestra el grafico

## COD-164: Implementación de KPIs

### Queries de INSERT para tabs y permisos

```sql
-- Insertar tab de KPIs en el módulo Empresa
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '10000000-0000-0000-0000-000000000004',
  'e0478383-1287-4b5e-a727-985baf867173',
  'kpis',
  'KPIs',
  'Indicadores clave de desempeño',
  4,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Insertar permisos para la tab de KPIs (view, create, update)
-- Asignar permisos a roles: owner, admin, super-admin
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT
  r.id as role_id,
  '10000000-0000-0000-0000-000000000004'::uuid as tab_id,
  a.id as action_id
FROM roles r
CROSS JOIN actions a
WHERE a.slug IN ('view', 'create', 'update')
  AND r.slug IN ('owner', 'admin', 'super-admin')
ON CONFLICT DO NOTHING;
```

### Estructura de tablas creadas

- **kpis**: Tabla principal de KPIs con campos para número, vigencia, fórmula, soporte técnico y oportunidades de mejora
  - Campos: id, company_id, name, code, number, validity_date, calculation_formula, technical_support, improvement_opportunities, filters (jsonb), is_active, created_at, updated_at
- **kpi_revisions**: Historial de revisiones cuando se modifica número o fecha de vigencia
  - Campos: id, kpi_id, previous_number, new_number, previous_validity_date, new_validity_date, change_reason, changed_by, is_active, created_at
