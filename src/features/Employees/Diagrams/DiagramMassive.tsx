'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { DiagramMassiveForm } from './DiagramMassiveForm';
import { DiagramMassiveResults, ProcessingResult } from './DiagramMassiveResults';
import { StepIndicator } from './components/StepIndicator';
import type { ConflictData, MassiveFormData } from './types/massive-diagram';

function DiagramMassive() {
  const [currentStep, setCurrentStep] = useState<'form' | 'conflicts' | 'results'>('form');
  const [formData, setFormData] = useState<MassiveFormData | null>(null);
  const [conflicts, setConflicts] = useState<ConflictData | null>(null);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConflictsFound = (conflictData: ConflictData, data: MassiveFormData) => {
    setFormData(data);
    setConflicts(conflictData);
    setCurrentStep('conflicts');
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
          <CardTitle>Carga Masiva</CardTitle>
          <div className="text-sm text-muted-foreground">
            Asigna un patrón de diagrama cíclico o una novedad puntual a múltiples empleados en un rango de fechas.
          </div>
        </CardHeader>
        <CardContent>
          <StepIndicator currentStep={currentStep} />

          {currentStep === 'form' && (
            <DiagramMassiveForm
              onConflictsFound={handleConflictsFound}
              onProcessingComplete={handleProcessingComplete}
              loading={loading}
              setLoading={setLoading}
            />
          )}

          {currentStep === 'conflicts' && conflicts && formData && (
            <ConflictResolutionModal
              conflicts={conflicts}
              formData={formData}
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
