'use client';

import { sendEmail } from '@/app/actions/sendEmail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Logger } from '@/lib/logger';
import { useState } from 'react';

const logger = new Logger('SmtpTest');

export function SmtpTest() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    setResult(null);
    logger.info('Enviando email de prueba', { data: { email } });

    try {
      const res = await sendEmail({
        to: email,
        subject: 'Test SMTP - CodeControl',
        userEmail: email,
        html: '<h2>Test SMTP</h2><p>Si ves este email, la configuracion SMTP funciona correctamente.</p>',
      });

      logger.info('Resultado envio', { data: { res } });

      if (res.success) {
        setResult(`OK - messageId: ${res.messageId}`);
      } else {
        setResult(`ERROR: ${res.error}`);
      }
    } catch (err) {
      logger.error('Error enviando email', { data: { err } });
      setResult(`CATCH ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-yellow-500">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-600">SMTP Test (temporal)</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Input
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={handleSend} disabled={loading || !email} variant="outline">
          {loading ? 'Enviando...' : 'Enviar test'}
        </Button>
        {result && <p className="self-center text-sm">{result}</p>}
      </CardContent>
    </Card>
  );
}
