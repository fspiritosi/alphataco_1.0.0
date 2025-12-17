# Configuración de PostHog con Next.js y Supabase

Esta documentación describe la configuración de PostHog según las mejores prácticas oficiales para Next.js y Supabase.

## Variables de Entorno

### Cliente (Browser)

Agrega estas variables a tu archivo `.env.local`:

```env
# PostHog - Cliente (debe tener prefijo NEXT_PUBLIC_)
NEXT_PUBLIC_POSTHOG_KEY=tu_clave_de_proyecto_posthog
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Servidor (Node.js)

Agrega estas variables a tu archivo `.env.local`:

```env
# PostHog - Servidor (NO debe tener prefijo NEXT_PUBLIC_)
POSTHOG_KEY=tu_clave_de_proyecto_posthog
POSTHOG_HOST=https://us.i.posthog.com
```

**Nota:** Aunque ambas usan la misma clave, es importante tenerlas separadas:

- `NEXT_PUBLIC_POSTHOG_KEY` se expone al cliente (necesario para el navegador)
- `POSTHOG_KEY` solo está disponible en el servidor (más seguro)

## Uso en el Cliente

### En componentes del cliente

```typescript
'use client';

import { usePostHog } from '@/hooks/usePostHog';

export function MyComponent() {
  const posthog = usePostHog();

  const handleClick = () => {
    posthog?.trackEvent('button_clicked', {
      button: 'submit',
      page: 'dashboard',
    });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Rastrear vistas de página

```typescript
import { usePostHog } from '@/hooks/usePostHog';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function PageTracker() {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname) {
      posthog?.trackPageView(pathname);
    }
  }, [pathname, posthog]);

  return null;
}
```

## Uso en el Servidor

### En API Routes

```typescript
import { getPostHogServer } from '@/lib/posthog';

export async function POST(request: Request) {
  const posthog = getPostHogServer();

  if (posthog) {
    posthog.capture({
      distinctId: 'user_id',
      event: 'api_endpoint_called',
      properties: {
        endpoint: '/api/example',
        method: 'POST',
      },
    });

    // Importante: hacer flush antes de que termine la función
    await posthog.shutdown();
  }

  return Response.json({ success: true });
}
```

### En Server Actions

```typescript
'use server';

import { captureServerEvent } from '@/lib/posthog';

export async function myServerAction(userId: string) {
  // Tu lógica aquí

  // Capturar evento
  await captureServerEvent(userId, 'server_action_executed', {
    action: 'myServerAction',
  });

  return { success: true };
}
```

## Identificación de Usuarios

La identificación de usuarios se maneja automáticamente en `PostHogProvider` cuando:

- Un usuario inicia sesión (`SIGNED_IN`) → Se identifica con `user.id`
- Un usuario cierra sesión (`SIGNED_OUT`) → Se resetea la sesión

No necesitas hacer nada adicional, el provider se encarga de esto automáticamente.

## Configuración del Proxy

El proxy ya está configurado en `next.config.js` para evitar bloqueadores de anuncios:

```javascript
async rewrites() {
  return [
    {
      source: '/ingest/static/:path*',
      destination: 'https://us-assets.i.posthog.com/static/:path*'
    },
    {
      source: '/ingest/:path*',
      destination: 'https://us.i.posthog.com/:path*'
    }
  ]
}
```

Esto permite que PostHog funcione incluso con bloqueadores de anuncios activos.

## Recursos

- [Documentación oficial de PostHog para Next.js](https://posthog.com/docs/libraries/next-js)
- [Tutorial: Next.js + Supabase Signup Funnel](https://posthog.com/tutorials/nextjs-supabase-signup-funnel)
- [Tutorial: Supabase Query en PostHog](https://posthog.com/tutorials/supabase-query)
