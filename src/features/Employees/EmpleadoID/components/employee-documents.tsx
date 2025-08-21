'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Download, Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { getDocumentStatusColor } from '../lib/utils/employee-utils';
import { EmployeeDocumentUpload } from './employee-document-upload';
import { EmployeeDocumentsSkeleton } from './skeletons/employee-documents-skeleton';

interface EmployeeDocumentsProps {
  employeeId: string;
  isEditable?: boolean;
}

async function EmployeeDocumentsContent({ employeeId, isEditable = true }: EmployeeDocumentsProps) {
  const documents: any = [];
  const [showUpload, setShowUpload] = useState(false);

  const handleDownload = (documentUrl: string, documentName: string) => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'expired':
      case 'vencido':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isExpiringSoon = (expirationDate: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos del Empleado
        </CardTitle>
        {isEditable && (
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay documentos cargados</p>
            {isEditable && (
              <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Subir primer documento
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document: any) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(document.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{document.document_name}</h4>
                      {document.is_required && <Badge variant="secondary">Requerido</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{document.document_type?.name || 'Sin tipo'}</span>
                      {document.expiration_date && (
                        <span className={isExpiringSoon(document.expiration_date) ? 'text-orange-600' : ''}>
                          Vence: {format(new Date(document.expiration_date), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      )}
                      <span>Subido: {format(new Date(document.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getDocumentStatusColor(document.status)}>{document.status}</Badge>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(document.document_url)}
                      title="Ver documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document.document_url, document.document_name)}
                      title="Descargar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {isEditable && (
                      <Button variant="ghost" size="sm" title="Eliminar documento" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document Upload Modal */}
        {showUpload && (
          <EmployeeDocumentUpload
            employeeId={employeeId}
            onClose={() => setShowUpload(false)}
            onSuccess={() => {
              setShowUpload(false);
              // Refresh documents list
              window.location.reload();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function EmployeeDocuments(props: EmployeeDocumentsProps) {
  return (
    <Suspense fallback={<EmployeeDocumentsSkeleton />}>
      <EmployeeDocumentsContent {...props} />
    </Suspense>
  );
}
