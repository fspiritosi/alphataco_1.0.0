# Plan de Migración de Tests E2E

## 🎯 Objetivo

Reorganizar los tests E2E en una estructura modular y escalable que permita:

- Ejecutar tests por página/tab/subtab individualmente
- Mantener tests organizados por funcionalidad
- Facilitar el mantenimiento y escalabilidad

## 📋 Estado Actual

- ✅ `dashboard-navigation.cy.ts` - Test de smoke (se eliminará)
- 🚧 `daily-report-crud.cy.ts` - Test parcial (se reorganizará)

## ⚠️ REGLAS OBLIGATORIAS

### 🎯 Uso de data-testid

**TODOS los tests DEBEN interactuar con elementos usando `data-testid`**

#### Selectores Obligatorios:

- ✅ **CORRECTO**: `cy.get('[data-testid="customer-select-button"]')`
- ✅ **CORRECTO**: `cy.get('[data-testid="main-tab-employees"]')`
- ✅ **CORRECTO**: `cy.get('[data-testid="sub-tab-empleados-activos"]')`
- ❌ **INCORRECTO**: `cy.contains('button', 'Agregar')`
- ❌ **INCORRECTO**: `cy.get('.btn-primary')`
- ❌ **INCORRECTO**: `cy.get('button').first()`

#### Convenciones de Naming:

- **Main tabs**: `data-testid="main-tab-{value}"` (ej: `main-tab-employees`)
- **Sub tabs**: `data-testid="sub-tab-{value}"` (ej: `sub-tab-empleados-activos`)
- **Botones de acción**: `data-testid="{action}-button"` (ej: `create-button`, `edit-button-{id}`)
- **Formularios**: `data-testid="{field}-input"` (ej: `name-input`, `email-input`)
- **Selectores**: `data-testid="{field}-select-button"` (ej: `customer-select-button`)
- **Opciones de select**: `data-testid="{field}-option-{id}"` (ej: `customer-option-123`)

#### Excepciones Permitidas:

- `cy.contains()` SOLO para verificar texto visible (assertions)
- `cy.url()` para verificar navegación
- Selectores de terceros que no podemos modificar

### 📝 Estructura de Tests

Cada archivo de test debe seguir esta estructura:

```typescript
describe('Módulo - Funcionalidad', () => {
  beforeEach(() => {
    cy.login(email, password);
    cy.visit('/ruta/especifica');
  });

  describe('Navigation', () => {
    it('should navigate to the correct tab', () => {
      // Tests de navegación
    });
  });

  describe('READ - View data', () => {
    it('should display existing records', () => {
      // Tests de lectura
    });
  });

  describe('CREATE - Add new record', () => {
    it('should open create modal', () => {
      // Tests de creación
    });
  });

  describe('UPDATE - Edit record', () => {
    it('should update existing record', () => {
      // Tests de actualización
    });
  });

  describe('DELETE - Remove record', () => {
    it('should delete record', () => {
      // Tests de eliminación
    });
  });
});
```

## 🗂️ Nueva Estructura

**Regla:** 1 archivo de test = 1 subtab (o 1 tab si no tiene subtabs)

### Orden de Páginas (según navegación)

#### 1. Dashboard (`/dashboard`)

**Sin tabs**

- [ ] `dashboard/main-dashboard.cy.ts` - Vista principal del dashboard
  - URL: `/dashboard`

---

#### 2. Empresa (`/dashboard/company`)

**Sin tabs - Vista de todas las compañías**

- [ ] `company/all-companies.cy.ts` - Vista de todas las compañías
  - URL: `/dashboard/company`

---

#### 2.1. Empresa Actual (`/dashboard/company/actualCompany`)

**Tab: general** (5 subtabs)

- [ ] `company/general--company.cy.ts` - CRUD información de la empresa

  - Tab: `general` | Subtab: `company`
  - URL: `/dashboard/company/actualCompany?tab=general&subtab=company`
  - data-testid: `main-tab-general`, `sub-tab-company`

- [ ] `company/general--cost-center.cy.ts` - CRUD centro de costos

  - Tab: `general` | Subtab: `cost-center`
  - URL: `/dashboard/company/actualCompany?tab=general&subtab=cost-center`
  - data-testid: `main-tab-general`, `sub-tab-cost-center`

- [ ] `company/general--organigrama.cy.ts` - CRUD organigrama

  - Tab: `general` | Subtab: `organigrama`
  - URL: `/dashboard/company/actualCompany?tab=general&subtab=organigrama`
  - data-testid: `main-tab-general`, `sub-tab-organigrama`

- [ ] `company/general--users.cy.ts` - CRUD usuarios de la empresa

  - Tab: `general` | Subtab: `users`
  - URL: `/dashboard/company/actualCompany?tab=general&subtab=users`
  - data-testid: `main-tab-general`, `sub-tab-users`

- [ ] `company/general--documentacion.cy.ts` - CRUD documentos de la empresa
  - Tab: `general` | Subtab: `"documentacion"`
  - URL: `/dashboard/company/actualCompany?tab=general&subtab="documentacion"`
  - data-testid: `main-tab-general`, `sub-tab-"documentacion"`

**Tab: rrhh** (6 subtabs)

- [ ] `company/rrhh--listado.cy.ts` - CRUD tipos de diagramas

  - Tab: `rrhh` | Subtab: `listado`
  - URL: `/dashboard/company/actualCompany?tab=rrhh&subtab=listado`
  - data-testid: `main-tab-rrhh`, `sub-tab-listado`

- [ ] `company/rrhh--diagrams.cy.ts` - CRUD tipos de novedades

  - Tab: `rrhh` | Subtab: `diagrams`
  - URL: `/dashboard/company/actualCompany?tab=rrhh&subtab=diagrams`
  - data-testid: `main-tab-rrhh`, `sub-tab-diagrams`

- [ ] `company/rrhh--convenios.cy.ts` - CRUD CCT

  - Tab: `rrhh` | Subtab: `convenios`
  - URL: `/dashboard/company/actualCompany?tab=rrhh&subtab=convenios`
  - data-testid: `main-tab-rrhh`, `sub-tab-convenios`

- [ ] `company/rrhh--contract-types.cy.ts` - CRUD tipos de contrato

  - Tab: `rrhh` | Subtab: `contract-types`
  - URL: `/dashboard/company/actualCompany?tab=rrhh&subtab=contract-types`
  - data-testid: `main-tab-rrhh`, `sub-tab-contract-types`

- [ ] `company/rrhh--positions.cy.ts` - CRUD puestos

  - Tab: `rrhh` | Subtab: `positions`
  - URL: `/dashboard/company/actualCompany?tab=rrhh&subtab=positions`
  - data-testid: `main-tab-rrhh`, `sub-tab-positions`

- [ ] `company/rrhh--aptitudes.cy.ts` - CRUD aptitudes técnicas
  - Tab: `rrhh` | Subtab: `aptitudes`
  - URL: `/dashboard/company/actualCompany?tab=rrhh&subtab=aptitudes`
  - data-testid: `main-tab-rrhh`, `sub-tab-aptitudes`

**Tab: vehicles** (5 subtabs)

- [ ] `company/vehicles--tipos.cy.ts` - CRUD tipos de unidad

  - Tab: `vehicles` | Subtab: `tipos`
  - URL: `/dashboard/company/actualCompany?tab=vehicles&subtab=tipos`
  - data-testid: `main-tab-vehicles`, `sub-tab-tipos`

- [ ] `company/vehicles--marcas.cy.ts` - CRUD marcas de equipos

  - Tab: `vehicles` | Subtab: `marcas`
  - URL: `/dashboard/company/actualCompany?tab=vehicles&subtab=marcas`
  - data-testid: `main-tab-vehicles`, `sub-tab-marcas`

- [ ] `company/vehicles--modelos.cy.ts` - CRUD modelos de equipos

  - Tab: `vehicles` | Subtab: `modelos`
  - URL: `/dashboard/company/actualCompany?tab=vehicles&subtab=modelos`
  - data-testid: `main-tab-vehicles`, `sub-tab-modelos`

- [ ] `company/vehicles--subtipos.cy.ts` - CRUD subtipos de equipos

  - Tab: `vehicles` | Subtab: `subtipos`
  - URL: `/dashboard/company/actualCompany?tab=vehicles&subtab=subtipos`
  - data-testid: `main-tab-vehicles`, `sub-tab-subtipos`

- [ ] `company/vehicles--titulares.cy.ts` - CRUD titulares de equipos
  - Tab: `vehicles` | Subtab: `titulares`
  - URL: `/dashboard/company/actualCompany?tab=vehicles&subtab=titulares`
  - data-testid: `main-tab-vehicles`, `sub-tab-titulares`

**Total Empresa: 17 archivos de test (1 + 5 + 6 + 5)**

---

#### 3. Empleados (`/dashboard/employee`)

**Tab: employees** (2 subtabs)

- [ ] `employees/employees--empleados-activos.cy.ts` - CRUD empleados activos
  - Tab: `employees` | Subtab: `Empleados activos`
  - URL: `/dashboard/employee?tab=employees&subtab=Empleados activos`
  - data-testid: `main-tab-employees`, `sub-tab-empleados-activos`
- [ ] `employees/employees--empleados-inactivos.cy.ts` - CRUD empleados inactivos
  - Tab: `employees` | Subtab: `Empleados inactivos`
  - URL: `/dashboard/employee?tab=employees&subtab=Empleados inactivos`
  - data-testid: `main-tab-employees`, `sub-tab-empleados-inactivos`

**Tab: Documentos de empleados** (2 subtabs)

- [ ] `employees/documentos-de-empleados--permanentes.cy.ts` - CRUD documentos permanentes
  - Tab: `Documentos de empleados` | Subtab: `permanentes`
  - URL: `/dashboard/employee?tab=Documentos de empleados&subtab=permanentes`
  - data-testid: `main-tab-documentos-de-empleados`, `sub-tab-permanentes`
- [ ] `employees/documentos-de-empleados--mensuales.cy.ts` - CRUD documentos mensuales
  - Tab: `Documentos de empleados` | Subtab: `mensuales`
  - URL: `/dashboard/employee?tab=Documentos de empleados&subtab=mensuales`
  - data-testid: `main-tab-documentos-de-empleados`, `sub-tab-mensuales`

**Tab: diagrams** (4 subtabs)

- [ ] `employees/diagrams--old.cy.ts` - Diagramas cargados
  - Tab: `diagrams` | Subtab: `old`
  - URL: `/dashboard/employee?tab=diagrams&subtab=old`
  - data-testid: `main-tab-diagrams`, `sub-tab-old`
- [ ] `employees/diagrams--new.cy.ts` - Cargar diagramas
  - Tab: `diagrams` | Subtab: `new`
  - URL: `/dashboard/employee?tab=diagrams&subtab=new`
  - data-testid: `main-tab-diagrams`, `sub-tab-new`
- [ ] `employees/diagrams--massive_diagram.cy.ts` - Carga masiva de diagramas
  - Tab: `diagrams` | Subtab: `massive_diagram`
  - URL: `/dashboard/employee?tab=diagrams&subtab=massive_diagram`
  - data-testid: `main-tab-diagrams`, `sub-tab-massive_diagram`
- [ ] `employees/diagrams--reports.cy.ts` - Reportes de diagramas
  - Tab: `diagrams` | Subtab: `reports`
  - URL: `/dashboard/employee?tab=diagrams&subtab=reports`
  - data-testid: `main-tab-diagrams`, `sub-tab-reports`

**Tab: Tipos de documentos** (sin subtabs)

- [ ] `employees/tipos-de-documentos.cy.ts` - CRUD tipos de documentos
  - Tab: `Tipos de documentos` (sin subtabs)
  - URL: `/dashboard/employee?tab=Tipos de documentos`
  - data-testid: `main-tab-tipos-de-documentos`

**Tab: covenant** (sin subtabs)

- [ ] `employees/covenant.cy.ts` - CRUD CCT
  - Tab: `covenant` (sin subtabs)
  - URL: `/dashboard/employee?tab=covenant`
  - data-testid: `main-tab-covenant`

**Total Empleados: 10 archivos de test**

---

#### 4. Equipos (`/dashboard/equipment`)

**Tab: equipos** (3 subtabs)

- [ ] `equipment/equipos--vehicles.cy.ts` - CRUD vehículos
  - Tab: `equipos` | Subtab: `vehicles`
  - URL: `/dashboard/equipment?tab=equipos&subtab=vehicles`
  - data-testid: `main-tab-equipos`, `sub-tab-vehicles`
- [ ] `equipment/equipos--others.cy.ts` - CRUD otros equipos
  - Tab: `equipos` | Subtab: `others`
  - URL: `/dashboard/equipment?tab=equipos&subtab=others`
  - data-testid: `main-tab-equipos`, `sub-tab-others`
- [ ] `equipment/equipos--inactive.cy.ts` - CRUD equipos dados de baja
  - Tab: `equipos` | Subtab: `inactive`
  - URL: `/dashboard/equipment?tab=equipos&subtab=inactive`
  - data-testid: `main-tab-equipos`, `sub-tab-inactive`

**Tab: Documentos de equipos** (2 subtabs)

- [ ] `equipment/documentos-de-equipos--permanentes.cy.ts` - CRUD documentos permanentes
  - Tab: `Documentos de equipos` | Subtab: `permanentes`
  - URL: `/dashboard/equipment?tab=Documentos de equipos&subtab=permanentes`
  - data-testid: `main-tab-documentos-de-equipos`, `sub-tab-permanentes`
- [ ] `equipment/documentos-de-equipos--mensuales.cy.ts` - CRUD documentos mensuales
  - Tab: `Documentos de equipos` | Subtab: `mensuales`
  - URL: `/dashboard/equipment?tab=Documentos de equipos&subtab=mensuales`
  - data-testid: `main-tab-documentos-de-equipos`, `sub-tab-mensuales`

**Tab: Tipos de documentos** (sin subtabs)

- [ ] `equipment/tipos-de-documentos.cy.ts` - CRUD tipos de documentos
  - Tab: `Tipos de documentos` (sin subtabs)
  - URL: `/dashboard/equipment?tab=Tipos de documentos`
  - data-testid: `main-tab-tipos-de-documentos`

**Tab: type_of_repairs** (4 subtabs)

- [ ] `equipment/type_of_repairs--created_solicitudes.cy.ts` - CRUD solicitudes de mantenimiento
  - Tab: `type_of_repairs` | Subtab: `created_solicitudes`
  - URL: `/dashboard/equipment?tab=type_of_repairs&subtab=created_solicitudes`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-created_solicitudes`
- [ ] `equipment/type_of_repairs--type_of_repair.cy.ts` - CRUD tipos de reparaciones
  - Tab: `type_of_repairs` | Subtab: `type_of_repair`
  - URL: `/dashboard/equipment?tab=type_of_repairs&subtab=type_of_repair`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-type_of_repair`
- [ ] `equipment/type_of_repairs--type_of_repair_new_entry.cy.ts` - Nueva solicitud de mantenimiento
  - Tab: `type_of_repairs` | Subtab: `type_of_repair_new_entry`
  - URL: `/dashboard/equipment?tab=type_of_repairs&subtab=type_of_repair_new_entry`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-type_of_repair_new_entry`
- [ ] `equipment/type_of_repairs--maintenance_groups.cy.ts` - CRUD grupos de mantenimiento
  - Tab: `type_of_repairs` | Subtab: `maintenance_groups`
  - URL: `/dashboard/equipment?tab=type_of_repairs&subtab=maintenance_groups`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-maintenance_groups`

**Total Equipos: 10 archivos de test**

---

#### 5. Comercial (`/dashboard/comercial`)

**Tab: comerce** (7 subtabs)

- [ ] `comercial/comerce--customers.cy.ts` - CRUD de clientes
  - Tab: `comerce` | Subtab: `customers`
  - URL: `/dashboard/comercial?tab=comerce&subtab=customers`
  - data-testid: `main-tab-comerce`, `sub-tab-customers`
- [ ] `comercial/comerce--areas.cy.ts` - CRUD de áreas
  - Tab: `comerce` | Subtab: `areas`
  - URL: `/dashboard/comercial?tab=comerce&subtab=areas`
  - data-testid: `main-tab-comerce`, `sub-tab-areas`
- [ ] `comercial/comerce--equipment.cy.ts` - CRUD de equipos del cliente
  - Tab: `comerce` | Subtab: `equipment`
  - URL: `/dashboard/comercial?tab=comerce&subtab=equipment`
  - data-testid: `main-tab-comerce`, `sub-tab-equipment`
- [ ] `comercial/comerce--sector.cy.ts` - CRUD de sectores
  - Tab: `comerce` | Subtab: `sector`
  - URL: `/dashboard/comercial?tab=comerce&subtab=sector`
  - data-testid: `main-tab-comerce`, `sub-tab-sector`
- [ ] `comercial/comerce--service.cy.ts` - CRUD de contratos/servicios
  - Tab: `comerce` | Subtab: `service`
  - URL: `/dashboard/comercial?tab=comerce&subtab=service`
  - data-testid: `main-tab-comerce`, `sub-tab-service`
- [ ] `comercial/comerce--mensure_units.cy.ts` - CRUD de unidades de medida
  - Tab: `comerce` | Subtab: `mensure_units`
  - URL: `/dashboard/comercial?tab=comerce&subtab=mensure_units`
  - data-testid: `main-tab-comerce`, `sub-tab-mensure_units`
- [ ] `comercial/comerce--daily_reports.cy.ts` - CRUD de partes diarios
  - Tab: `comerce` | Subtab: `daily_reports`
  - URL: `/dashboard/comercial?tab=comerce&subtab=daily_reports`
  - data-testid: `main-tab-comerce`, `sub-tab-daily_reports`

**Total Comercial: 7 archivos de test**

---

#### 6. Documentación (`/dashboard/document`)

**Tab: Documentos de empleados** (2 subtabs)

- [ ] `documents/documentos-de-empleados--permanentes.cy.ts` - Documentos permanentes de empleados
  - Tab: `Documentos de empleados` | Subtab: `permanentes`
  - URL: `/dashboard/document?tab=Documentos de empleados&subtab=permanentes`
  - data-testid: `main-tab-documentos-de-empleados`, `sub-tab-permanentes`
- [ ] `documents/documentos-de-empleados--mensuales.cy.ts` - Documentos mensuales de empleados
  - Tab: `Documentos de empleados` | Subtab: `mensuales`
  - URL: `/dashboard/document?tab=Documentos de empleados&subtab=mensuales`
  - data-testid: `main-tab-documentos-de-empleados`, `sub-tab-mensuales`

**Tab: Documentos de equipos** (2 subtabs)

- [ ] `documents/documentos-de-equipos--permanentes.cy.ts` - Documentos permanentes de equipos
  - Tab: `Documentos de equipos` | Subtab: `permanentes`
  - URL: `/dashboard/document?tab=Documentos de equipos&subtab=permanentes`
  - data-testid: `main-tab-documentos-de-equipos`, `sub-tab-permanentes`
- [ ] `documents/documentos-de-equipos--mensuales.cy.ts` - Documentos mensuales de equipos
  - Tab: `Documentos de equipos` | Subtab: `mensuales`
  - URL: `/dashboard/document?tab=Documentos de equipos&subtab=mensuales`
  - data-testid: `main-tab-documentos-de-equipos`, `sub-tab-mensuales`

**Tab: Documentos de empresa** (2 subtabs)

- [ ] `documents/documentos-de-empresa--permanentes.cy.ts` - Documentos permanentes de empresa
  - Tab: `Documentos de empresa` | Subtab: `permanentes`
  - URL: `/dashboard/document?tab=Documentos de empresa&subtab=permanentes`
  - data-testid: `main-tab-documentos-de-empresa`, `sub-tab-permanentes`
- [ ] `documents/documentos-de-empresa--mensuales.cy.ts` - Documentos mensuales de empresa
  - Tab: `Documentos de empresa` | Subtab: `mensuales`
  - URL: `/dashboard/document?tab=Documentos de empresa&subtab=mensuales`
  - data-testid: `main-tab-documentos-de-empresa`, `sub-tab-mensuales`

**Tab: Tipos de documentos** (sin subtabs)

- [ ] `documents/tipos-de-documentos.cy.ts` - CRUD tipos de documentos
  - Tab: `Tipos de documentos` (sin subtabs)
  - URL: `/dashboard/document?tab=Tipos de documentos`
  - data-testid: `main-tab-tipos-de-documentos`

**Total Documentos: 7 archivos de test**

---

#### 7. Mantenimiento (`/dashboard/maintenance`)

**Tab: type_of_repairs** (4 subtabs)

- [ ] `maintenance/type_of_repairs--created_solicitudes.cy.ts` - CRUD solicitudes de mantenimiento
  - Tab: `type_of_repairs` | Subtab: `created_solicitudes`
  - URL: `/dashboard/maintenance?tab=type_of_repairs&subtab=created_solicitudes`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-created_solicitudes`
- [ ] `maintenance/type_of_repairs--type_of_repair.cy.ts` - CRUD tipos de reparaciones
  - Tab: `type_of_repairs` | Subtab: `type_of_repair`
  - URL: `/dashboard/maintenance?tab=type_of_repairs&subtab=type_of_repair`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-type_of_repair`
- [ ] `maintenance/type_of_repairs--type_of_repair_new_entry.cy.ts` - Nueva solicitud
  - Tab: `type_of_repairs` | Subtab: `type_of_repair_new_entry`
  - URL: `/dashboard/maintenance?tab=type_of_repairs&subtab=type_of_repair_new_entry`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-type_of_repair_new_entry`
- [ ] `maintenance/type_of_repairs--maintenance_groups.cy.ts` - CRUD grupos de mantenimiento
  - Tab: `type_of_repairs` | Subtab: `maintenance_groups`
  - URL: `/dashboard/maintenance?tab=type_of_repairs&subtab=maintenance_groups`
  - data-testid: `main-tab-type_of_repairs`, `sub-tab-maintenance_groups`

**Total Mantenimiento: 4 archivos de test**

---

#### 8. Formularios (`/dashboard/forms`)

**Tab: formularios** (sin subtabs)

- [ ] `forms/formularios.cy.ts` - CRUD tipos de checklist
  - Tab: `formularios` (sin subtabs)
  - URL: `/dashboard/forms?tab=formularios`
  - data-testid: `main-tab-formularios`

**Total Formularios: 1 archivo de test**

---

#### 9. Operaciones (`/dashboard/operations`)

**Tab: Preparte** (sin subtabs)

- [ ] `operations/preparte.cy.ts` - CRUD gestor de pedidos
  - Tab: `Preparte` (sin subtabs)
  - URL: `/dashboard/operations?tab=Preparte`
  - data-testid: `main-tab-preparte`

**Tab: dailyReportsTable** (sin subtabs)

- [ ] `operations/dailyreportstable.cy.ts` - CRUD tabla de partes diarios
  - Tab: `dailyReportsTable` (sin subtabs)
  - URL: `/dashboard/operations?tab=dailyReportsTable`
  - data-testid: `main-tab-dailyreportstable`

**Total Operaciones: 2 archivos de test**

---

#### 10. Ayuda (`/dashboard/help`)

**Sin tabs**

- [ ] `help/help-page.cy.ts` - Página de ayuda (sin CRUD)
  - URL: `/dashboard/help`

**Total Ayuda: 1 archivo de test**

---

## 📊 Resumen Total

- **Dashboard**: 1 test
- **Empresa**: 17 tests (1 vista general + 16 subtabs)
  - All Companies: 1 test
  - General: 5 tests
  - RRHH: 6 tests
  - Vehicles: 5 tests
- **Empleados**: 10 tests
- **Equipos**: 10 tests
- **Comercial**: 7 tests
- **Documentos**: 7 tests
- **Mantenimiento**: 4 tests
- **Formularios**: 1 test
- **Operaciones**: 2 tests
- **Ayuda**: 1 test

**TOTAL: 60 archivos de test**

## 🔧 Comandos para Ejecutar Tests

### Ejecutar todos los tests

```bash
npm run test:e2e
```

### Ejecutar tests de una página específica

```bash
# Dashboard
npx cypress run --spec "cypress/e2e/dashboard/**/*.cy.ts"

# Empresa
npx cypress run --spec "cypress/e2e/company/**/*.cy.ts"

# Empleados
npx cypress run --spec "cypress/e2e/employees/**/*.cy.ts"

# Equipos
npx cypress run --spec "cypress/e2e/equipment/**/*.cy.ts"

# Comercial
npx cypress run --spec "cypress/e2e/comercial/**/*.cy.ts"

# Documentación
npx cypress run --spec "cypress/e2e/documents/**/*.cy.ts"

# Mantenimiento
npx cypress run --spec "cypress/e2e/maintenance/**/*.cy.ts"

# Formularios
npx cypress run --spec "cypress/e2e/forms/**/*.cy.ts"

# Operaciones
npx cypress run --spec "cypress/e2e/operations/**/*.cy.ts"

# Ayuda
npx cypress run --spec "cypress/e2e/help/**/*.cy.ts"
```

### Ejecutar un test específico (tab/subtab)

```bash
# Ejemplo: Test de empleados activos
npx cypress run --spec "cypress/e2e/employees/active-employees.cy.ts"

# Ejemplo: Test de clientes
npx cypress run --spec "cypress/e2e/comercial/customers.cy.ts"

# Ejemplo: Test de vehículos
npx cypress run --spec "cypress/e2e/equipment/vehicles.cy.ts"
```

### Modo interactivo (desarrollo) - RECOMENDADO

```bash
npm run cypress
# Luego selecciona el test que quieres ejecutar desde la UI
```

## 📦 Componentes Reutilizables

### Page Objects

Clases que encapsulan la lógica de interacción con cada página:

- `CustomersPage.ts` - Métodos para interactuar con la página de clientes
- `EmployeesPage.ts` - Métodos para interactuar con la página de empleados
- etc.

### Comandos Personalizados

- `cy.login()` - Login
- `cy.navigateToTab()` - Navegar a un tab específico
- `cy.openCreateModal()` - Abrir modal de creación
- `cy.fillForm()` - Llenar formulario
- `cy.submitForm()` - Enviar formulario
- `cy.deleteRecord()` - Eliminar registro
- `cy.verifyToast()` - Verificar mensaje toast

### Helpers

- `generateTestData()` - Generar datos de prueba
- `getTestId()` - Obtener data-testid
- `waitForTableLoad()` - Esperar carga de tabla

## 🚀 Metodología de Implementación

### 📋 Flujo de Trabajo por Test

**El usuario indicará archivo por archivo qué validaciones y acciones hacer. El proceso será:**

1. **Usuario especifica el test a implementar**

   - Indica el archivo (ej: `comercial/comerce--customers.cy.ts`)
   - Lista las acciones CRUD a validar (Create, Read, Update, Delete)
   - Especifica validaciones particulares (campos requeridos, mensajes de error, etc.)

2. **Kiro analiza los componentes**

   - Navega a la tab/subtab correspondiente
   - Identifica todos los componentes interactivos (botones, inputs, selects, etc.)
   - Revisa la estructura del formulario y tabla

3. **Kiro agrega data-testid necesarios**

   - Agrega `data-testid` a TODOS los elementos que se necesiten interactuar
   - Sigue las convenciones establecidas
   - Documenta los data-testid agregados

4. **Kiro verifica/agrega datos de testing (si es necesario)**

   - Revisa si existen datos de testing en `supabase/seed-testing.sql`
   - Si faltan datos, pregunta al usuario si desea agregarlos
   - Usa MCP de Supabase para verificar estructura de tablas
   - Agrega datos con IDs predecibles y año 2030
   - Documenta los IDs en el test

5. **Kiro implementa el test**

   - Crea el archivo de test siguiendo la estructura estándar
   - Implementa todas las validaciones solicitadas
   - Usa SOLO data-testid para selectores
   - Incluye comentarios explicativos

6. **Validación**
   - Ejecuta el test para verificar que funciona
   - Ajusta según sea necesario
   - Documenta cualquier issue encontrado

### ⚠️ REGLAS CRÍTICAS

1. **NO implementar tests sin instrucciones del usuario**
2. **NO asumir validaciones - esperar especificaciones del usuario**
3. **SIEMPRE agregar data-testid antes de escribir el test**
4. **SIEMPRE usar data-testid para selectores (nunca clases, IDs, o texto)**
5. **SIEMPRE seguir la estructura estándar de tests**
6. **SIEMPRE documentar los data-testid agregados**
7. **PREGUNTAR al usuario antes de agregar datos de testing a la BD**

---

## 🗄️ Gestión de Datos de Testing

### Archivo de Datos

**Ubicación:** `supabase/seed-testing.sql`

Este archivo contiene todos los datos de testing para E2E tests.

### Convenciones de Datos de Testing

**IDs Predecibles:**

- Usar UUIDs fijos con patrones reconocibles
- Ejemplo: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`

**Fechas:**

- Usar año 2030 para evitar conflictos con datos reales
- Ejemplo: `2030-01-15T10:00:00+00:00`

**Nombres:**

- Prefijos claros: "Testing E2E", "Test CRUD", "Cliente Testing"
- Ejemplo: `Cliente Testing E2E`, `Empleado Test CRUD`

**Company ID:**

- Usar: `be4119b0-12ca-4a8f-87ed-209239194dab` (GRUPO HORIZONTE SRL)

**Usuario de Testing:**

- Email: `testing@e2e.com`
- Password: `Testing123!`
- ID: `99999999-9999-9999-9999-999999999999`

### Proceso para Agregar Datos

1. **Identificar necesidad:**

   - Durante el análisis del test, identificar qué datos se necesitan
   - Verificar si ya existen en `seed-testing.sql`

2. **Consultar al usuario:**

   ```
   ¿Deseas que agregue datos de testing para [entidad]?

   Datos a agregar:
   - [Descripción de los datos]
   - IDs: [IDs que se usarán]
   ```

3. **Usar MCP si es necesario:**

   - `mcp_supabase_local_list_tables` - Ver tablas disponibles
   - `mcp_supabase_local_execute_sql` - Verificar estructura o datos existentes

4. **Agregar al archivo:**

   - Editar `supabase/seed-testing.sql`
   - Usar `ON CONFLICT (id) DO NOTHING` para evitar duplicados
   - Documentar con comentarios

5. **Documentar en el test:**
   ```typescript
   /**
    * IDs de testing usados:
    * - Cliente: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
    * - Servicio: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
    */
   ```

### Ejemplo de Datos de Testing

```sql
-- ============================================
-- CLIENTE DE TESTING PARA CRUD
-- ============================================
INSERT INTO customers (
    id,
    name,
    cuit,
    address,
    company_id,
    is_active,
    created_at
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Cliente Testing CRUD E2E',
    20333444555,
    'Av. Testing 999',
    'be4119b0-12ca-4a8f-87ed-209239194dab',
    true,
    '2030-01-15T10:00:00+00:00'
) ON CONFLICT (id) DO NOTHING;
```

### Datos Existentes

Ver `supabase/seed-testing.sql` para lista completa de datos disponibles:

- Usuario de testing: `testing@e2e.com`
- Cliente de testing: `22222222-2222-2222-2222-222222222222`
- Servicio de testing: `33333333-3333-3333-3333-333333333333`
- Item de testing: `44444444-4444-4444-4444-444444444444`
- Empleado de testing: `55555555-5555-5555-5555-555555555555`
- Equipo de testing: `66666666-6666-6666-6666-666666666666`
- Daily report de testing: `11111111-1111-1111-1111-111111111111`

---

## 🚀 Orden de Implementación

### Fase 1: Infraestructura (Semana 1)

1. ✅ Crear estructura de carpetas siguiendo el orden de navegación
2. ✅ Implementar page objects base
3. ✅ Crear comandos personalizados (navigation, crud, assertions)
4. ✅ Configurar helpers y utilidades
5. ✅ Documentar convenciones de data-testid
6. ✅ Crear template base para nuevos tests
7. ✅ Crear reglas de steering para el flujo de trabajo

### Fase 2: Tests Críticos - Módulos Base (Semana 2-3)

**Prioridad ALTA - Funcionalidades más usadas (5 tests)**

1. `comercial/comerce--customers.cy.ts` - CRUD de clientes
2. `comercial/comerce--service.cy.ts` - CRUD de contratos/servicios
3. `employees/employees--empleados-activos.cy.ts` - CRUD empleados activos
4. `equipment/equipos--vehicles.cy.ts` - CRUD vehículos
5. `operations/dailyreportstable.cy.ts` - CRUD tabla de partes diarios

### Fase 3: Tests Secundarios - Completar Módulos Principales (Semana 4-5)

**Prioridad MEDIA (14 tests)**

**Comercial (5 tests):**

- `comercial/comerce--areas.cy.ts`
- `comercial/comerce--equipment.cy.ts`
- `comercial/comerce--sector.cy.ts`
- `comercial/comerce--mensure_units.cy.ts`
- `comercial/comerce--daily_reports.cy.ts`

**Empleados (3 tests):**

- `employees/employees--empleados-inactivos.cy.ts`
- `employees/documentos-de-empleados--permanentes.cy.ts`
- `employees/documentos-de-empleados--mensuales.cy.ts`

**Equipos (5 tests):**

- `equipment/equipos--others.cy.ts`
- `equipment/equipos--inactive.cy.ts`
- `equipment/documentos-de-equipos--permanentes.cy.ts`
- `equipment/documentos-de-equipos--mensuales.cy.ts`
- `equipment/tipos-de-documentos.cy.ts`

**Operaciones (1 test):**

- `operations/preparte.cy.ts`

### Fase 4: Tests de Diagramas y Mantenimiento (Semana 6)

**Prioridad MEDIA-BAJA (12 tests)**

**Empleados - Diagramas (4 tests):**

- `employees/diagrams--old.cy.ts`
- `employees/diagrams--new.cy.ts`
- `employees/diagrams--massive_diagram.cy.ts`
- `employees/diagrams--reports.cy.ts`

**Equipos - Mantenimiento (4 tests):**

- `equipment/type_of_repairs--created_solicitudes.cy.ts`
- `equipment/type_of_repairs--type_of_repair.cy.ts`
- `equipment/type_of_repairs--type_of_repair_new_entry.cy.ts`
- `equipment/type_of_repairs--maintenance_groups.cy.ts`

**Mantenimiento (4 tests):**

- `maintenance/type_of_repairs--created_solicitudes.cy.ts`
- `maintenance/type_of_repairs--type_of_repair.cy.ts`
- `maintenance/type_of_repairs--type_of_repair_new_entry.cy.ts`
- `maintenance/type_of_repairs--maintenance_groups.cy.ts`

### Fase 5: Tests de Documentación y Complementarios (Semana 7)

**Prioridad BAJA (13 tests)**

**Documentación (7 tests):**

- `documents/documentos-de-empleados--permanentes.cy.ts`
- `documents/documentos-de-empleados--mensuales.cy.ts`
- `documents/documentos-de-equipos--permanentes.cy.ts`
- `documents/documentos-de-equipos--mensuales.cy.ts`
- `documents/documentos-de-empresa--permanentes.cy.ts`
- `documents/documentos-de-empresa--mensuales.cy.ts`
- `documents/tipos-de-documentos.cy.ts`

**Empresa - General (5 tests):**

- `company/general--company.cy.ts`
- `company/general--cost-center.cy.ts`
- `company/general--organigrama.cy.ts`
- `company/general--users.cy.ts`
- `company/general--documentacion.cy.ts`

**Empresa - RRHH (6 tests):**

- `company/rrhh--listado.cy.ts`
- `company/rrhh--diagrams.cy.ts`
- `company/rrhh--convenios.cy.ts`
- `company/rrhh--contract-types.cy.ts`
- `company/rrhh--positions.cy.ts`
- `company/rrhh--aptitudes.cy.ts`

**Empresa - Vehicles (5 tests):**

- `company/vehicles--tipos.cy.ts`
- `company/vehicles--marcas.cy.ts`
- `company/vehicles--modelos.cy.ts`
- `company/vehicles--subtipos.cy.ts`
- `company/vehicles--titulares.cy.ts`

**Otros (4 tests):**

- `forms/formularios.cy.ts`
- `employees/tipos-de-documentos.cy.ts`
- `employees/covenant.cy.ts`
- `company/all-companies.cy.ts`
- `dashboard/main-dashboard.cy.ts`
- `help/help-page.cy.ts`

### Fase 6: Limpieza y Optimización (Semana 8)

1. Eliminar `dashboard-navigation.cy.ts`
2. Eliminar `daily-report-crud.cy.ts` (mover lógica a los nuevos tests)
3. Revisar y optimizar todos los tests
4. Eliminar código duplicado
5. Verificar que todos usen data-testid correctamente
6. Documentación final y guías de contribución
7. Configurar CI/CD para tests automáticos
8. Crear scripts npm para ejecutar tests por módulo

## 📊 Métricas de Éxito

- ✅ Todos los CRUDs principales tienen tests
- ✅ Tests se pueden ejecutar individualmente por página/tab/subtab
- ✅ 100% de interacciones usan data-testid
- ✅ Tiempo de ejecución < 5 min por módulo
- ✅ Cobertura > 80% de funcionalidades críticas
- ✅ 0 tests flaky (inestables)
- ✅ Todos los tests siguen la estructura estándar (Navigation, READ, CREATE, UPDATE, DELETE)

## 🔄 Mantenimiento

### Reglas de Mantenimiento:

1. **Siempre usar data-testid** para nuevos elementos interactivos
2. **Actualizar tests** cuando cambie la funcionalidad
3. **Agregar tests** para nuevas features antes de merge
4. **Revisar tests fallidos** semanalmente
5. **Actualizar datos de testing** mensualmente en `supabase/seed-testing.sql`
6. **Mantener page objects** actualizados con cambios en la UI

### Checklist para Nuevos Tests:

- [ ] Usa data-testid para todos los selectores
- [ ] Sigue la estructura estándar (describe blocks)
- [ ] Incluye beforeEach con login y navegación
- [ ] Prueba CRUD completo (Create, Read, Update, Delete)
- [ ] Verifica mensajes de éxito/error
- [ ] Incluye casos de validación de formularios
- [ ] Documenta IDs de testing usados
- [ ] Ejecuta el test individualmente antes de commit

### Convenciones de Commits:

```
test(comercial): add customers CRUD tests
test(employees): add active employees tests
test(equipment): update vehicles test with new fields
fix(test): fix flaky test in daily-reports
```
