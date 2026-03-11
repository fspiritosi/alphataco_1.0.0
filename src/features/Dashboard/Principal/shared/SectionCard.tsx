import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as React from 'react';

const ACCENT_CLASSES = {
  'chart-1': 'border-l-[color:var(--chart-1)]',
  'chart-2': 'border-l-[color:var(--chart-2)]',
  'chart-5': 'border-l-[color:var(--chart-5)]',
} as const;

interface SectionCardProps {
  title: string;
  description: string;
  accentColor: keyof typeof ACCENT_CLASSES;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, description, accentColor, headerRight, children, className }: SectionCardProps) {
  return (
    <Card className={cn('border-l-4 py-0', ACCENT_CLASSES[accentColor], className)}>
      <CardHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {headerRight}
        </div>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}
