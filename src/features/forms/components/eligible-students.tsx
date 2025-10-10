'use client';

import { useState } from 'react';
import {
  getEligibleStudentsForPermanentLicense,
  getEligibleStudentsForLearnersLicense,
  markFormsAsPrinted,
} from '@/server/action/forms';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { Users, Calendar, CheckCircle2, Printer } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { bulkFillForm2 } from '@/features/forms/server/actions/bulk-form-2';
import { toast } from 'sonner';
import { printPdfFromBase64 } from '@/features/forms/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

type EligibleStudent =
  | Awaited<ReturnType<typeof getEligibleStudentsForPermanentLicense>>[0]
  | Awaited<ReturnType<typeof getEligibleStudentsForLearnersLicense>>[0];

interface EligibleStudentsClientProps {
  list: EligibleStudent[];
  type: 'll' | 'dl';
}

export function EligibleStudents({ list, type: inputType }: EligibleStudentsClientProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    () => new Set(list.map((s) => s.id))
  );
  const [skipPrinted, setSkipPrinted] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const router = useRouter();

  const handleSkipPrintedChange = (newSkipPrinted: boolean) => {
    setSkipPrinted(newSkipPrinted);
    // Re-select students based on new skipPrinted setting
    const selectableStudents = list.filter((student) => !newSkipPrinted || !student.isPrinted);
    setSelectedStudents(new Set(selectableStudents.map((s) => s.id)));
  };

  const handleSelectAll = () => {
    const selectableStudents = list.filter((student) => !skipPrinted || !student.isPrinted);
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
    return list.filter((student) => !skipPrinted || !student.isPrinted).length;
  };

  const [filter, setFilter] = useQueryState('filter', {
    shallow: false,
    defaultValue: 'all-eligible',
  });

  const [type, setType] = useQueryState('type', {
    shallow: false,
    defaultValue: inputType,
  });

  const handleBulkPrint = async () => {
    if (selectedStudents.size === 0) {
      toast.error('No students selected');
      return;
    }

    setIsPrinting(true);
    try {
      const clientIds = Array.from(selectedStudents);
      const result = await bulkFillForm2(clientIds);

      if (result.success && result.pdfData) {
        printPdfFromBase64(result.pdfData);

        // Mark forms as printed in the database
        await markFormsAsPrinted(clientIds, 'form-2');

        toast.success(`Successfully printed Form 2 for ${result.count} student(s)`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to generate PDFs');
      }
    } catch (error) {
      console.error('Bulk print error:', error);
      toast.error('An error occurred while printing');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex">
        <Tabs
          value={type}
          onValueChange={(value) => setType(value as 'll' | 'dl')}
          className="w-full "
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ll">Learning Licence (LL)</TabsTrigger>
            <TabsTrigger value="dl">Driving Licence (DL)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {type === 'll'
              ? "Students for Learner's Licence Application"
              : 'Eligible Students for Driver Licence Application'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* License Type Toggle */}

          {/* Filters and Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new-only">New</SelectItem>
                  <SelectItem value="all-eligible">All Eligible</SelectItem>
                  <SelectItem value="recently-printed">Recently Printed</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skip-printed"
                  checked={skipPrinted}
                  onCheckedChange={(checked) => handleSkipPrintedChange(!!checked)}
                />
                <label htmlFor="skip-printed" className="text-sm">
                  Skip Printed
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={getSelectableCount() === 0}
              >
                Select All ({getSelectableCount()})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={selectedStudents.size === 0}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          {/* Students List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {list.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found for the selected filter
              </div>
            ) : (
              list.map((student) => {
                const isSelectable = !skipPrinted || !student.isPrinted;
                const isSelected = selectedStudents.has(student.id);

                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      student.isPrinted ? 'bg-muted/50' : 'bg-background'
                    } ${!isSelectable ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleStudentToggle(student.id, !!checked)}
                        disabled={!isSelectable}
                      />
                      <div>
                        <div className="font-medium">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {student.clientCode} • {student.phoneNumber}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {student.daysSinceLearningLicense} days
                      </Badge>

                      {student.isPrinted ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Printed {student.daysSincePrint}d ago
                        </Badge>
                      ) : (
                        <Badge className="flex items-center gap-1">🆕 New</Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Student count display and bulk actions */}
          {selectedStudents.size > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
              </div>
              <Button
                onClick={handleBulkPrint}
                disabled={isPrinting}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? 'Printing...' : 'Bulk Print Form 2'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
