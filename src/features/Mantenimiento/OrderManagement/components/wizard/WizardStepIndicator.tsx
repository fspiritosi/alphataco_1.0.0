'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WizardStep {
  number: number;
  label: string;
}

const STEPS: WizardStep[] = [
  { number: 1, label: 'Desvíos' },
  { number: 2, label: 'Sectores' },
  { number: 3, label: 'Orden' },
  { number: 4, label: 'Confirmar' },
];

interface WizardStepIndicatorProps {
  currentStep: number;
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        const isUpcoming = currentStep < step.number;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-all',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-primary/10 text-primary',
                  isUpcoming && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  isCurrent && 'text-primary',
                  isUpcoming && 'text-muted-foreground',
                  isCompleted && 'text-primary'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line */}
            {index < STEPS.length - 1 && (
              <div
                className={cn('flex-1 h-0.5 mx-2 mt-[-16px]', isCompleted ? 'bg-primary' : 'bg-muted-foreground/20')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
