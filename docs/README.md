# 📚 Documentación del Proyecto GH Gestión

Documentación organizada del sistema de gestión de recursos humanos.

## 📂 Estructura de la Documentación

### 🏗️ Arquitectura

Documentos sobre la estructura y diseño del sistema.

- **[01-contexto-proyecto.md](./arquitectura/01-contexto-proyecto.md)** - Información general del proyecto, stack tecnológico y objetivos
- **[02-estructura-dashboard.md](./arquitectura/02-estructura-dashboard.md)** - Mapa completo de rutas, tabs y subtabs del dashboard

### 🧪 Testing

Documentación sobre pruebas E2E y estrategias de testing.

- **[01-testing-y-errores.md](./testing/01-testing-y-errores.md)** - Guía completa de testing E2E con Cypress y manejo de errores
- **[02-testing-pendiente.md](./testing/02-testing-pendiente.md)** - Lista de tests pendientes y funcionalidades por testear

#### Cypress E2E

- **[01-guia-cypress.md](./testing/cypress/01-guia-cypress.md)** - Guía de uso de Cypress y configuración inicial
- **[02-plan-migracion.md](./testing/cypress/02-plan-migracion.md)** - Plan de migración y reorganización de tests
- **[03-datos-testing.md](./testing/cypress/03-datos-testing.md)** - Datos de testing predefinidos (usuarios, IDs, etc.)
- **[04-estructura-completa.md](./testing/cypress/04-estructura-completa.md)** - Estructura completa de archivos de test
- **[05-resumen-actualizacion.md](./testing/cypress/05-resumen-actualizacion.md)** - Resumen de actualizaciones recientes
- **[06-estado-archivos.md](./testing/cypress/06-estado-archivos.md)** - Estado actual de implementación de tests

### 💻 Desarrollo

Guías y notas para el desarrollo diario.

- **[01-manejo-errores.md](./desarrollo/01-manejo-errores.md)** - Sistema de manejo de errores (ErrorBoundary, páginas de error)
- **[02-limpieza-filtros.md](./desarrollo/02-limpieza-filtros.md)** - Sistema de limpieza de filtros obsoletos en tablas
- **[03-notas-desarrollo.md](./desarrollo/03-notas-desarrollo.md)** - Notas rápidas y tareas pendientes
- **[04-migracion-tablas-servidor.md](./desarrollo/04-migracion-tablas-servidor.md)** - Guía completa para migrar tablas a server-side con paginación
- **[04-sistema-roles-permisos.md](./desarrollo/04-sistema-roles-permisos.md)** - Sistema completo de roles y permisos (RBAC)

### 🧩 Componentes

Documentación de componentes reutilizables.

- **[01-datatable-reutilizable.md](./componentes/01-datatable-reutilizable.md)** - Sistema de tablas reutilizables con filtros y exportación
- **[02-viewcomponent.md](./componentes/02-viewcomponent.md)** - ViewComponent con tabs y control de acceso por roles

## 🚀 Inicio Rápido

1. **Nuevo en el proyecto?** → Lee [contexto-proyecto.md](./arquitectura/01-contexto-proyecto.md)
2. **Necesitas testear algo?** → Revisa [testing-y-errores.md](./testing/01-testing-y-errores.md)
3. **Buscas una ruta específica?** → Consulta [estructura-dashboard.md](./arquitectura/02-estructura-dashboard.md)
4. **Problemas con filtros?** → Ve a [limpieza-filtros.md](./desarrollo/02-limpieza-filtros.md)

## 📝 Convenciones

- Los archivos están numerados para mantener un orden lógico
- Los nombres son descriptivos y en español
- Cada carpeta agrupa documentos por tema

## 🔗 Enlaces Útiles

- [README Principal](../README.md)
- [Supabase Dashboard](https://supabase.com/dashboard/project/vvrckjjyrwqzpbaatemz)
- [Documentación Técnica](../documentacion/TecnicalDocumentation.md)
