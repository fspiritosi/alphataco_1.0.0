# Cypress Testing - GH Gestión

Este directorio contiene las pruebas end-to-end (E2E) para el dashboard de GH Gestión usando Cypress.

## 📋 Estructura

```
cypress/
├── e2e/                          # Tests E2E
│   └── dashboard-navigation.cy.ts # Tests de navegación del dashboard
├── fixtures/                     # Datos de prueba
│   └── dashboard-routes.json    # Rutas del dashboard a testear
├── support/                      # Comandos y configuración
│   ├── commands.ts              # Comandos personalizados
│   └── e2e.ts                   # Configuración global
└── README.md                     # Este archivo
```

## 🚀 Configuración Inicial

### 1. Configurar credenciales de prueba

Edita el archivo `cypress.env.json` en la raíz del proyecto:

```json
{
  "TEST_EMAIL": "tu-email-de-prueba@example.com",
  "TEST_PASSWORD": "tu-contraseña-de-prueba"
}
```

**⚠️ IMPORTANTE:** Este archivo está en `.gitignore` y no se subirá al repositorio.

### 2. Asegúrate de que la aplicación esté corriendo

```bash
npm run dev
```

La aplicación debe estar corriendo en `http://localhost:3000`

## 🧪 Ejecutar Tests

### Modo Interactivo (Recomendado para desarrollo)

```bash
npm run cypress
# o
npm run test:e2e:open
```

Esto abrirá la interfaz de Cypress donde puedes:

- Ver todos los tests disponibles
- Ejecutar tests individuales
- Ver el navegador mientras se ejecutan los tests
- Depurar tests en tiempo real

### Modo Headless (Para CI/CD)

```bash
npm run cypress:headless
# o
npm run test:e2e
```

Esto ejecutará todos los tests en modo headless (sin interfaz gráfica) y generará:

- Videos de las ejecuciones en `cypress/videos/`
- Screenshots de errores en `cypress/screenshots/`

## 📝 Tests Disponibles

### `dashboard-navigation.cy.ts`

Este test verifica que todas las páginas y tabs del dashboard carguen correctamente sin errores.

**Cobertura:**

- ✅ 10 rutas principales del dashboard
- ✅ 23 tabs principales
- ✅ 31 subtabs
- ✅ Total: 54+ URLs únicas

**Qué verifica:**

- La página carga sin errores HTTP
- No hay errores de JavaScript en consola
- El contenido se renderiza correctamente
- No hay error boundaries activados

## 🛠️ Comandos Personalizados

### `cy.login(email, password)`

Inicia sesión en la aplicación. Usa sesiones de Cypress para mantener el estado entre tests.

```typescript
cy.login('test@example.com', 'password123');
```

### `cy.checkNoErrors()`

Verifica que la página no tenga errores visibles o error boundaries activados.

```typescript
cy.visit('/dashboard/employee');
cy.checkNoErrors();
```

## 📊 Resultados

### Videos

Los videos de las ejecuciones se guardan en `cypress/videos/`. Cada test genera un video completo de la ejecución.

### Screenshots

Los screenshots se toman automáticamente:

- Cuando un test falla
- Cuando se llama explícitamente a `cy.screenshot()`
- Para cada página visitada (en el test de navegación)

Los screenshots se guardan en `cypress/screenshots/`.

## 🔧 Configuración Avanzada

### Timeouts

Los timeouts están configurados en `cypress.config.ts`:

```typescript
{
  defaultCommandTimeout: 10000,    // 10 segundos
  requestTimeout: 10000,           // 10 segundos
  responseTimeout: 10000,          // 10 segundos
  pageLoadTimeout: 30000,          // 30 segundos
}
```

### Reintentos

Los tests se reintentarán automáticamente en caso de fallo:

```typescript
retries: {
  runMode: 2,      // 2 reintentos en modo headless
  openMode: 0,     // 0 reintentos en modo interactivo
}
```

## 📚 Recursos

- [Documentación de Cypress](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [API Reference](https://docs.cypress.io/api/table-of-contents)

## 🐛 Troubleshooting

### El test falla con "Cannot find user"

Asegúrate de que las credenciales en `cypress.env.json` sean correctas y que el usuario exista en la base de datos.

### Timeouts frecuentes

Si los tests fallan por timeout:

1. Verifica que la aplicación esté corriendo
2. Aumenta los timeouts en `cypress.config.ts`
3. Verifica tu conexión a internet (si usas APIs externas)

### Screenshots no se generan

Verifica que el directorio `cypress/screenshots/` tenga permisos de escritura.

## 📧 Reportar Problemas

Si encuentras errores durante los tests, puedes:

1. Copiar el error desde la interfaz de Cypress
2. Enviar el error a: fspiritosi@codecontrol.com.ar, yjimenez@codecontrol.com.ar
3. Incluir el video y screenshots si están disponibles
