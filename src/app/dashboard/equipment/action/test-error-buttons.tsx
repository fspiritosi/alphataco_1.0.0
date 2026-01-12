'use client';

import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import { testServerError } from './test-actions';

export function TestErrorButtons() {
  const handleServerError = async () => {
    try {
      await testServerError();
      toast.success('Error generado desde servidor (revisa logs del servidor)');
    } catch (error) {
      toast.error('Error capturado: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const handleClientError = async () => {
    try {
      const supabase = supabaseBrowser();
      // Intentar consultar una columna que no existe
      const { data, error } = await supabase.from('employees').select('prueba').limit(1);

      if (error) {
        console.error('[Test Client Error]', error);
        toast.error('Error generado desde cliente: ' + error.message);
      } else {
        toast.success('Consulta exitosa (inesperado)');
      }
    } catch (error) {
      console.error('[Test Client Error Catch]', error);
      toast.error('Error capturado: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  return (
    <div className="mb-4 p-4 border-2 border-orange-500 rounded-lg bg-orange-50 dark:bg-orange-950">
      <p className="text-sm font-semibold mb-2 text-orange-800 dark:text-orange-200">
        🧪 Botones de Prueba - Generar Errores Supabase
      </p>
      <div className="flex gap-2">
        <Button onClick={handleServerError} variant="destructive" size="sm">
          Test Error Servidor
        </Button>
        <Button onClick={handleClientError} variant="destructive" size="sm">
          Test Error Cliente
        </Button>
      </div>
      <p className="text-xs mt-2 text-orange-700 dark:text-orange-300">
        Revisa la consola del servidor (terminal) y del navegador para ver los logs
      </p>
    </div>
  );
}
