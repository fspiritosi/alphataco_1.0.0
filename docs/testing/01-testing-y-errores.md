# Testing y Manejo de Errores - GH Gestión

Documentación completa de la implementación de testing E2E con Cypress y manejo de errores en la aplicación.

## 📚 Tabla de Contenidos

1. [Resumen](#resumen)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Configuración Inicial](#configuración-inicial)
4. [Manejo de Errores](#manejo-de-errores)
5. [Testing con Cypress](#testing-con-cypress)
6. [Guías de Uso](#guías-de-uso)
7. [CI/CD](#cicd)
8. [Troubleshooting](#troubleshooting)

## 📋 Resumen

Esta implementación incluye:

✅ **Sistema completo de manejo de errores**

- Página de error global (`src/app/error.tsx`)
- Página de error específica del dashboard (`src/app/dashboard/error.tsx`)
- Componente ErrorBoundary reutilizable (`src/components/ErrorBoundary.tsx`)
- Envío de errores por email a soporte
- Copia de errores al portapapeles
- Interfaz amigable para usuarios

✅ **Suite de testing E2E con Cypress**

- Configuración completa de Cypress
- Tests de navegación para todas las páginas del dashboard
- Tests de manejo de errores
- Comandos personalizados
- Fixtures con rutas del dashboard
- Scripts de ejecución

✅ **Documentación completa**

- Estructura del dashboard (DASHBOARD_STRUCTURE.md)
- Guía de manejo de errores (ERROR_HANDLING.md)
- Ejemplos de uso (USAGE_EXAMPLES.md)
- README de Cypress (cypress/README.md)

## 🗂️ Estructura del Proyecto

```
.
├── cypress/
│   ├── e2e/
│   │   ├── dashboard-navigation.cy.ts    # Tests de navegación
│   │   └── error-handling.cy.ts          # Tests de errores
│   ├── fixtures/
│   │   └── dashboard-routes.json         # Rutas a testear
│   ├── support/
│   │   ├── commands.ts                   # Comandos personalizados
│   │   └── e2e.ts                        # Configuración global
│   ├── tsconfig.json                     # Config TypeScript
│   └── README.md                         # Documentación Cypress
│
├── src/
│   ├── app/
│   │   ├── error.tsx                     # Error global
│   │   └── dashboard/
│   │       └── error.tsx                 # Error dashboard
│   └── components/
│       └── ErrorBoundary.tsx             # Error boundary
│
├── scripts/
│   ├── run-tests.sh                      # Script Linux/Mac
│   └── run-tests.ps1                     # Script Windows
│
├── .github/
│   └── workflows/
│       └── cypress-tests.yml.example     # CI/CD ejemplo
│
├── cypress.config.ts                     # Config Cypress
├── cypress.env.json                      # Variables (gitignored)
├── cypress.env.example.json              # Ejemplo de variables
│
└── Documentación/
    ├── DASHBOARD_STRUCTURE.md            # Estructura dashboard
    ├── ERROR_HANDLING.md                 # Guía de errores
    ├── USAGE_EXAMPLES.md                 # Ejemplos de uso
    └── TESTING_AND_ERROR_HANDLING.md     # Este archivo
```

## ⚙️ Configuración Inicial

### 1. Instalar dependencias

Las dependencias ya están instaladas. Cypress está en `devDependencies`.

### 2. Configurar credenciales de prueba

```bash
# Copiar el archivo de ejemplo
cp cypress.env.example.json cypress.env.json

# Editar con tus credenciales
# cypress.env.json
{
  "TEST_EMAIL": "tu-email-de-prueba@example.com",
  "TEST_PASSWORD": "tu-contraseña-de-prueba"
}
```

⚠️ **IMPORTANTE:** `cypress.env.json` está en `.gitignore` y no se subirá al repositorio.

### 3. Iniciar la aplicación

```bash
npm run dev
```

La aplicación debe estar corriendo en `http://localhost:3000`

### 4. Verificar instalación

```bash
# Abrir Cypress
npm run cypress

# O ejecutar tests
npm run test:e2e
```

## 🛡️ Manejo de Errores

### Componentes Disponibles

#### 1. Error Global (`src/app/error.tsx`)

Captura errores en toda la aplicación (fuera del dashboard).

#### 2. Error Dashboard (`src/app/dashboard/error.tsx`)

Captura errores específicos del dashboard con diseño personalizado.

#### 3. ErrorBoundary (`src/components/ErrorBoundary.tsx`)

Componente reutilizable para proteger componentes específicos.

### Uso del ErrorBoundary

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyPage() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

Ver más ejemplos en [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)

### Funcionalidades de Error

Todas las páginas de error incluyen:

- ✅ Mensaje amigable para el usuario
- ✅ Detalles técnicos completos
- ✅ Botón para copiar error al portapapeles
- ✅ Botón para enviar error por email
- ✅ Botón para reintentar
- ✅ Botón para volver al dashboard

### Emails de Soporte

Los errores se envían automáticamente a:

- fspiritosi@codecontrol.com.ar
- yjimenez@codecontrol.com.ar

## 🧪 Testing con Cypress

### Ejecutar Tests

#### Modo Interactivo (Desarrollo)

```bash
# Usando npm
npm run cypress

# Usando scripts
./scripts/run-tests.sh open          # Linux/Mac
.\scripts\run-tests.ps1 open         # Windows
```

#### Modo Headless (CI/CD)

```bash
# Usando npm
npm run test:e2e

# Usando scripts
./scripts/run-tests.sh headless      # Linux/Mac
.\scripts\run-tests.ps1 headless     # Windows
```

### Tests Disponibles

#### 1. dashboard-navigation.cy.ts

Verifica que todas las páginas y tabs del dashboard carguen correctamente.

**Cobertura:**

- 10 rutas principales
- 23 tabs principales
- 31 subtabs
- **Total: 54+ URLs únicas**

#### 2. error-handling.cy.ts

Verifica el manejo de errores en la aplicación.

### Comandos Personalizados

```typescript
// Login
cy.login('email@example.com', 'password');

// Verificar que no hay errores
cy.checkNoErrors();
```

### Resultados

Los resultados se guardan en:

- **Videos:** `cypress/videos/`
- **Screenshots:** `cypress/screenshots/`

## 📖 Guías de Uso

### Para Desarrolladores

1. **Agregar ErrorBoundary a componentes críticos**

   ```tsx
   <ErrorBoundary>
     <CriticalComponent />
   </ErrorBoundary>
   ```

2. **Crear tests para nuevas páginas**

   ```typescript
   it('should load new page', () => {
     cy.visit('/dashboard/new-page');
     cy.checkNoErrors();
   });
   ```

3. **Probar manejo de errores**
   - Lanzar errores intencionales en desarrollo
   - Verificar que se muestren correctamente
   - Verificar funcionalidad de copiar/enviar

### Para QA

1. **Ejecutar suite completa de tests**

   ```bash
   npm run test:e2e
   ```

2. **Revisar resultados**

   - Videos en `cypress/videos/`
   - Screenshots en `cypress/screenshots/`

3. **Reportar errores**
   - Incluir video/screenshot
   - Incluir pasos para reproducir
   - Enviar a equipo de desarrollo

## 🚀 CI/CD

### GitHub Actions

Se incluye un ejemplo de workflow en `.github/workflows/cypress-tests.yml.example`

Para activarlo:

1. Renombrar a `cypress-tests.yml`
2. Configurar secrets en GitHub:
   - `CYPRESS_TEST_EMAIL`
   - `CYPRESS_TEST_PASSWORD`

### Otros CI/CD

El comando básico para CI/CD es:

```bash
npm ci
npm run build
npm start &
npm run test:e2e
```

## 🔍 Troubleshooting

### Tests fallan con "Cannot find user"

**Solución:** Verifica que las credenciales en `cypress.env.json` sean correctas.

### Tests fallan con timeout

**Solución:**

1. Verifica que la aplicación esté corriendo
2. Aumenta los timeouts en `cypress.config.ts`
3. Verifica tu conexión a internet

### Error pages no se muestran

**Solución:**

1. Verifica que los archivos existan en `src/app/`
2. Reinicia el servidor de desarrollo
3. Limpia el cache de Next.js: `rm -rf .next`

### Cypress no se abre

**Solución:**

1. Reinstala Cypress: `npm install cypress --save-dev`
2. Verifica que no haya procesos de Cypress corriendo
3. Ejecuta: `npx cypress verify`

## 📊 Métricas de Testing

### Cobertura Actual

- ✅ 10 páginas principales
- ✅ 54+ URLs únicas testeadas
- ✅ 100% de rutas del dashboard cubiertas
- ✅ Tests de manejo de errores

### Próximas Mejoras

- [ ] Tests de formularios
- [ ] Tests de búsqueda y filtros
- [ ] Tests de permisos por rol
- [ ] Tests de integración con API
- [ ] Tests de performance
- [ ] Cobertura de código

## 📞 Soporte

### Documentación Adicional

- [DASHBOARD_STRUCTURE.md](./DASHBOARD_STRUCTURE.md) - Estructura completa del dashboard
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Guía detallada de manejo de errores
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) - Ejemplos prácticos de uso
- [cypress/README.md](./cypress/README.md) - Documentación específica de Cypress

### Contacto

Para reportar problemas o sugerencias:

- fspiritosi@codecontrol.com.ar
- yjimenez@codecontrol.com.ar

## 🎯 Checklist de Implementación

- [x] Configuración de Cypress
- [x] Tests de navegación del dashboard
- [x] Tests de manejo de errores
- [x] Página de error global
- [x] Página de error del dashboard
- [x] Componente ErrorBoundary
- [x] Comandos personalizados de Cypress
- [x] Scripts de ejecución
- [x] Documentación completa
- [x] Ejemplo de CI/CD
- [x] Fixtures con rutas
- [ ] Integración con CI/CD (pendiente configuración)
- [ ] Tests adicionales por módulo (futuro)

## 📝 Notas de la Implementación

Esta implementación fue creada en la rama `feature/cypress-testing-error-handling` y incluye:

1. **Sistema robusto de manejo de errores** con interfaces amigables
2. **Suite completa de testing E2E** con Cypress
3. **Documentación exhaustiva** para desarrolladores y QA
4. **Scripts de automatización** para facilitar la ejecución
5. **Preparación para CI/CD** con ejemplos de workflows

Todos los componentes están listos para usar y no requieren configuración adicional más allá de las credenciales de prueba.
