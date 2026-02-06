'use client';

import { Logger } from '@/lib/logger';
import { sendErrorReport } from '@/lib/utils/sendErrorReport';
import { AlertTriangle, Copy, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Component, ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

const logger = new Logger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  sending: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      sending: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error', { data: { message: error.message } });

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      sending: false,
    });
  };

  copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorDetails);
    toast.success('Error copiado al portapapeles');
  };

  sendErrorByEmail = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    this.setState({ sending: true });

    sendErrorReport({
      message: error.message,
      stack: error.stack,
      digest: undefined,
      componentStack: errorInfo?.componentStack ?? undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      source: 'Componente',
    })
      .then((result) => {
        if (result.success) {
          toast.success('Reporte enviado al equipo de desarrollo');
        } else {
          toast.error('No se pudo enviar el reporte', { description: result.error });
        }
      })
      .catch(() => {
        toast.error('Error al enviar el reporte');
      })
      .finally(() => {
        this.setState({ sending: false });
      });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { sending } = this.state;

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4" data-error-boundary>
          <Card className="w-full max-w-2xl border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Error en el componente</CardTitle>
              </div>
              <CardDescription>
                Este componente ha encontrado un error y no puede mostrarse correctamente.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm font-semibold text-destructive">Mensaje de error:</p>
                <p className="mt-1 text-sm text-muted-foreground">{this.state.error?.message}</p>
              </div>

              {this.state.errorInfo && (
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Detalles técnicos</summary>
                  <pre className="mt-2 max-h-40 overflow-auto text-xs text-muted-foreground">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.copyErrorToClipboard} variant="outline" size="sm" className="gap-2">
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
                <Button
                  onClick={this.sendErrorByEmail}
                  disabled={sending}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                  {sending ? 'Enviando...' : 'Reportar'}
                </Button>
              </div>
            </CardContent>

            <CardFooter>
              <Button onClick={this.handleReset} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Intentar nuevamente
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
