'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  getEligibleStudentsForPermanentLicense,
  getEligibleStudentsForLearnersLicense,
  getFormPrintStats,
} from '@/server/actions/forms';
import type { FilterType } from '@/server/db/forms';
import { toast } from 'sonner';
import { EligibleStudentsSection } from './eligible-students-section';
import { useRouter } from 'next/navigation';

type EligibleStudent =
  | Awaited<ReturnType<typeof getEligibleStudentsForPermanentLicense>>[0]
  | Awaited<ReturnType<typeof getEligibleStudentsForLearnersLicense>>[0];

type Stats = Awaited<ReturnType<typeof getFormPrintStats>>;

interface EligibleStudentsClientProps {
  formType: 'form-2' | 'form-4';
  initialStudents: EligibleStudent[];
  initialStats: Stats;
  initialFilter: FilterType;
}

export function EligibleStudentsClient({
  formType,
  initialStudents,
  initialStats,
  initialFilter,
}: EligibleStudentsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [students, setStudents] = useState<EligibleStudent[]>(initialStudents);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [skipPrinted, setSkipPrinted] = useState(true);
  const [loading, setLoading] = useState(false);

  // Auto-select students on initial load
  useEffect(() => {
    const selectableStudents = initialStudents.filter(
      (student) => !skipPrinted || !student.isPrinted
    );
    setSelectedStudents(new Set(selectableStudents.map((s) => s.id)));
  }, [initialStudents, skipPrinted]);

  const loadData = useCallback(
    async (newFilter: FilterType) => {
      setLoading(true);
      try {
        const getStudentsFunction =
          formType === 'form-2'
            ? getEligibleStudentsForLearnersLicense
            : getEligibleStudentsForPermanentLicense;

        const [studentsData, statsData] = await Promise.all([
          getStudentsFunction(newFilter),
          getFormPrintStats(formType),
        ]);
        setStudents(studentsData);
        setStats(statsData);

        // Auto-select all selectable students (respecting skipPrinted setting)
        const selectableStudents = studentsData.filter(
          (student) => !skipPrinted || !student.isPrinted
        );
        setSelectedStudents(new Set(selectableStudents.map((s) => s.id)));
      } catch (error) {
        toast.error('Failed to load eligible students');
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [formType, skipPrinted]
  );

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    startTransition(() => {
      // Update URL params to trigger server component re-render
      const url = new URL(window.location.href);
      url.searchParams.set('filter', newFilter);
      router.replace(url.toString());
    });
    loadData(newFilter);
  };

  const handleSkipPrintedChange = (newSkipPrinted: boolean) => {
    setSkipPrinted(newSkipPrinted);
    // Re-select students based on new skipPrinted setting
    const selectableStudents = students.filter((student) => !newSkipPrinted || !student.isPrinted);
    setSelectedStudents(new Set(selectableStudents.map((s) => s.id)));
  };

  const handleSelectAll = () => {
    const selectableStudents = students.filter((student) => !skipPrinted || !student.isPrinted);
    setSelectedStudents(new Set(selectableStudents.map((s) => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedStudents(new Set());
  };

  const handleStudentToggle = (studentId: string, checked: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (checked) {
      newSelection.add(studentId);
    } else {
      newSelection.delete(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const getSelectableCount = () => {
    return students.filter((student) => !skipPrinted || !student.isPrinted).length;
  };

  return (
    <EligibleStudentsSection
      formType={formType}
      students={students}
      stats={stats}
      selectedStudents={selectedStudents}
      filter={filter}
      skipPrinted={skipPrinted}
      loading={loading || isPending}
      onFilterChange={handleFilterChange}
      onSkipPrintedChange={handleSkipPrintedChange}
      onSelectAll={handleSelectAll}
      onClearSelection={handleClearSelection}
      onStudentToggle={handleStudentToggle}
      getSelectableCount={getSelectableCount}
    />
  );
}
