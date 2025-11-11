# Ejemplos de Uso - Error Handling y Testing

Este documento proporciona ejemplos prácticos de cómo usar los componentes de manejo de errores y ejecutar tests.

## 🛡️ Error Boundary - Ejemplos de Uso

### Ejemplo 1: Proteger un componente de tabla

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataTable } from './DataTable';

export default function EmployeesPage() {
  return (
    <div>
      <h1>Empleados</h1>
      <ErrorBoundary>
        <DataTable />
      </ErrorBoundary>
    </div>
  );
}
```

### Ejemplo 2: Con fallback personalizado

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';

export default function DocumentsPage() {
  return (
    <ErrorBoundary
      fallback={
        <EmptyState
          title="No se pudieron cargar los documentos"
          description="Por favor, intenta recargar la página"
          icon="alert"
        />
      }
    >
      <DocumentsList />
    </ErrorBoundary>
  );
}
```

### Ejemplo 3: Con logging personalizado

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function CriticalComponent() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Enviar a servicio de logging
    console.error('Error crítico:', error);

    // Enviar a analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
      });
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <PaymentForm />
    </ErrorBoundary>
  );
}
```

### Ejemplo 4: Múltiples Error Boundaries

```tsx
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ErrorBoundary fallback={<div>Error en estadísticas</div>}>
        <StatsWidget />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Error en gráfico</div>}>
        <ChartWidget />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Error en tabla</div>}>
        <TableWidget />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Error en actividad</div>}>
        <ActivityWidget />
      </ErrorBoundary>
    </div>
  );
}
```

### Ejemplo 5: Con retry automático

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useState } from 'react';

export default function DataFetchingComponent() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <ErrorBoundary
      key={retryCount} // Cambiar key fuerza remount
      onError={(error) => {
        console.error('Error en fetch:', error);

        // Retry automático después de 3 segundos
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 3000);
        }
      }}
    >
      <DataDisplay />
    </ErrorBoundary>
  );
}
```

## 🧪 Cypress - Ejemplos de Testing

### Ejemplo 1: Test básico de navegación

```typescript
describe('Employee Page', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
  });

  it('should load employee list', () => {
    cy.visit('/dashboard/employee');
    cy.wait(2000);
    cy.checkNoErrors();
    cy.get('table').should('exist');
  });
});
```

### Ejemplo 2: Test de tabs

```typescript
describe('Document Tabs', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
  });

  it('should switch between tabs', () => {
    cy.visit('/dashboard/document');

    // Click on equipment documents tab
    cy.contains('Documentos de equipos').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Click on company documents tab
    cy.contains('Documentos de empresa').click();
    cy.wait(1000);
    cy.checkNoErrors();
  });
});
```

### Ejemplo 3: Test de formulario

```typescript
describe('Employee Form', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
  });

  it('should submit employee form', () => {
    cy.visit('/dashboard/employee/action?action=new');

    // Fill form
    cy.get('input[name="firstname"]').type('Juan');
    cy.get('input[name="lastname"]').type('Pérez');
    cy.get('input[name="email"]').type('juan@example.com');

    // Submit
    cy.get('button[type="submit"]').click();

    // Verify success
    cy.wait(2000);
    cy.checkNoErrors();
  });
});
```

### Ejemplo 4: Test con datos de fixture

```typescript
describe('Bulk Operations', () => {
  let testData;

  before(() => {
    cy.fixture('employees.json').then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    cy.login('test@example.com', 'password');
  });

  it('should process multiple employees', () => {
    testData.employees.forEach((employee) => {
      cy.visit('/dashboard/employee/action?action=new');
      cy.get('input[name="firstname"]').type(employee.firstname);
      cy.get('input[name="lastname"]').type(employee.lastname);
      cy.get('button[type="submit"]').click();
      cy.wait(1000);
    });
  });
});
```

### Ejemplo 5: Test de búsqueda

```typescript
describe('Search Functionality', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
  });

  it('should search employees', () => {
    cy.visit('/dashboard/employee');

    // Type in search box
    cy.get('input[placeholder*="Buscar"]').type('Juan');
    cy.wait(1000);

    // Verify results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('table tbody').should('contain', 'Juan');
  });
});
```

## 🚀 Ejecutar Tests

### Desarrollo Local

```bash
# Abrir Cypress en modo interactivo
npm run cypress

# Ejecutar todos los tests en headless
npm run cypress:headless

# Ejecutar un test específico
npx cypress run --spec "cypress/e2e/dashboard-navigation.cy.ts"

# Ejecutar con un navegador específico
npx cypress run --browser chrome
npx cypress run --browser firefox
npx cypress run --browser edge
```

### CI/CD

```bash
# En tu pipeline de CI/CD
npm ci
npm run build
npm start &
npm run test:e2e
```

## 📊 Interpretar Resultados

### Test Exitoso ✅

```
✓ should load all dashboard routes without errors (45s)
✓ should verify main dashboard loads (2s)
✓ should verify employee page loads (2s)
```

### Test Fallido ❌

```
✗ should load employee page (5s)
  Error: Timed out retrying after 10000ms
  Expected to find element: 'table', but never found it.
```

**Qué hacer:**

1. Revisar el screenshot en `cypress/screenshots/`
2. Revisar el video en `cypress/videos/`
3. Verificar que la aplicación esté corriendo
4. Verificar las credenciales de prueba

## 🔍 Debugging

### Ver el test en tiempo real

```bash
npm run cypress
# Selecciona el test y observa la ejecución
```

### Agregar breakpoints

```typescript
it('should debug this test', () => {
  cy.visit('/dashboard');
  cy.pause(); // Pausa aquí
  cy.get('button').click();
});
```

### Ver logs detallados

```typescript
it('should show detailed logs', () => {
  cy.visit('/dashboard');
  cy.log('Página cargada');

  cy.get('button').then(($btn) => {
    cy.log('Botón encontrado:', $btn.text());
  });
});
```

## 📝 Mejores Prácticas

### ✅ DO

```typescript
// Usar comandos personalizados
cy.login('test@example.com', 'password');

// Esperar a que elementos estén listos
cy.get('button').should('be.visible').click();

// Usar data attributes para testing
cy.get('[data-testid="submit-button"]').click();

// Verificar errores
cy.checkNoErrors();
```

### ❌ DON'T

```typescript
// No usar selectores frágiles
cy.get('.css-123456').click(); // ❌

// No usar waits fijos innecesarios
cy.wait(5000); // ❌ Usar cy.wait() solo cuando sea necesario

// No hardcodear datos sensibles
cy.login('real-email@company.com', 'real-password'); // ❌
```

## 🎯 Próximos Pasos

1. Agregar más tests específicos para cada módulo
2. Implementar tests de integración
3. Agregar tests de performance
4. Configurar reportes de cobertura
5. Integrar con CI/CD pipeline
