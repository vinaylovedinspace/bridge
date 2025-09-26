'use client';

import React from 'react';
import { useQueryState } from 'nuqs';

interface FormsPageClientProps {
  initialFormType?: 'form-2' | 'form-4';
  eligibleStudentsSlot?: React.ReactNode;
}

export function FormsPageClient({
  initialFormType = 'form-2',
  eligibleStudentsSlot,
}: FormsPageClientProps) {
  const [formType] = useQueryState('formType', {
    defaultValue: initialFormType,
    parse: (value: string) => value as 'form-2' | 'form-4',
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Eligible Students</h1>
          <p className="text-muted-foreground text-sm">
            Students who need{' '}
            {formType === 'form-2' ? "learner's license applications" : 'driving license forms'}
          </p>
        </div>

        {/* Student List */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Student List</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {formType === 'form-2'
              ? "Students eligible for Form 2 (Learner's License Application)"
              : 'Students eligible for driving license forms'}
          </p>
          {eligibleStudentsSlot}
        </div>
      </div>
    </div>
  );
}
