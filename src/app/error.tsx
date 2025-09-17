'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, MessageCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log del error para debugging
    console.error('Error capturado:', error);
  }, [error]);

  const handleReportError = () => {
    try {
      // Crear información básica del error (limitada para evitar URLs muy largas)
      const errorMessage = error.message || 'Error desconocido';
      const errorDigest = error.digest || 'N/A';
      const currentUrl = window.location.href;
      const timestamp = new Date().toLocaleString('es-ES');

      // Extraer información del stack trace (primeras 2-3 líneas más relevantes)
      let stackInfo = 'N/A';
      if (error.stack) {
        const stackLines = error.stack.split('\n');
        // Tomar las primeras líneas que contengan información útil (archivo, función, línea)
        const relevantLines = stackLines
          .slice(0, 4)
          .filter((line) => line.includes('.tsx') || line.includes('.ts') || line.includes('.js'))
          .slice(0, 2);

        if (relevantLines.length > 0) {
          stackInfo = relevantLines.map((line) => line.trim().replace(/^\s*at\s+/, '')).join(' | ');
        }
      }

      const subject = encodeURIComponent('Reporte de Error - GH Gestión');
      const body = encodeURIComponent(`Hola equipo de soporte,

He encontrado un error en la aplicación GH Gestión.

DETALLES DEL ERROR:
- Mensaje: ${errorMessage}
- ID del Error: ${errorDigest}
- Ubicación: ${stackInfo}
- Página: ${currentUrl}
- Fecha y Hora: ${timestamp}

Por favor, ayúdenme a resolver este problema.

Gracias.`);

      // Intentar abrir el cliente de email
      const mailtoUrl = `mailto:fspiritosi@multipla.com.ar?subject=${subject}&body=${body}`;

      // Verificar si la URL no es demasiado larga (límite aproximado de 2000 caracteres)
      if (mailtoUrl.length > 2000) {
        // Si es muy larga, usar una versión simplificada
        const simpleBody = encodeURIComponent(`Hola equipo de soporte,

Se ha producido un error en GH Gestión.

Error: ${errorMessage}
ID: ${errorDigest}
Fecha: ${timestamp}

Por favor contactar para más detalles.`);

        window.location.href = `mailto:fspiritosi@multipla.com.ar?subject=${subject}&body=${simpleBody}`;
      } else {
        window.location.href = mailtoUrl;
      }
    } catch (err) {
      // Si falla todo, mostrar alerta con información de contacto
      alert(`No se pudo abrir el cliente de email automáticamente.
      
Por favor, envía un email manualmente a:
fspiritosi@multipla.com.ar

Asunto: Reporte de Error - GH Gestión
Mensaje: Error en la aplicación - ${error.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">¡Oops! Algo salió mal</CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Ha ocurrido un error inesperado en la aplicación. No te preocupes, nuestro equipo ha sido notificado
            automáticamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Información del error (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 p-3 rounded-lg border">
              <p className="text-sm font-medium text-gray-700 mb-1">Información del error:</p>
              <p className="text-xs text-gray-600 font-mono break-all">{error.message}</p>
              {error.digest && <p className="text-xs text-gray-500 mt-1">ID: {error.digest}</p>}
              {error.stack && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">Ubicación del error:</p>
                  <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border max-h-40 overflow-y-auto">
                    {error.stack
                      .split('\n')
                      .slice(0, 3)
                      .map((line, index) => (
                        <div key={index} className="break-all">
                          {line.trim()}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3">
            <Button onClick={reset} className="w-full bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>

            <Button
              onClick={handleReportError}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Reportar problema
            </Button>

            <Link href="/dashboard" className="block">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-800">
                <Home className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>

          {/* Información de contacto */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">¿Necesitas ayuda inmediata?</p>
            <p className="text-xs text-gray-600 font-medium">Contacta a soporte: fspiritosi@multipla.com.ar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
