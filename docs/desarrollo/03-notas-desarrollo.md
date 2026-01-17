✅Restarurar el flujo de pedir la reparacion justo despues del checklist (mantener el flujo actual para pode editar lo ingresado en el checklist por el chofer)
✅En la tab de operacions mostrar las planificadas
✅En el checklist vacio, mover el campo de dominio y los de al lado a al derecha para poder escribir
✅poner fondo verde y rojo en los campos de B Y M del checklist
✅A los campos de fechas en el PDF if fecha <= hoy() bg=red if hoy() < fecha >hoy()+30 => bg=yellow else bg=green
✅Agregar el cliente en el form de checklist y mostrarlo en el PDF
✅Reemplazar el campo de Chofer por uno de empleados (busqueda por nombre y documento)
✅revisar que mantiene logout el usuario a veces y toca recargar la pagina

<!-- pdf sinergia, segunda hoja poner el header -->

---

## SQLs para Nuevo Flujo de Mantenimiento (15/01/2026)

### 1. Tabla maintenance_requests

```sql
-- Tabla de solicitudes de mantenimiento (generadas desde desvíos de checklist)
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_answer_id UUID NOT NULL REFERENCES checklist_answers(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  user_id UUID REFERENCES profile(id),
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  rejection_reason TEXT,
  rejected_by UUID REFERENCES profile(id),
  rejected_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profile(id),
  approved_at TIMESTAMPTZ,
  kilometer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_maintenance_requests_equipment ON maintenance_requests(equipment_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_checklist ON maintenance_requests(checklist_answer_id);

-- Trigger para updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance requests"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can view maintenance requests"
  ON maintenance_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert maintenance requests"
  ON maintenance_requests FOR INSERT
  TO anon
  WITH CHECK (true);
```

### 2. Tabla maintenance_request_items

```sql
-- Tabla de items de solicitud de mantenimiento (relaciona solicitud con desvíos)
CREATE TABLE maintenance_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  checklist_deviation_id UUID NOT NULL REFERENCES checklist_deviations(id) ON DELETE CASCADE,
  repair_type_id UUID REFERENCES types_of_repairs(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(maintenance_request_id, checklist_deviation_id)
);

-- Índices
CREATE INDEX idx_maintenance_request_items_request ON maintenance_request_items(maintenance_request_id);
CREATE INDEX idx_maintenance_request_items_deviation ON maintenance_request_items(checklist_deviation_id);
CREATE INDEX idx_maintenance_request_items_status ON maintenance_request_items(status);

-- RLS Policies
ALTER TABLE maintenance_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance request items"
  ON maintenance_request_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert maintenance request items"
  ON maintenance_request_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update maintenance request items"
  ON maintenance_request_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can view maintenance request items"
  ON maintenance_request_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert maintenance request items"
  ON maintenance_request_items FOR INSERT
  TO anon
  WITH CHECK (true);
```

### 3. Tabla maintenance_orders

```sql
-- Tabla de pedidos de mantenimiento (solicitudes aprobadas pendientes de planificación)
CREATE TABLE maintenance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID REFERENCES maintenance_requests(id),
  equipment_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_scheduling'
    CHECK (status IN ('pending_scheduling', 'scheduled', 'in_workshop', 'completed', 'rejected')),
  scheduled_date DATE,
  scheduled_by UUID REFERENCES profile(id),
  scheduled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejected_by UUID REFERENCES profile(id),
  rejected_at TIMESTAMPTZ,
  workshop_entry_date TIMESTAMPTZ,
  workshop_approved_by UUID REFERENCES profile(id),
  kilometer_at_entry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_maintenance_orders_equipment ON maintenance_orders(equipment_id);
CREATE INDEX idx_maintenance_orders_status ON maintenance_orders(status);
CREATE INDEX idx_maintenance_orders_request ON maintenance_orders(maintenance_request_id);
CREATE INDEX idx_maintenance_orders_scheduled_date ON maintenance_orders(scheduled_date);

-- Trigger para updated_at
CREATE TRIGGER update_maintenance_orders_updated_at
  BEFORE UPDATE ON maintenance_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance orders"
  ON maintenance_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert maintenance orders"
  ON maintenance_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update maintenance orders"
  ON maintenance_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can view maintenance orders"
  ON maintenance_orders FOR SELECT
  TO anon
  USING (true);
```

### 4. Tabla maintenance_order_items

```sql
-- Tabla de items del pedido de mantenimiento
CREATE TABLE maintenance_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  maintenance_request_item_id UUID NOT NULL REFERENCES maintenance_request_items(id),
  repair_type_id UUID REFERENCES types_of_repairs(id),
  description TEXT,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_maintenance_order_items_order ON maintenance_order_items(maintenance_order_id);
CREATE INDEX idx_maintenance_order_items_request_item ON maintenance_order_items(maintenance_request_item_id);

-- RLS Policies
ALTER TABLE maintenance_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance order items"
  ON maintenance_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert maintenance order items"
  ON maintenance_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update maintenance order items"
  ON maintenance_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can view maintenance order items"
  ON maintenance_order_items FOR SELECT
  TO anon
  USING (true);
```

### 5. Insertar tabs para el nuevo flujo

```sql
-- Insertar las 3 nuevas tabs para el flujo de mantenimiento
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000020', '421e96da-5235-4857-bf81-e63336447f13',
 'maintenance_requests', 'Solicitudes de Mantenimiento', 'Solicitudes pendientes de aprobación', 5, '60000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000021', '421e96da-5235-4857-bf81-e63336447f13',
 'maintenance_orders', 'Pedidos de Mantenimiento', 'Pedidos aprobados pendientes de planificar', 6, '60000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000022', '421e96da-5235-4857-bf81-e63336447f13',
 'maintenance_operations', 'Operaciones', 'Pedidos planificados y en taller', 7, '60000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
```

### 6. Insertar permisos para rol admin

```sql
-- Insertar permisos para el rol admin (role_id = 14) en las nuevas tabs
-- view = e2128d70-7a60-46c0-bf6f-23ec5d44c89c
-- update = 8b70189a-cea5-4e3b-98f4-a76d6447003f
INSERT INTO role_permissions (role_id, tab_id, action_id) VALUES
-- maintenance_requests (view, update)
(14, '60000000-0000-0000-0000-000000000020', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'),
(14, '60000000-0000-0000-0000-000000000020', '8b70189a-cea5-4e3b-98f4-a76d6447003f'),
-- maintenance_orders (view, update)
(14, '60000000-0000-0000-0000-000000000021', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'),
(14, '60000000-0000-0000-0000-000000000021', '8b70189a-cea5-4e3b-98f4-a76d6447003f'),
-- maintenance_operations (view, update)
(14, '60000000-0000-0000-0000-000000000022', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'),
(14, '60000000-0000-0000-0000-000000000022', '8b70189a-cea5-4e3b-98f4-a76d6447003f')
ON CONFLICT DO NOTHING;
```

### 7. Insertar subtabs de Operaciones (16/01/2026)

```sql
-- Insertar subtabs de operations en la tabla tabs
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000023', '421e96da-5235-4857-bf81-e63336447f13', 'operations_pending', 'Pendientes de Ejecutar', 'Operaciones pendientes de ejecutar', 1, '60000000-0000-0000-0000-000000000022'),
('60000000-0000-0000-0000-000000000024', '421e96da-5235-4857-bf81-e63336447f13', 'operations_planned', 'Planificadas (Vista)', 'Operaciones planificadas (solo vista)', 2, '60000000-0000-0000-0000-000000000022')
ON CONFLICT (id) DO NOTHING;

-- Agregar permisos para el rol admin en las nuevas subtabs de operaciones
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN tabs t
CROSS JOIN actions a
WHERE r.slug = 'Administrador'
AND t.id IN ('60000000-0000-0000-0000-000000000023', '60000000-0000-0000-0000-000000000024')
AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```
