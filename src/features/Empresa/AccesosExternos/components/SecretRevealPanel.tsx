'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logger } from '@/lib/logger';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const logger = new Logger('AccesosExternos/SecretRevealPanel');

interface SecretRevealPanelProps {
  clientId: string;
  secret: string;
  /** Avisa cuando la clave ya fue copiada, para poder permitir el cierre */
  onSecretCopied: () => void;
}

/**
 * Muestra las credenciales recien generadas.
 *
 * Es la unica vez que la clave existe fuera de la base, asi que el panel esta
 * armado para que sea dificil perderla: la advertencia es un Alert fijo (no un
 * toast que se va solo) y el cierre lo controla el componente padre.
 *
 * Se reutiliza tal cual al rotar una clave.
 */
export function SecretRevealPanel({ clientId, secret, onSecretCopied }: SecretRevealPanelProps) {
  const [copiedField, setCopiedField] = useState<'clientId' | 'secret' | null>(null);

  const handleCopy = async (value: string, field: 'clientId' | 'secret') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === 'secret' ? 'Clave copiada al portapapeles' : 'Usuario copiado al portapapeles');
      if (field === 'secret') onSecretCopied();
    } catch (error) {
      logger.error('No se pudo copiar al portapapeles', { data: { error, field } });
      toast.error('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Copiá la clave ahora</AlertTitle>
        <AlertDescription>
          Por seguridad no la vamos a mostrar de nuevo. Si la perdés, vas a tener que generar una nueva. No la compartas
          por mail ni por chat.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="external-access-client-id">Usuario</Label>
        <div className="flex gap-2">
          <Input id="external-access-client-id" readOnly value={clientId} className="font-mono text-sm" />
          <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(clientId, 'clientId')}>
            {copiedField === 'clientId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copiar usuario</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="external-access-secret">Clave</Label>
        <div className="flex gap-2">
          <Input id="external-access-secret" readOnly value={secret} className="font-mono text-sm" />
          <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(secret, 'secret')}>
            {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copiar clave</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          El sistema externo usa estos dos datos como usuario y contraseña para consultar la API.
        </p>
      </div>
    </div>
  );
}
