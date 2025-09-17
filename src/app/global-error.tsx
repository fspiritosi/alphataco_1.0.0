'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, MessageCircle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log del error para debugging
    console.error('Error global capturado:', error);
  }, [error]);

  const handleReportError = () => {
    try {
      // Crear información básica del error (limitada para evitar URLs muy largas)
      const errorMessage = error.message || 'Error crítico desconocido';
      const errorDigest = error.digest || 'N/A';
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'N/A';
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

      const subject = encodeURIComponent('Error Crítico - GH Gestión');
      const body = encodeURIComponent(`Hola equipo de soporte,

Se ha producido un error crítico en la aplicación GH Gestión.

DETALLES DEL ERROR CRÍTICO:
- Mensaje: ${errorMessage}
- ID del Error: ${errorDigest}
- Ubicación: ${stackInfo}
- Página: ${currentUrl}
- Fecha y Hora: ${timestamp}

Este es un error de alta prioridad que requiere atención inmediata.

Gracias.`);

      // Intentar abrir el cliente de email
      const mailtoUrl = `mailto:fspiritosi@multipla.com.ar?subject=${subject}&body=${body}`;

      if (typeof window !== 'undefined') {
        // Verificar si la URL no es demasiado larga
        if (mailtoUrl.length > 2000) {
          // Si es muy larga, usar una versión simplificada
          const simpleBody = encodeURIComponent(`Hola equipo de soporte,

Error crítico en GH Gestión.

Error: ${errorMessage}
ID: ${errorDigest}
Fecha: ${timestamp}

Requiere atención inmediata.`);

          window.location.href = `mailto:fspiritosi@multipla.com.ar?subject=${subject}&body=${simpleBody}`;
        } else {
          window.location.href = mailtoUrl;
        }
      }
    } catch (err) {
      // Si falla todo, mostrar alerta con información de contacto
      if (typeof window !== 'undefined') {
        alert(`No se pudo abrir el cliente de email automáticamente.
        
Por favor, envía un email manualmente a:
fspiritosi@multipla.com.ar

Asunto: Error Crítico - GH Gestión
Mensaje: Error crítico en la aplicación - ${error.message || 'Error desconocido'}`);
      }
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-20 h-20 bg-red-200 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-700" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-900">Error Crítico</CardTitle>
              <CardDescription className="text-red-700 mt-2">
                Ha ocurrido un error crítico en la aplicación que impide su funcionamiento normal. Por favor, reporta
                este problema para que podamos solucionarlo rápidamente.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Información del error (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800 mb-1">Información del error crítico:</p>
                  <p className="text-xs text-red-700 font-mono break-all">{error.message}</p>
                  {error.digest && <p className="text-xs text-red-600 mt-1">ID: {error.digest}</p>}
                  {error.stack && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-800 mb-1">Ubicación del error:</p>
                      <div className="text-xs text-red-700 font-mono bg-white p-2 rounded border max-h-40 overflow-y-auto">
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
                <Button onClick={reset} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reiniciar aplicación
                </Button>

                <Button
                  onClick={handleReportError}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Reportar error crítico
                </Button>

                <Button
                  onClick={handleGoHome}
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir al inicio
                </Button>
              </div>

              {/* Información de contacto de emergencia */}
              <div className="text-center pt-4 border-t border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Soporte de emergencia:</p>
                <p className="text-xs text-red-700">fspiritosi@multipla.com.ar</p>
                <p className="text-xs text-red-600 mt-2">Error ID: {error.digest || 'No disponible'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
