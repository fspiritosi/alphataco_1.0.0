# Análisis de Datos para Gráficos de KPIs

## 📊 Resumen de Datos Disponibles

### Tabla: `daily_indicators` (Snapshots Diarios)

- **Total de snapshots**: 3,224 registros
- **Rango de fechas**: 2025-08-27 a 2025-12-03 (98 días con datos)
- **Estructura**: `company_id`, `snapshot_date`, `source`, `metrics` (JSONB)

### Tabla: `kpi_revisions` (Historial de Cambios)

- **Estado actual**: Sin datos (tabla vacía)
- **Estructura**: Historial de cambios de `number` y `validity_date` de KPIs
- **Campos**: `kpi_id`, `previous_number`, `new_number`, `previous_validity_date`, `new_validity_date`, `change_reason`, `changed_by`, `created_at`

---

## 📈 Fuentes de Datos Disponibles (Sources)

### 1. **get_employee_usage_indicator** (392 snapshots)

**Estructura de metrics:**

```json
{
  "indicator": 49.7, // Porcentaje de uso
  "employees_used": 163, // Empleados usados
  "employees_operativos": 328 // Empleados operativos totales
}
```

**Gráficos posibles:**

- 📊 **Línea temporal**: Evolución del indicador de uso de empleados
- 📊 **Línea temporal comparativa**: Empleados usados vs operativos
- 📊 **Área apilada**: Empleados usados vs disponibles
- 📊 **Gauge/Métrica circular**: Porcentaje de uso actual
- 📊 **Barras comparativas**: Empleados usados vs operativos por período

---

### 2. **get_vehicle_usage_indicator** (110 snapshots)

**Estructura de metrics:**

```json
[
  {
    "type_id": "uuid",
    "type_name": "Chasis",
    "subtype_id": "uuid",
    "subtype_name": "Porta Contenedor - Simple",
    "used_units": 16,
    "available_units": 21,
    "usage_indicator": 0.7619,
    "not_available_units": 1
  }
  // ... más tipos y subtipos
]
```

**Gráficos posibles:**

- 📊 **Línea temporal múltiple**: Evolución de uso por tipo de vehículo
- 📊 **Barras apiladas**: Usados vs Disponibles vs No disponibles por tipo
- 📊 **Heatmap**: Uso por tipo y subtipo a lo largo del tiempo
- 📊 **Treemap**: Distribución de uso por tipo/subtipo
- 📊 **Gráfico de barras horizontales**: Top 10 tipos con mayor uso
- 📊 **Gráfico de dona**: Distribución porcentual por tipo
- 📊 **Línea temporal comparativa**: Comparar tipos específicos

---

### 3. **hr_get_absenteeism_summary** (372 snapshots)

**Estructura de metrics:**

```json
{
  "altas": 0,
  "bajas": 0,
  "totalAusentes": 15,
  "dotacionActual": 492,
  "dotacionAnterior": 492,
  "porcentajeAusentismo": 3.05
}
```

**Gráficos posibles:**

- 📊 **Línea temporal**: Evolución del porcentaje de ausentismo
- 📊 **Línea temporal múltiple**: Altas, bajas, ausentes, dotación
- 📊 **Área apilada**: Dotación actual vs ausentes
- 📊 **Gauge**: Porcentaje de ausentismo actual
- 📊 **Barras comparativas**: Dotación actual vs anterior
- 📊 **Gráfico combinado**: Línea (porcentaje) + Barras (valores absolutos)

---

### 4. **hr_get_absenteeism_trend** (372 snapshots)

**Estructura de metrics:**

```json
{
  "percentage": 3.05
}
```

**Gráficos posibles:**

- 📊 **Línea temporal simple**: Tendencia del ausentismo
- 📊 **Área**: Tendencia con área sombreada
- 📊 **Línea con puntos**: Tendencia con marcadores

---

### 5. **hr_get_daily_absence_timeseries** (372 snapshots)

**Estructura de metrics:**

```json
{
  "altas": 0,
  "bajas": 0,
  "dotacion": 492,
  "vacaciones": 3,
  "totalAusentes": 15,
  "totalDotacion": 492,
  "porcentajeAusentismo": 3.05
}
```

**Gráficos posibles:**

- 📊 **Línea temporal múltiple**: Altas, bajas, dotación, vacaciones, ausentes
- 📊 **Área apilada**: Desglose de ausentes por tipo
- 📊 **Línea temporal con área**: Evolución del porcentaje de ausentismo
- 📊 **Gráfico combinado**: Líneas para valores absolutos + área para porcentaje

---

### 6. **get_company_counts_indicator** (392 snapshots)

**Estructura de metrics:**

```json
{
  "total_count": 768,
  "vehicle_count": 276,
  "employee_count": 492
}
```

**Gráficos posibles:**

- 📊 **Línea temporal múltiple**: Evolución de total, vehículos, empleados
- 📊 **Área apilada**: Distribución de vehículos vs empleados
- 📊 **Barras agrupadas**: Comparación por tipo a lo largo del tiempo
- 📊 **Gráfico de dona**: Proporción vehículos vs empleados
- 📊 **Gráfico combinado**: Líneas para cada categoría

---

### 7. **get_employee_diagram_count_by_day** (98 snapshots)

**Estructura de metrics:**

```json
[
  {
    "diagram_type_id": "uuid",
    "diagram_type_name": "Franco",
    "cantidad_empleados": 141,
    "diagram_type_color": "#f02d2d"
  },
  {
    "diagram_type_id": "uuid",
    "diagram_type_name": "Trabajando de Día",
    "cantidad_empleados": 76,
    "diagram_type_color": "#00f048"
  }
  // ... más tipos de diagrama
]
```

**Gráficos posibles:**

- 📊 **Línea temporal múltiple**: Evolución por tipo de diagrama
- 📊 **Área apilada**: Distribución de empleados por tipo de diagrama
- 📊 **Barras apiladas**: Cantidad de empleados por tipo
- 📊 **Gráfico de dona/Pie**: Distribución porcentual por tipo (con colores)
- 📊 **Heatmap**: Distribución por tipo y fecha
- 📊 **Gráfico de barras horizontales**: Top tipos de diagrama
- 📊 **Línea temporal con área apilada**: Evolución con colores por tipo

---

### 8. **hr_get_current_absent_employees** (372 snapshots)

**Estructura de metrics:**

```json
{
  "data": [],
  "detalles": {
    "altas_info": [],
    "bajas_info": [],
    "ausentes_info": []
  }
}
```

**Gráficos posibles:**

- 📊 **Tabla de datos**: Lista de empleados ausentes
- 📊 **Barras**: Cantidad de altas, bajas, ausentes
- 📊 **Gráfico de barras agrupadas**: Comparación altas vs bajas vs ausentes

---

### 9. **hr_get_department_absence_reasons** (372 snapshots)

**Estructura de metrics:**

```json
[]
 // Array vacío en los ejemplos
```

**Gráficos posibles:**

- 📊 **Barras horizontales**: Razones de ausencia por departamento
- 📊 **Gráfico de barras agrupadas**: Razones por departamento
- 📊 **Heatmap**: Razones vs Departamentos

---

### 10. **hr_get_department_absence_summary** (372 snapshots)

**Estructura de metrics:**

```json
[]
 // Array vacío en los ejemplos
```

**Gráficos posibles:**

- 📊 **Barras**: Resumen de ausencias por departamento
- 📊 **Gráfico de barras apiladas**: Desglose por departamento
- 📊 **Gráfico de dona**: Distribución por departamento

---

## 🎯 Recomendaciones de Gráficos para la Tab de Ejemplos

### Gráficos Prioritarios (Más datos disponibles):

1. **Evolución de Uso de Empleados** (get_employee_usage_indicator)

   - Tipo: Línea temporal
   - Datos: 392 snapshots
   - Muestra: Indicador %, empleados usados, empleados operativos

2. **Evolución de Ausentismo** (hr_get_absenteeism_summary)

   - Tipo: Línea temporal + Gauge
   - Datos: 372 snapshots
   - Muestra: Porcentaje de ausentismo, dotación, ausentes

3. **Uso de Vehículos por Tipo** (get_vehicle_usage_indicator)

   - Tipo: Línea temporal múltiple o Heatmap
   - Datos: 110 snapshots
   - Muestra: Uso por tipo y subtipo de vehículo

4. **Distribución de Diagramas de Trabajo** (get_employee_diagram_count_by_day)

   - Tipo: Área apilada o Dona
   - Datos: 98 snapshots
   - Muestra: Empleados por tipo de diagrama (con colores)

5. **Conteos Generales** (get_company_counts_indicator)
   - Tipo: Línea temporal múltiple
   - Datos: 392 snapshots
   - Muestra: Total, vehículos, empleados

---

## 📝 Notas Técnicas

### Estructura de Datos

- Todos los datos están en formato JSONB en el campo `metrics`
- Cada snapshot tiene una fecha (`snapshot_date`)
- Los datos están filtrados por `company_id`
- Algunos sources retornan objetos simples, otros arrays

### Consideraciones

- **Rango de fechas**: 98 días de datos (agosto a diciembre 2025)
- **Frecuencia**: Diaria (un snapshot por día por source)
- **Datos faltantes**: Algunos sources pueden tener arrays vacíos
- **Colores**: `get_employee_diagram_count_by_day` incluye colores en los datos

### Tipos de Gráficos Recomendados por Librería

- **Recharts** (ya está en el proyecto): Ideal para líneas, barras, áreas, donas
- **Chart.js**: Alternativa si se necesita más control
- **Nivo**: Para gráficos más avanzados como treemaps y heatmaps

---

## 🔄 Historial de KPIs (kpi_revisions)

**Estado**: Tabla vacía actualmente

**Cuando haya datos, se pueden hacer:**

- 📊 **Línea temporal**: Evolución del `number` de un KPI específico
- 📊 **Línea temporal**: Evolución de `validity_date`
- 📊 **Gráfico de barras**: Frecuencia de cambios por KPI
- 📊 **Timeline**: Historial de cambios de un KPI
- 📊 **Tabla**: Lista de cambios con razones

---

## 💡 Sugerencias de Implementación

1. **Componente de selección de gráfico**: Dropdown para elegir qué gráfico mostrar
2. **Filtros de fecha**: Rango de fechas para filtrar los datos
3. **Filtros por source**: Permitir seleccionar qué fuente de datos visualizar
4. **Gráficos interactivos**: Tooltips, zoom, pan
5. **Exportar**: Opción para exportar gráficos como imagen
6. **Comparación**: Comparar datos entre períodos o empresas
