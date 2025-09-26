'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Calendar, CheckCircle2 } from 'lucide-react';
import type { FilterType } from '@/server/db/forms';

type EligibleStudent = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  clientCode: string;
  learningLicenseIssueDate?: string | null;
  learningLicenseClass?: string[] | null;
  daysSinceLearningLicense: number;
  printedAt?: Date | null;
  printedBy?: string | null;
  isPrinted: boolean;
  daysSincePrint: number | null;
};

type Stats = {
  totalEligible: number;
  newEligible: number;
  recentlyPrinted: number;
  alreadyPrinted: number;
};

interface EligibleStudentsSectionProps {
  formType: 'form-2' | 'form-4';
  students: EligibleStudent[];
  stats: Stats | null;
  selectedStudents: Set<string>;
  filter: FilterType;
  skipPrinted: boolean;
  loading: boolean;
  onFilterChange: (filter: FilterType) => void;
  onSkipPrintedChange: (skipPrinted: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStudentToggle: (studentId: string, checked: boolean) => void;
  getSelectableCount: () => number;
}

export function EligibleStudentsSection({
  formType,
  students,
  stats,
  selectedStudents,
  filter,
  skipPrinted,
  loading,
  onFilterChange,
  onSkipPrintedChange,
  onSelectAll,
  onClearSelection,
  onStudentToggle,
  getSelectableCount,
}: EligibleStudentsSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {formType === 'form-2'
              ? "Students for Learner's License Application (Form 2)"
              : 'Eligible Students for Permanent License'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading eligible students...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {formType === 'form-2'
            ? "Students for Learner's License Application (Form 2)"
            : 'Eligible Students for Permanent License'}
        </CardTitle>
        {stats && (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {stats.totalEligible} eligible
            </Badge>
            <Badge variant="default" className="flex items-center gap-1">
              🆕 {stats.newEligible} new
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats.alreadyPrinted} printed
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={onFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new-only">🆕 New Only</SelectItem>
                <SelectItem value="all-eligible">📋 All Eligible</SelectItem>
                <SelectItem value="recently-printed">🕒 Recently Printed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-printed"
                checked={skipPrinted}
                onCheckedChange={(checked) => onSkipPrintedChange(!!checked)}
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
              onClick={onSelectAll}
              disabled={getSelectableCount() === 0}
            >
              Select All ({getSelectableCount()})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={selectedStudents.size === 0}
            >
              Clear Selection
            </Button>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found for the selected filter
            </div>
          ) : (
            students.map((student) => {
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
                      onCheckedChange={(checked) => onStudentToggle(student.id, !!checked)}
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

        {/* Student count display */}
        {selectedStudents.size > 0 && (
          <div className="flex items-center justify-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
