interface Step {
  label: string;
  value: string;
}

const STEPS: Step[] = [
  { label: 'Formulario', value: 'form' },
  { label: 'Verificación', value: 'conflicts' },
  { label: 'Resultados', value: 'results' },
];

interface Props {
  currentStep: 'form' | 'conflicts' | 'results';
}

export function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.value === currentStep);

  return (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const colorClass = isActive
            ? 'text-blue-600 font-semibold'
            : isCompleted
              ? 'text-green-600'
              : 'text-gray-400';
          const bgClass = isActive
            ? 'bg-blue-100 text-blue-600'
            : isCompleted
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-400';

          return (
            <div key={step.value} className="flex items-center space-x-4">
              {index > 0 && <div className="w-8 h-px bg-gray-300" />}
              <div className={`flex items-center space-x-2 ${colorClass}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass}`}>{index + 1}</div>
                <span>{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
