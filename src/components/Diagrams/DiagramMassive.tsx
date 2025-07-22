'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { DiagramMassiveForm } from './DiagramMassiveForm';
import { DiagramMassiveResults } from './DiagramMassiveResults';

// Tipos para los datos del formulario
interface MassiveFormData {
  employeeIds: string[];
  diagramTypeId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

// Tipos para conflictos
interface ConflictRecord {
  employee_id: string;
  employee_name: string;
  day: number;
  month: number;
  year: number;
  date_formatted: string;
  current_diagram_type: string;
  current_diagram_name: string;
  current_diagram_color: string;
  is_used_in_operations: boolean;
  operation_details: string;
  can_update: boolean;
  conflict_type: string;
}

interface ConflictData {
  operationConflicts: ConflictRecord[];
  simpleConflicts: ConflictRecord[];
}

// Tipos para resultados
interface ProcessingResult {
  success: boolean;
  summary: {
    total_created: number;
    total_updated: number;
    total_errors: number;
    total_processed: number;
  };
  details: {
    created_records: any[];
    updated_records: any[];
    error_records: any[];
  };
  processing_time: number;
}

function DiagramMassive() {
  const [currentStep, setCurrentStep] = useState<'form' | 'conflicts' | 'results'>('form');
  const [formData, setFormData] = useState<MassiveFormData | null>(null);
  const [conflicts, setConflicts] = useState<ConflictData | null>(null);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = (data: MassiveFormData) => {
    setFormData(data);
    // La verificación de conflictos se manejará en DiagramMassiveForm
  };

  const handleConflictsFound = (conflictData: ConflictData, data: MassiveFormData) => {
    setFormData(data); // Guardar los datos del formulario
    setConflicts(conflictData);
    setCurrentStep('conflicts');
  };

  const handleNoConflicts = () => {
    // Proceder directamente a la creación
    setCurrentStep('results');
  };

  const handleConflictResolution = () => {
    setCurrentStep('results');
  };

  const handleProcessingComplete = (result: ProcessingResult) => {
    setResults(result);
    setCurrentStep('results');
  };

  const handleStartOver = () => {
    setCurrentStep('form');
    setFormData(null);
    setConflicts(null);
    setResults(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Carga Masiva de Diagramas</CardTitle>
          <div className="text-sm text-muted-foreground">
            Genera diagramas automáticamente para múltiples empleados según sus patrones de trabajo
          </div>
        </CardHeader>
        <CardContent>
          {/* Indicador de pasos */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 ${
                  currentStep === 'form'
                    ? 'text-blue-600 font-semibold'
                    : currentStep === 'conflicts' || currentStep === 'results'
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'form'
                      ? 'bg-blue-100 text-blue-600'
                      : currentStep === 'conflicts' || currentStep === 'results'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  1
                </div>
                <span>Formulario</span>
              </div>

              <div className="w-8 h-px bg-gray-300" />

              <div
                className={`flex items-center space-x-2 ${
                  currentStep === 'conflicts'
                    ? 'text-blue-600 font-semibold'
                    : currentStep === 'results'
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'conflicts'
                      ? 'bg-blue-100 text-blue-600'
                      : currentStep === 'results'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  2
                </div>
                <span>Verificación</span>
              </div>

              <div className="w-8 h-px bg-gray-300" />

              <div
                className={`flex items-center space-x-2 ${
                  currentStep === 'results' ? 'text-blue-600 font-semibold' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'results' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  3
                </div>
                <span>Resultados</span>
              </div>
            </div>
          </div>

          {/* Contenido según el paso actual */}
          {currentStep === 'form' && (
            <DiagramMassiveForm
              onSubmit={handleFormSubmit}
              onConflictsFound={handleConflictsFound}
              onNoConflicts={handleNoConflicts}
              onProcessingComplete={handleProcessingComplete}
              loading={loading}
              setLoading={setLoading}
            />
          )}

          {currentStep === 'conflicts' && conflicts && (
            <ConflictResolutionModal
              conflicts={conflicts}
              formData={formData!}
              onResolve={handleConflictResolution}
              onCancel={handleStartOver}
              onProcessingComplete={handleProcessingComplete}
            />
          )}

          {currentStep === 'results' && results && (
            <DiagramMassiveResults results={results} onStartOver={handleStartOver} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DiagramMassive;
