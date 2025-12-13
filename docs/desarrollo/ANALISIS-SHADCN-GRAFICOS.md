# Análisis de Componentes de Gráficos Shadcn para KPIs

## 📦 Componente Base: `chart`

**Dependencias:**

- `recharts@2.15.4` (librería de gráficos)
- `lucide-react` (iconos)

**Ubicación:** `@shadcn/chart` (componente UI base)

---

## 🎯 Tipos de Gráficos Disponibles

### 1. **Líneas (Line Charts)** - ✅ IDEAL para series temporales

**Variantes disponibles:**

- `chart-line-default` - Línea básica
- `chart-line-dots` - Línea con puntos
- `chart-line-multiple` - Múltiples líneas
- `chart-line-linear` - Línea lineal
- `chart-line-step` - Línea escalonada
- `chart-line-label` - Con etiquetas
- `chart-line-interactive` - Interactivo con selección

**Componentes Recharts usados:**

- `LineChart`, `Line`, `XAxis`, `CartesianGrid`, `ChartTooltip`

**Perfecto para nuestros datos:**

- ✅ `get_employee_usage_indicator` - Evolución del indicador
- ✅ `hr_get_absenteeism_summary` - Evolución del ausentismo
- ✅ `hr_get_absenteeism_trend` - Tendencia de ausentismo
- ✅ `hr_get_daily_absence_timeseries` - Series temporales de ausencias
- ✅ `get_company_counts_indicator` - Evolución de conteos

**Ejemplo de uso:**

```tsx
<LineChart data={chartData}>
  <Line dataKey="indicator" stroke="var(--color-indicator)" />
  <Line dataKey="employees_used" stroke="var(--color-used)" />
</LineChart>
```

---

### 2. **Áreas (Area Charts)** - ✅ IDEAL para datos apilados

**Variantes disponibles:**

- `chart-area-default` - Área básica
- `chart-area-stacked` - Área apilada
- `chart-area-linear` - Área lineal
- `chart-area-step` - Área escalonada
- `chart-area-legend` - Con leyenda
- `chart-area-icons` - Con iconos
- `chart-area-gradient` - Con gradiente
- `chart-area-interactive` - Interactivo

**Componentes Recharts usados:**

- `AreaChart`, `Area`, `XAxis`, `CartesianGrid`, `ChartTooltip`

**Perfecto para nuestros datos:**

- ✅ `get_employee_diagram_count_by_day` - Distribución de diagramas (apilado)
- ✅ `hr_get_daily_absence_timeseries` - Desglose de ausentes
- ✅ `get_company_counts_indicator` - Vehículos vs Empleados
- ✅ `get_vehicle_usage_indicator` - Uso por tipo (apilado)

**Ejemplo de uso:**

```tsx
<AreaChart data={chartData}>
  <Area dataKey="franco" stackId="a" fill="var(--color-franco)" />
  <Area dataKey="trabajando" stackId="a" fill="var(--color-trabajando)" />
</AreaChart>
```

---

### 3. **Barras (Bar Charts)** - ✅ IDEAL para comparaciones

**Variantes disponibles:**

- `chart-bar-default` - Barras básicas
- `chart-bar-stacked` - Barras apiladas
- `chart-bar-mixed` - Barras mixtas
- `chart-bar-active` - Con selección activa
- `chart-bar-label` - Con etiquetas
- `chart-bar-interactive` - Interactivo
- `chart-bar-negative` - Con valores negativos

**Componentes Recharts usados:**

- `BarChart`, `Bar`, `XAxis`, `CartesianGrid`, `ChartTooltip`

**Perfecto para nuestros datos:**

- ✅ `get_vehicle_usage_indicator` - Comparar tipos de vehículos
- ✅ `hr_get_absenteeism_summary` - Comparar altas vs bajas
- ✅ `get_company_counts_indicator` - Comparar vehículos vs empleados
- ✅ `hr_get_department_absence_summary` - Por departamento

**Ejemplo de uso:**

```tsx
<BarChart data={chartData}>
  <Bar dataKey="used_units" fill="var(--color-used)" />
  <Bar dataKey="available_units" fill="var(--color-available)" />
</BarChart>
```

---

### 4. **Pie/Donut Charts** - ✅ IDEAL para distribuciones

**Variantes disponibles:**

- `chart-pie-simple` - Pie básico
- `chart-pie-donut` - Donut (anillo)
- `chart-pie-legend` - Con leyenda
- `chart-pie-label` - Con etiquetas
- `chart-pie-stacked` - Apilado
- `chart-pie-interactive` - Interactivo
- `chart-pie-donut-text` - Donut con texto central

**Componentes Recharts usados:**

- `PieChart`, `Pie`, `ChartTooltip`, `ChartLegend`

**Perfecto para nuestros datos:**

- ✅ `get_employee_diagram_count_by_day` - Distribución por tipo de diagrama (con colores incluidos)
- ✅ `get_vehicle_usage_indicator` - Distribución por tipo de vehículo
- ✅ `get_company_counts_indicator` - Proporción vehículos vs empleados

**Ejemplo de uso:**

```tsx
<PieChart>
  <Pie
    data={diagramData}
    dataKey="cantidad_empleados"
    nameKey="diagram_type_name"
    fill={(entry) => entry.diagram_type_color} // Usar colores de los datos
  />
</PieChart>
```

---

### 5. **Radar Charts** - ⚠️ Menos común para nuestros datos

**Variantes disponibles:**

- `chart-radar-default` - Radar básico
- `chart-radar-dots` - Con puntos
- `chart-radar-icons` - Con iconos
- `chart-radar-legend` - Con leyenda

**Componentes Recharts usados:**

- `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`

**Posible uso:**

- ⚠️ Comparar múltiples métricas de un KPI (si tenemos varios indicadores)

---

## 🎨 Componentes Auxiliares

### `ChartContainer`

- Contenedor principal que envuelve todos los gráficos
- Maneja la configuración de colores y estilos
- Requiere un `config` de tipo `ChartConfig`

### `ChartTooltip` y `ChartTooltipContent`

- Tooltips interactivos
- Variantes: `hideLabel`, `hideIndicator`, `indicator="line"`, `indicator="dot"`

### `ChartLegend` y `ChartLegendContent`

- Leyendas para identificar series
- Personalizable con `nameKey`

### `ChartConfig`

- Configuración de colores y etiquetas
- Usa variables CSS: `var(--chart-1)`, `var(--chart-2)`, etc.

---

## 📊 Mapeo: Nuestros Datos → Gráficos Shadcn

### 1. **get_employee_usage_indicator** (392 snapshots)

**Datos:** `{ indicator: 49.7, employees_used: 163, employees_operativos: 328 }`

**Gráficos recomendados:**

1. **Línea múltiple** (`chart-line-multiple`)

   - Línea 1: `indicator` (porcentaje)
   - Línea 2: `employees_used`
   - Línea 3: `employees_operativos`

2. **Área apilada** (`chart-area-stacked`)

   - Área 1: `employees_used`
   - Área 2: `employees_operativos - employees_used` (disponibles)

3. **Gauge/Métrica** (no disponible en shadcn, usar componente custom)

---

### 2. **get_vehicle_usage_indicator** (110 snapshots)

**Datos:** Array de objetos con `type_name`, `subtype_name`, `used_units`, `available_units`, `usage_indicator`

**Gráficos recomendados:**

1. **Barras apiladas** (`chart-bar-stacked`)

   - Por tipo/subtipo: `used_units` vs `available_units`

2. **Línea múltiple** (`chart-line-multiple`)

   - Evolución de `usage_indicator` por tipo

3. **Pie/Donut** (`chart-pie-donut`)

   - Distribución de uso por tipo

4. **Barras horizontales** (custom con `BarChart` horizontal)
   - Top 10 tipos con mayor uso

---

### 3. **hr_get_absenteeism_summary** (372 snapshots)

**Datos:** `{ altas, bajas, totalAusentes, dotacionActual, dotacionAnterior, porcentajeAusentismo }`

**Gráficos recomendados:**

1. **Línea temporal** (`chart-line-default`)

   - Evolución de `porcentajeAusentismo`

2. **Línea múltiple** (`chart-line-multiple`)

   - `altas`, `bajas`, `totalAusentes`, `dotacionActual`

3. **Área apilada** (`chart-area-stacked`)

   - `dotacionActual` vs `totalAusentes`

4. **Barras comparativas** (`chart-bar-default`)
   - `dotacionActual` vs `dotacionAnterior`

---

### 4. **get_employee_diagram_count_by_day** (98 snapshots)

**Datos:** Array con `{ diagram_type_name, cantidad_empleados, diagram_type_color }`

**Gráficos recomendados:**

1. **Pie/Donut** (`chart-pie-donut` o `chart-pie-legend`) ⭐ **MEJOR OPCIÓN**

   - Usar `diagram_type_color` directamente de los datos
   - `dataKey="cantidad_empleados"`, `nameKey="diagram_type_name"`

2. **Área apilada** (`chart-area-stacked`)

   - Evolución temporal con colores por tipo

3. **Barras apiladas** (`chart-bar-stacked`)
   - Por fecha, apilado por tipo

---

### 5. **get_company_counts_indicator** (392 snapshots)

**Datos:** `{ total_count, vehicle_count, employee_count }`

**Gráficos recomendados:**

1. **Línea múltiple** (`chart-line-multiple`)

   - `total_count`, `vehicle_count`, `employee_count`

2. **Área apilada** (`chart-area-stacked`)

   - `vehicle_count` + `employee_count` = `total_count`

3. **Pie/Donut** (`chart-pie-donut`)
   - Proporción `vehicle_count` vs `employee_count`

---

## 🚀 Implementación Recomendada

### Prioridad 1: Gráficos más útiles

1. **Línea múltiple** - Para evolución temporal

   ```tsx
   import { LineChart, Line } from 'recharts';
   import { ChartContainer, ChartConfig } from '@/components/ui/chart';
   ```

2. **Área apilada** - Para distribuciones

   ```tsx
   import { AreaChart, Area } from 'recharts';
   ```

3. **Pie/Donut** - Para diagramas de trabajo

   ```tsx
   import { PieChart, Pie } from 'recharts';
   ```

4. **Barras apiladas** - Para comparaciones
   ```tsx
   import { BarChart, Bar } from 'recharts';
   ```

### Prioridad 2: Características adicionales

- **Tooltips interactivos** - Ya incluidos en todos los componentes
- **Leyendas** - Para gráficos con múltiples series
- **Interactividad** - Selección de rangos de fechas
- **Responsive** - Los componentes ya son responsive

---

## 📝 Notas de Implementación

### 1. Instalación del componente base

```bash
npx shadcn@latest add chart
```

### 2. Estructura de datos

Todos los gráficos esperan un array de objetos:

```typescript
const chartData = [
  { date: '2025-08-27', indicator: 49.7, employees_used: 163 },
  { date: '2025-08-28', indicator: 50.2, employees_used: 165 },
  // ...
];
```

### 3. Configuración de colores

```typescript
const chartConfig = {
  indicator: {
    label: 'Indicador',
    color: 'var(--chart-1)',
  },
  employees_used: {
    label: 'Empleados Usados',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;
```

### 4. Formateo de fechas

```tsx
<XAxis
  dataKey="snapshot_date"
  tickFormatter={(value) => {
    return new Date(value).toLocaleDateString('es-AR', {
      month: 'short',
      day: 'numeric',
    });
  }}
/>
```

---

## ✅ Resumen de Recomendaciones

| Fuente de Datos                     | Gráfico Principal | Gráfico Secundario  | Prioridad |
| ----------------------------------- | ----------------- | ------------------- | --------- |
| `get_employee_usage_indicator`      | Línea múltiple    | Área apilada        | ⭐⭐⭐    |
| `get_vehicle_usage_indicator`       | Barras apiladas   | Línea múltiple      | ⭐⭐⭐    |
| `hr_get_absenteeism_summary`        | Línea temporal    | Barras comparativas | ⭐⭐⭐    |
| `get_employee_diagram_count_by_day` | **Pie/Donut**     | Área apilada        | ⭐⭐⭐    |
| `get_company_counts_indicator`      | Línea múltiple    | Pie/Donut           | ⭐⭐      |
| `hr_get_daily_absence_timeseries`   | Área apilada      | Línea múltiple      | ⭐⭐      |
| `hr_get_absenteeism_trend`          | Línea simple      | -                   | ⭐        |

---

## 🎯 Próximos Pasos

1. **Instalar componente chart:**

   ```bash
   npx shadcn@latest add chart
   ```

2. **Crear componentes de gráficos específicos:**

   - `EmployeeUsageChart.tsx` - Línea múltiple
   - `VehicleUsageChart.tsx` - Barras apiladas
   - `AbsenteeismChart.tsx` - Línea temporal
   - `DiagramDistributionChart.tsx` - Pie/Donut ⭐
   - `CompanyCountsChart.tsx` - Línea múltiple

3. **Integrar en `GraficosTabContent.tsx`**

4. **Agregar filtros de fecha** (usando `calendar` de shadcn)

5. **Agregar selectores de source** (usando `select` de shadcn)
