# Manejo de Errores - GH Gestión

Este documento describe la implementación del sistema de manejo de errores en la aplicación.

## 📋 Componentes de Manejo de Errores

### 1. Página de Error Global (`src/app/error.tsx`)

Captura errores a nivel de aplicación (fuera del dashboard).

**Características:**

- ✅ Muestra mensaje de error amigable
- ✅ Muestra detalles técnicos completos
- ✅ Permite copiar el error al portapapeles
- ✅ Permite enviar el error por email
- ✅ Botón para reintentar
- ✅ Botón para volver al dashboard

**Uso:**
Next.js automáticamente usa este componente cuando hay un error en cualquier página.

### 2. Página de Error del Dashboard (`src/app/dashboard/error.tsx`)

Captura errores específicos del dashboard con un diseño personalizado.

**Características:**

- ✅ Diseño específico para el dashboard (colores naranja)
- ✅ Información técnica detallada
- ✅ Copia de error al portapapeles
- ✅ Envío de error por email a soporte
- ✅ Botones de acción (reintentar, volver al inicio)
- ✅ Guía de ayuda para el usuario

**Uso:**
Next.js automáticamente usa este componente cuando hay un error en cualquier página dentro de `/dashboard`.

### 3. Error Boundary Component (`src/components/ErrorBoundary.tsx`)

Componente reutilizable para capturar errores en componentes específicos.

**Características:**

- ✅ Captura errores en componentes hijos
- ✅ Permite fallback personalizado
- ✅ Callback personalizado para logging
- ✅ Interfaz compacta para errores de componentes
- ✅ Copia y envío de errores

**Uso:**

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyPage() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log personalizado
        console.error('Error en componente:', error);
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**Con fallback personalizado:**

```tsx
<ErrorBoundary
  fallback={
    <div>
      <h2>Este componente no está disponible</h2>
      <p>Por favor, intenta más tarde</p>
    </div>
  }
>
  <MyComponent />
</ErrorBoundary>
```

## 📧 Envío de Errores por Email

Todos los componentes de error incluyen la funcionalidad de enviar errores por email a:

- fspiritosi@codecontrol.com.ar
- yjimenez@codecontrol.com.ar

### Información incluida en el email:

```
Error Message: [Mensaje del error]
Error Digest: [ID único del error]
Timestamp: [Fecha y hora]
URL: [URL donde ocurrió el error]
User Agent: [Navegador y sistema operativo]
Stack Trace: [Traza completa del error]
```

## 🎨 Diseño de las Páginas de Error

### Error Global

- Fondo: Gradiente gris claro
- Colores: Rojo para alertas (destructive)
- Estilo: Profesional y limpio

### Error Dashboard

- Fondo: Gradiente naranja claro
- Colores: Naranja corporativo
- Estilo: Consistente con el dashboard
- Incluye guía de ayuda

## 🔍 Testing de Errores

### Cypress Tests

Los tests de Cypress verifican que las páginas carguen sin errores:

```bash
npm run test:e2e
```

**Qué verifica:**

- ✅ No hay errores HTTP (404, 500, etc.)
- ✅ No hay errores de JavaScript en consola
- ✅ No se activan error boundaries
- ✅ El contenido se renderiza correctamente

### Probar manualmente los errores

Para probar las páginas de error en desarrollo:

**1. Error en componente:**

```tsx
function TestError() {
  throw new Error('Test error');
  return <div>Nunca se renderiza</div>;
}
```

**2. Error en página:**
Crea un archivo `src/app/test-error/page.tsx`:

```tsx
export default function TestErrorPage() {
  throw new Error('Test page error');
}
```

Luego visita: `http://localhost:3000/test-error`

## 📊 Logging de Errores

### Console Logging

Todos los errores se registran en la consola del navegador:

```typescript
console.error('Application Error:', error);
```

### Error Digest

Next.js genera un `digest` único para cada error que puede usarse para rastrear errores específicos.

## 🛠️ Mejores Prácticas

### 1. Usar Error Boundaries en componentes críticos

```tsx
<ErrorBoundary>
  <CriticalDataTable />
</ErrorBoundary>
```

### 2. Proporcionar fallbacks útiles

```tsx
<ErrorBoundary fallback={<EmptyState message="No se pudo cargar la tabla" />}>
  <DataTable />
</ErrorBoundary>
```

### 3. Logging personalizado

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Enviar a servicio de logging (ej: Sentry)
    logErrorToService(error, errorInfo);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### 4. Mensajes de error claros

```typescript
throw new Error('No se pudo cargar los empleados: La API no respondió');
// ❌ throw new Error('Error');
```

## 🔄 Flujo de Manejo de Errores

```
Error ocurre
    ↓
¿Está en un ErrorBoundary?
    ↓ Sí
ErrorBoundary captura → Muestra fallback
    ↓ No
¿Está en /dashboard?
    ↓ Sí
dashboard/error.tsx captura → Muestra error de dashboard
    ↓ No
error.tsx captura → Muestra error global
```

## 📱 Responsive Design

Todas las páginas de error son completamente responsive:

- ✅ Mobile (< 640px)
- ✅ Tablet (640px - 1024px)
- ✅ Desktop (> 1024px)

## 🚀 Próximas Mejoras

- [ ] Integración con servicio de logging (Sentry, LogRocket)
- [ ] Reportes automáticos de errores
- [ ] Dashboard de errores para administradores
- [ ] Categorización de errores por severidad
- [ ] Notificaciones en tiempo real de errores críticos

## 📞 Soporte

Si encuentras un error que no se maneja correctamente:

1. Copia el error completo
2. Toma un screenshot
3. Envía a: fspiritosi@codecontrol.com.ar, yjimenez@codecontrol.com.ar
4. Incluye:
   - URL donde ocurrió
   - Pasos para reproducir
   - Navegador y sistema operativo
