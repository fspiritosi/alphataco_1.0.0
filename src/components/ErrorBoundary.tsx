'use client';

import { AlertTriangle, Copy, Mail, RefreshCw } from 'lucide-react';
import { Component, ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
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
    const errorDetails = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
    `.trim();

    const subject = encodeURIComponent('Error en Componente - GH Gestión');
    const body = encodeURIComponent(errorDetails);
    // const recipients = 'fspiritosi@codecontrol.com.ar,yjimenez@codecontrol.com.ar';
    const recipients = 'fspiritosi@codecontrol.com.ar';
    window.location.href = `mailto:${recipients}?subject=${subject}&body=${body}`;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
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
                <Button onClick={this.sendErrorByEmail} variant="outline" size="sm" className="gap-2">
                  <Mail className="h-3 w-3" />
                  Enviar
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
