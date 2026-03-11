export interface PipelineStep {
  id: string;
  stepNumber: number;
  label: string;
  description: string;
  iconName: string;
}

export type PipelineCounts = Record<string, number>;
